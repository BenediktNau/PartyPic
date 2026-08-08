using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PartyPic.Core;
using PartyPic.Core.Abstractions;
using PartyPic.Core.Identity;
using PartyPic.Core.Missions;
using PartyPic.Infrastructure.Data;
using PartyPic.Infrastructure.Metrics;

namespace PartyPic.Api.Endpoints;

/// <summary>Partys anlegen und verwalten, Missionen setzen, als Gast beitreten.</summary>
internal static class SessionEndpoints
{
    public static void MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sessions").WithTags("Sessions");

        // --- Gastgeber -------------------------------------------------------------

        group.MapPost("/", async (
            CreateSessionRequest? body,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IOptions<PartyOptions> options,
            PartyMetrics metrics,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(PartyPicClaims.Subject), out var hostId))
                return Results.Unauthorized();

            var name = string.IsNullOrWhiteSpace(body?.Name) ? "Meine Party" : body.Name.Trim();
            var validation = new Validation().MaxLength("name", name, 120);
            if (validation.HasErrors)
                return validation.Problem();

            var now = clock.GetUtcNow().UtcDateTime;
            var session = new PartySessionEntity
            {
                Id = Guid.CreateVersion7(),
                Name = name,
                CreatedAt = now,
                EndsAt = now.Add(options.Value.SessionLifetime),
                UserId = hostId,
                Missions = [],
            };

            db.Sessions.Add(session);
            await db.SaveChangesAsync(ct);
            metrics.SessionCreated();

