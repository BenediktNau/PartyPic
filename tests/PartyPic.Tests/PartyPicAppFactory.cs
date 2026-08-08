using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Time.Testing;
using PartyPic.Core.Abstractions;
using PartyPic.Infrastructure.Data;
using PartyPic.Tests.Fakes;

namespace PartyPic.Tests;

/// <summary>Startet den echten Host — dieselben Endpoints, dieselbe Authentifizierung,
/// dieselbe Autorisierung — nur mit SQLite statt Postgres und einem Fake-Storage.
/// Getestet wird damit das zusammengesetzte System und nicht eine Attrappe davon.</summary>
public sealed class PartyPicAppFactory : WebApplicationFactory<Program>
{
    /// <summary>Eine offen gehaltene In-Memory-Verbindung: SQLite verwirft die Datenbank,
    /// sobald die letzte Verbindung darauf zugeht.</summary>
    private SqliteConnection? _connection;

    public FakePhotoStorage Storage { get; } = new();

    /// <summary>Steuerbare Uhr — so laesst sich "die Party ist vorbei" pruefen, ohne
    /// sieben Tage zu warten.</summary>
    /// <summary>Startet bei der echten Uhrzeit: die Token-Pruefung von JwtBearer haengt an
    /// der Systemuhr, ein fest verdrahtetes Datum liesse jedes ausgestellte Token sofort
    /// als abgelaufen gelten. Vorspulen fuer "die Party ist vorbei" geht trotzdem.</summary>
    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.UtcNow);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Development);

        builder.UseSetting("ConnectionStrings:partypicdb", "Host=localhost;Database=unused");
        builder.UseSetting("PartyPic:Jwt:Secret", "test-secret-mit-mehr-als-32-zeichen-laenge");
        // Das Schema legt der Test selbst an (EnsureCreated) — die Migrationen sind fuer
        // Postgres erzeugt und liefen gegen SQLite ins Leere.
        builder.UseSetting("PartyPic:MigrateOnStartup", "false");

        builder.ConfigureTestServices(services =>
        {
            // Alles, was am DbContext haengt, fliegt raus — nicht nur die Options: die
            // Aspire-Integration registriert zusaetzlich Konfigurations- und
            // Interceptor-Dienste, die sonst den Npgsql-Provider wieder anziehen wuerden.
            foreach (var descriptor in services
                         .Where(d => d.ServiceType.FullName?.Contains(nameof(PartyPicDbContext), StringComparison.Ordinal) == true)
                         .ToList())
            {
                services.Remove(descriptor);
            }

            // Eine benannte Shared-Cache-Datenbank statt einer geteilten Verbindung: jeder
            // DbContext oeffnet seine eigene Verbindung auf dieselben Daten. Eine einzige
            // SqliteConnection quer durch die DI zu reichen ist nicht threadsicher und
            // zerbricht, sobald zwei Scopes gleichzeitig hochkommen.
            var databaseName = $"partypic-{Guid.NewGuid():N}";
            var connectionString = $"DataSource={databaseName};Mode=Memory;Cache=Shared";

            // Diese Verbindung wird nur offen gehalten: SQLite verwirft die Datenbank,
            // sobald die letzte Verbindung darauf zugeht.
            _connection = new SqliteConnection(connectionString);
            _connection.Open();

            services.AddDbContext<PartyPicDbContext>(o => o.UseSqlite(connectionString));

            // Die Hintergrund-Jobs braucht kein Endpoint-Test; der Cleanup-Test ruft
            // seinen Durchlauf selbst auf.
            services.RemoveAll<IHostedService>();

            services.RemoveAll<IPhotoStorage>();
            services.AddSingleton<IPhotoStorage>(Storage);

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    /// <summary>Legt das Schema an. Die Migrationen sind fuer Postgres erzeugt, deshalb
    /// hier <c>EnsureCreated</c> — es leitet das Schema aus demselben Modell ab.</summary>
    public PartyPicAppFactory Initialize()
    {
        using var scope = Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<PartyPicDbContext>().Database.EnsureCreated();
        return this;
    }

    public T Resolve<T>() where T : notnull => Services.GetRequiredService<T>();

    /// <summary>Fuehrt etwas gegen die Datenbank aus, ohne ueber HTTP zu gehen —
    /// fuer Vorbedingungen und Nachpruefungen im Test.</summary>
    public async Task WithDbAsync(Func<PartyPicDbContext, Task> action)
    {
        using var scope = Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<PartyPicDbContext>());
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
            _connection?.Dispose();
    }
}
