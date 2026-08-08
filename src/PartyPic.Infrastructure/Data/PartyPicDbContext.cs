using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using PartyPic.Core.Missions;

namespace PartyPic.Infrastructure.Data;

/// <summary>Das Datenmodell. Tabellen- und Spaltennamen bleiben in snake_case und
/// entsprechen der NestJS-Version, damit eine bestehende Datenbank uebernommen werden kann.
/// Alles, was nur Postgres kann (<c>gen_random_uuid()</c>, <c>jsonb</c>), ist bewusst
/// vermieden: dieselben Migrationen laufen so auch auf SQLite, worauf die Tests aufsetzen.</summary>
public sealed class PartyPicDbContext(DbContextOptions<PartyPicDbContext> options) : DbContext(options)
{
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<PartySessionEntity> Sessions => Set<PartySessionEntity>();
    public DbSet<SessionUserEntity> SessionUsers => Set<SessionUserEntity>();
    public DbSet<PictureEntity> Pictures => Set<PictureEntity>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<UserEntity>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            e.Property(x => x.PasswordHash).HasColumnName("password").HasMaxLength(255).IsRequired();
            e.HasIndex(x => x.Email).IsUnique().HasDatabaseName("unique_email");
        });

        b.Entity<PartySessionEntity>(e =>
        {
            e.ToTable("sessions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.EndsAt).HasColumnName("ends_at");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            e.Property(x => x.Missions)
                .HasColumnName("missions")
                .HasConversion(MissionsConverter, MissionsComparer)
                .IsRequired();

            e.HasOne(x => x.User)
                .WithMany(x => x.Sessions)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Der Index fehlte im Original, obwohl jedes Anlegen einer Session zuerst
            // "hat dieser Host schon eine?" fragt.
            e.HasIndex(x => x.UserId).HasDatabaseName("idx_sessions_user_id");
            e.HasIndex(x => x.EndsAt).HasDatabaseName("idx_sessions_ends_at");
        });

        b.Entity<SessionUserEntity>(e =>
        {
            e.ToTable("session_users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserName).HasColumnName("user_name").HasMaxLength(50).IsRequired();
            e.Property(x => x.SessionId).HasColumnName("session_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.LastSeen).HasColumnName("last_seen");

            e.HasOne(x => x.Session)
                .WithMany(x => x.Guests)
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Ein Name pro Party ist eindeutig: sonst weiss in der Galerie niemand,
            // welche "Anna" das Foto gemacht hat.
            e.HasIndex(x => new { x.SessionId, x.UserName }).IsUnique().HasDatabaseName("unique_session_user_name");
            e.HasIndex(x => x.LastSeen).HasDatabaseName("idx_session_users_last_seen");
        });

        b.Entity<PictureEntity>(e =>
        {
            e.ToTable("pictures");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UserName).HasColumnName("u_name").HasMaxLength(255).IsRequired();
            e.Property(x => x.MissionId).HasColumnName("mission_id").HasMaxLength(255);
            e.Property(x => x.SessionId).HasColumnName("session_id");
            e.Property(x => x.OriginalFilename).HasColumnName("original_filename").HasMaxLength(255).IsRequired();
            e.Property(x => x.ObjectKey).HasColumnName("s3_key").HasMaxLength(255).IsRequired();
            e.Property(x => x.BucketName).HasColumnName("s3_bucket").HasMaxLength(100).IsRequired();
            e.Property(x => x.ContentType).HasColumnName("mimetype").HasMaxLength(100).IsRequired();
            e.Property(x => x.FileSizeBytes).HasColumnName("filesize_bytes");
            e.Property(x => x.UploadedBySessionUserId).HasColumnName("uploaded_by");

            e.HasIndex(x => x.ObjectKey).IsUnique().HasDatabaseName("unique_s3_key");
            // Die Galerie sortiert immer nach Zeit absteigend — der zusammengesetzte Index
            // bedient Filter und Sortierung in einem.
            e.HasIndex(x => new { x.SessionId, x.CreatedAt }).HasDatabaseName("idx_pictures_session_created");

            // Anders als im Original mit echtem Fremdschluessel: verwaiste Bildzeilen ohne
            // Session waren nicht aufraeumbar und tauchten in keiner Galerie je wieder auf.
            e.HasOne(x => x.Session)
                .WithMany()
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    /// <summary>Missionen liegen als JSON-Text in einer normalen Textspalte — nicht als
    /// <c>jsonb</c>, damit das Modell providerneutral bleibt.</summary>
    private static readonly ValueConverter<List<Mission>, string> MissionsConverter = new(
        v => JsonSerializer.Serialize(v, JsonOptions),
        v => JsonSerializer.Deserialize<List<Mission>>(v, JsonOptions) ?? new List<Mission>());

    /// <summary>Ohne eigenen Comparer haelt EF die Liste fuer unveraendert, sobald nur ihr
    /// Inhalt mutiert wurde — ein geaenderter Missionskatalog wuerde still nicht gespeichert.</summary>
    private static readonly ValueComparer<List<Mission>> MissionsComparer = new(
        (a, c) => (a ?? new List<Mission>()).SequenceEqual(c ?? new List<Mission>()),
        v => v.Aggregate(0, (acc, m) => HashCode.Combine(acc, m.GetHashCode())),
        v => v.ToList());

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