            return Results.Created($"/api/sessions/{session.Id}", ToResponse(session, guestCount: 0, photoCount: 0));
        })
        .RequireAuthorization(PartyPicClaims.HostPolicy);

        group.MapGet("/mine", async (ClaimsPrincipal principal, PartyPicDbContext db, CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(PartyPicClaims.Subject), out var hostId))
                return Results.Unauthorized();

            // Zaehlungen als Unterabfrage statt per Include: die Bilder selbst werden hier
            // nie gebraucht, nur ihre Anzahl.
            var sessions = await db.Sessions
                .Where(s => s.UserId == hostId)
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new
                {
                    Session = s,
                    GuestCount = s.Guests.Count,
                    PhotoCount = db.Pictures.Count(p => p.SessionId == s.Id),
                })
                .ToListAsync(ct);

            return Results.Ok(sessions
                .Select(x => ToResponse(x.Session, x.GuestCount, x.PhotoCount))
                .ToList());
        })
        .RequireAuthorization(PartyPicClaims.HostPolicy);

        group.MapDelete("/{sessionId:guid}", async (
            Guid sessionId,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IPhotoStorage storage,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: false, ct);
            if (!access.Ok)
                return access.Reason.ToResult();
            if (!access.Member!.IsHost)
                return Results.Problem("Nur der Gastgeber kann die Party aufloesen.", statusCode: StatusCodes.Status403Forbidden);

            await storage.DeletePrefixAsync($"{sessionId}/", ct);
            await db.Sessions.Where(s => s.Id == sessionId).ExecuteDeleteAsync(ct);
            return Results.NoContent();
        })
        .RequireAuthorization(PartyPicClaims.HostPolicy);

        group.MapPut("/{sessionId:guid}/missions", async (
            Guid sessionId,
            SetMissionsRequest body,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: false, ct);
            if (!access.Ok)
                return access.Reason.ToResult();
            if (!access.Member!.IsHost)
                return Results.Problem("Nur der Gastgeber kann die Missionen aendern.", statusCode: StatusCodes.Status403Forbidden);

            var incoming = body.Missions ?? [];
            var validation = new Validation()
                .Check("missions", incoming.Count <= 200, "Mehr als 200 Missionen sind zu viel des Guten.");

            foreach (var (mission, index) in incoming.Select((m, i) => (m, i)))
            {
                validation
                    .Required($"missions[{index}]", mission.Description, "Eine leere Mission bringt niemanden weiter.")
                    .MaxLength($"missions[{index}]", mission.Description, 200);
            }

            if (validation.HasErrors)
                return validation.Problem();

            // Bestehende Ids bleiben erhalten, damit bereits hochgeladene Fotos ihre
            // Mission behalten; nur wirklich neue Eintraege bekommen eine frische Id.
            var known = access.Member.Session.Missions.Select(m => m.Id).ToHashSet(StringComparer.Ordinal);
            access.Member.Session.Missions = [.. incoming.Select(m =>
                new Mission(
                    !string.IsNullOrWhiteSpace(m.Id) && known.Contains(m.Id) ? m.Id : Guid.CreateVersion7().ToString("N"),
                    m.Description.Trim()))];

            await db.SaveChangesAsync(ct);
            return Results.Ok(access.Member.Session.Missions);
        })
        .RequireAuthorization(PartyPicClaims.HostPolicy);

        // --- Gaeste ----------------------------------------------------------------

        // Oeffentlich: der Beitritts-Screen muss zeigen koennen, wo man gelandet ist,
        // bevor irgendein Name eingegeben wurde.
        group.MapGet("/{sessionId:guid}", async (Guid sessionId, PartyPicDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var session = await db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sessionId, ct);
            return session is null
                ? Results.Problem("Diese Party gibt es nicht.", statusCode: StatusCodes.Status404NotFound)
                : Results.Ok(new SessionPreviewResponse(
                    session.Id,
                    session.Name,
                    session.EndsAt,
                    session.EndsAt <= clock.GetUtcNow().UtcDateTime,
                    session.Missions.Count));
        });

        group.MapPost("/{sessionId:guid}/join", async (
            Guid sessionId,
            JoinSessionRequest body,
            PartyPicDbContext db,
            ITokenIssuer tokens,
            PartyMetrics metrics,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var username = body.Username?.Trim() ?? string.Empty;
            var validation = new Validation()
                .Required(nameof(body.Username), username, "Wie heisst du?")
                .MaxLength(nameof(body.Username), username, 50);
            if (validation.HasErrors)
                return validation.Problem();

            var session = await db.Sessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct);
            if (session is null)
                return Results.Problem("Diese Party gibt es nicht.", statusCode: StatusCodes.Status404NotFound);
            if (session.EndsAt <= clock.GetUtcNow().UtcDateTime)
                return Results.Problem("Diese Party ist vorbei.", statusCode: StatusCodes.Status410Gone);

            // Beitreten und Wiederkommen sind derselbe Aufruf: wer denselben Namen erneut
            // eingibt, bekommt seine bestehende Identitaet zurueck. Das ersetzt den
            // separaten loginSessionUser-Endpoint und rettet die Identitaet, wenn auf dem
            // Handy der Browser-Speicher geleert wurde.
            var guest = await db.SessionUsers.FirstOrDefaultAsync(g => g.SessionId == sessionId && g.UserName == username, ct);
            if (guest is null)
            {
                guest = new SessionUserEntity
                {
                    Id = Guid.CreateVersion7(),
                    SessionId = sessionId,
                    UserName = username,
                    CreatedAt = clock.GetUtcNow().UtcDateTime,
                    LastSeen = clock.GetUtcNow().UtcDateTime,
                };
                db.SessionUsers.Add(guest);
                metrics.GuestJoined();
            }
            else
            {
                guest.LastSeen = clock.GetUtcNow().UtcDateTime;
            }

            await db.SaveChangesAsync(ct);

            var token = tokens.IssueGuestToken(guest.Id, sessionId, guest.UserName, session.EndsAt);
            return Results.Ok(new AuthResponse(token.AccessToken, token.ExpiresAt, Host: null,
                new GuestResponse(guest.Id, guest.UserName, sessionId)));
        })
        .RequireRateLimiting(RateLimitPolicies.Join);

        group.MapGet("/{sessionId:guid}/missions", async (
            Guid sessionId,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: false, ct);
            return access.Ok
                ? Results.Ok(access.Member!.Session.Missions)
                : access.Reason.ToResult();
        })
        .RequireAuthorization(PartyPicClaims.PartyMemberPolicy);

        group.MapPost("/{sessionId:guid}/heartbeat", async (
            Guid sessionId,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IOptions<PartyOptions> options,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: true, ct);
            if (!access.Ok)
                return access.Reason.ToResult();

            var now = clock.GetUtcNow().UtcDateTime;
            if (access.Member!.GuestId is { } guestId)
            {
                await db.SessionUsers
                    .Where(g => g.Id == guestId)
                    .ExecuteUpdateAsync(s => s.SetProperty(g => g.LastSeen, now), ct);
            }

            return Results.Ok(await BuildStatsAsync(db, sessionId, now - options.Value.OnlineWindow, ct));
        })
        .RequireAuthorization(PartyPicClaims.PartyMemberPolicy);

        group.MapGet("/{sessionId:guid}/stats", async (
            Guid sessionId,
            ClaimsPrincipal principal,
            PartyPicDbContext db,
            IOptions<PartyOptions> options,
            TimeProvider clock,
            CancellationToken ct) =>
        {
            var access = await PartyAccess.ResolveAsync(principal, sessionId, db, clock, requireActive: false, ct);
            if (!access.Ok)
                return access.Reason.ToResult();

            return Results.Ok(await BuildStatsAsync(db, sessionId, clock.GetUtcNow().UtcDateTime - options.Value.OnlineWindow, ct));
        })
        .RequireAuthorization(PartyPicClaims.PartyMemberPolicy);
    }

    private static async Task<SessionStatsResponse> BuildStatsAsync(
        PartyPicDbContext db, Guid sessionId, DateTime onlineSince, CancellationToken ct) =>
        new(
            PhotoCount: await db.Pictures.CountAsync(p => p.SessionId == sessionId, ct),
            GuestCount: await db.SessionUsers.CountAsync(g => g.SessionId == sessionId, ct),
            OnlineGuests: await db.SessionUsers.CountAsync(g => g.SessionId == sessionId && g.LastSeen > onlineSince, ct));

    private static SessionResponse ToResponse(PartySessionEntity s, int guestCount, int photoCount) =>
        new(s.Id, s.Name, s.CreatedAt, s.EndsAt, s.Missions, guestCount, photoCount);
}
