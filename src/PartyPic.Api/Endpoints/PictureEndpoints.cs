using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PartyPic.Core;
using PartyPic.Core.Abstractions;
using PartyPic.Core.Identity;
using PartyPic.Core.Uploads;
using PartyPic.Infrastructure.Data;
using PartyPic.Infrastructure.Metrics;

namespace PartyPic.Api.Endpoints;

/// <summary>Fotos: Upload-URL holen, Upload bestaetigen, Galerie lesen, Foto loeschen.
/// Die Bilddaten laufen nie durch die App — der Browser spricht direkt mit dem Storage.</summary>
internal static class PictureEndpoints
{
    public static void MapPictureEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sessions/{sessionId:guid}/pictures")
            .WithTags("Pictures")
            .RequireAuthorization(PartyPicClaims.PartyMemberPolicy);

        group.MapPost("/upload-url", async (
            Guid sessionId,
            UploadUrlRequest body,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IPhotoStorage storage,
            IOptions<PartyOptions> options,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            // Anders als zuvor wird hier wirklich geprueft, ob die Party existiert und
            // laeuft: der alte Check verglich eine nicht abgewartete Promise mit null und
            // war damit immer wahr — jeder konnte fuer jede beliebige Zeichenkette eine
            // Schreib-URL auf den Bucket bekommen.
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: true, ct);
            if (!access.Ok)
                return access.Reason.ToResult();

            var limits = options.Value;
            var validation = new Validation()
                .Check(nameof(body.ContentType), UploadPolicy.TryGetExtension(body.ContentType, out var extension),
                    "Dieses Dateiformat nehmen wir nicht an.")
                .Check(nameof(body.SizeBytes), UploadPolicy.IsAllowedSize(body.SizeBytes, limits.MaxUploadBytes),
                    $"Das Bild darf hoechstens {limits.MaxUploadBytes / (1024 * 1024)} MB gross sein.");

            if (validation.HasErrors)
                return validation.Problem();

            var objectKey = UploadPolicy.BuildObjectKey(sessionId, extension);
            var url = await storage.CreateUploadUrlAsync(objectKey, body.ContentType, limits.UploadUrlLifetime, ct);

            return Results.Ok(new UploadUrlResponse(url, objectKey, clock.GetUtcNow().UtcDateTime.Add(limits.UploadUrlLifetime)));
        })
        .RequireRateLimiting(RateLimitPolicies.Upload);

        group.MapPost("/", async (
            Guid sessionId,
            FinalizeUploadRequest body,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IPhotoStorage storage,
            IOptions<PartyOptions> options,
            PartyMetrics metrics,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: true, ct);
            if (!access.Ok)
                return access.Reason.ToResult();

            var member = access.Member!;

            // Der Schluessel muss unter dem Praefix dieser Session liegen, sonst koennte
            // ein Gast ein fremdes Objekt in die eigene Galerie haengen.
            if (string.IsNullOrWhiteSpace(body.ObjectKey) || !body.ObjectKey.StartsWith($"{sessionId}/", StringComparison.Ordinal))
                return Results.Problem("Dieser Upload gehoert nicht zu dieser Party.", statusCode: StatusCodes.Status400BadRequest);

            if (!UploadPolicy.TryGetExtension(GuessContentType(body.ObjectKey), out var contentType))
                return Results.Problem("Dieses Dateiformat nehmen wir nicht an.", statusCode: StatusCodes.Status400BadRequest);

            // Erst wenn das Objekt wirklich im Bucket liegt, entsteht die Bildzeile.
            // Zuvor wurde ungeprueft eingetragen, was der Client behauptete — eine Galerie
            // voller toter Kacheln war die Folge.
            var size = await storage.GetObjectSizeAsync(body.ObjectKey, ct);
            if (size is null)
                return Results.Problem("Das Bild ist nicht angekommen. Bitte noch einmal versuchen.", statusCode: StatusCodes.Status409Conflict);
            if (!UploadPolicy.IsAllowedSize(size.Value, options.Value.MaxUploadBytes))
            {
                await storage.DeleteAsync(body.ObjectKey, ct);
                return Results.Problem("Das Bild ist zu gross.", statusCode: StatusCodes.Status413PayloadTooLarge);
            }

            // Eine mitgeschickte Mission muss es in dieser Party geben. Die NestJS-Version
            // schrieb hier stur die Session-Id hinein, wodurch kein Foto je einer Mission
            // zugeordnet war.
            string? missionId = null;
            if (!string.IsNullOrWhiteSpace(body.MissionId))
            {
                if (!member.Session.Missions.Any(m => m.Id == body.MissionId))
                    return Results.Problem("Diese Mission gibt es hier nicht.", statusCode: StatusCodes.Status400BadRequest);
                missionId = body.MissionId;
            }

            var picture = new PictureEntity
            {
                Id = Guid.CreateVersion7(),
                CreatedAt = clock.GetUtcNow().UtcDateTime,
                SessionId = sessionId,
                // Der Name kommt aus dem Token, nicht aus dem Body: sonst koennte jeder
                // unter fremdem Namen posten.
                UserName = member.DisplayName,
                UploadedBySessionUserId = member.GuestId ?? Guid.Empty,
                MissionId = missionId,
                ObjectKey = body.ObjectKey,
                BucketName = storage.BucketName,
                ContentType = contentType,
                FileSizeBytes = size.Value,
                OriginalFilename = SanitizeFilename(body.OriginalFilename) ?? Path.GetFileName(body.ObjectKey),
            };

            db.Pictures.Add(picture);

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Doppelt bestaetigter Upload (Retry auf wackligem Mobilfunk): das Bild
                // steht schon in der Galerie, das ist kein Fehlerfall fuers Handy.
                return Results.NoContent();
            }

            metrics.PhotoUploaded();

            var url = await storage.CreateDownloadUrlAsync(picture.ObjectKey, options.Value.DownloadUrlLifetime, ct);
            return Results.Created($"/api/sessions/{sessionId}/pictures/{picture.Id}",
                ToResponse(picture, url, member, MissionDescription(member, picture.MissionId)));
        })
        .RequireRateLimiting(RateLimitPolicies.Upload);

        group.MapGet("/", async (
            Guid sessionId,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IPhotoStorage storage,
            IOptions<PartyOptions> options,
            TimeProvider clock,
            int? skip,
            int? take,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: false, ct);
            if (!access.Ok)
                return access.Reason.ToResult();

            var member = access.Member!;
            var limits = options.Value;

            // Seitenweise statt "alles auf einmal": die alte Galerie lud jedes Foto der
            // Party in einem Rutsch und signierte dabei pro Bild eine URL.
            var pageSize = Math.Clamp(take ?? 60, 1, limits.MaxGalleryPageSize);
            var offset = Math.Max(skip ?? 0, 0);

            var total = await db.Pictures.CountAsync(p => p.SessionId == sessionId, ct);
            var rows = await db.Pictures
                .AsNoTracking()
                .Where(p => p.SessionId == sessionId)
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.Id)
                .Skip(offset)
                .Take(pageSize)
                .ToListAsync(ct);

            var items = new List<PictureResponse>(rows.Count);
            foreach (var row in rows)
            {
                var url = await storage.CreateDownloadUrlAsync(row.ObjectKey, limits.DownloadUrlLifetime, ct);
                items.Add(ToResponse(row, url, member, MissionDescription(member, row.MissionId)));
            }

            return Results.Ok(new GalleryResponse(items, total));
        });

        group.MapDelete("/{pictureId:guid}", async (
            Guid sessionId,
            Guid pictureId,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IPhotoStorage storage,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: false, ct);
            if (!access.Ok)
                return access.Reason.ToResult();

            var member = access.Member!;
            var picture = await db.Pictures.FirstOrDefaultAsync(p => p.Id == pictureId && p.SessionId == sessionId, ct);
            if (picture is null)
                return Results.NoContent();

            if (!CanDelete(picture, member))
                return Results.Problem("Nur der Gastgeber oder wer das Foto gemacht hat darf es loeschen.", statusCode: StatusCodes.Status403Forbidden);

            db.Pictures.Remove(picture);
            await db.SaveChangesAsync(ct);
            await storage.DeleteAsync(picture.ObjectKey, ct);

            return Results.NoContent();
        });
    }

    /// <summary>Der Gastgeber raeumt jedes Foto weg, ein Gast nur die eigenen.</summary>
    private static bool CanDelete(PictureEntity picture, PartyAccess.Member member) =>
        member.IsHost || (member.GuestId is { } id && picture.UploadedBySessionUserId == id);

    private static string? MissionDescription(PartyAccess.Member member, string? missionId) =>
        missionId is null ? null : member.Session.Missions.FirstOrDefault(m => m.Id == missionId)?.Description;

    private static PictureResponse ToResponse(PictureEntity p, string url, PartyAccess.Member member, string? missionDescription) =>
        new(p.Id, p.CreatedAt, p.UserName, p.MissionId, missionDescription, p.ContentType, p.FileSizeBytes, url, CanDelete(p, member));

    /// <summary>Der Content-Type wird aus der Endung des Schluessels abgeleitet, den der
    /// Server selbst vergeben hat — und nicht aus einer Angabe des Clients.</summary>
    private static string GuessContentType(string objectKey) => Path.GetExtension(objectKey).ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".gif" => "image/gif",
        ".heic" => "image/heic",
        ".heif" => "image/heif",
        ".avif" => "image/avif",
        _ => string.Empty,
    };

    /// <summary>Der Originalname ist reine Anzeige; Pfadanteile fliegen raus, damit er
    /// nirgends als Pfad missverstanden werden kann.</summary>
    private static string? SanitizeFilename(string? filename)
    {
        if (string.IsNullOrWhiteSpace(filename))
            return null;

        var name = Path.GetFileName(filename.Trim());
        return string.IsNullOrEmpty(name) ? null : name[..Math.Min(name.Length, 255)];
    }
}
