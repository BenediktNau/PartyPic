using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PartyPic.Core.Identity;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Api;

/// <summary>Beantwortet fuer jeden session-bezogenen Aufruf die eine Frage, an der in der
/// NestJS-Version nichts haengen wollte: darf dieser Aufrufer an diese Party?
/// Dort genuegte die Kenntnis einer sessionId, um Fotos zu lesen und hochzuladen.</summary>
internal static class PartyAccess
{
    /// <summary>Der Aufrufer, aufgeloest gegen die Datenbank.</summary>
    /// <param name="Session">Die Session — nur gesetzt, wenn der Zugriff erlaubt ist.</param>
    /// <param name="IsHost">Gastgeber der Session (darf alles, auch fremde Fotos loeschen).</param>
    /// <param name="GuestId">Gast-Identitaet, falls als Gast angemeldet.</param>
    internal sealed record Member(PartySessionEntity Session, bool IsHost, Guid? GuestId, string DisplayName);

    /// <summary>Warum ein Zugriff nicht erlaubt ist — der Aufrufer macht daraus den Statuscode.</summary>
    internal enum Denied
    {
        None,
        NotFound,
        Forbidden,
        Expired,
    }

    internal readonly record struct Result(Member? Member, Denied Reason)
    {
        public bool Ok => Member is not null;
    }

    /// <summary>Loest den Aufrufer gegen eine Session auf. <paramref name="requireActive"/>
    /// aus, wenn auch eine abgelaufene Party noch gelesen werden darf (Galerie ansehen),
    /// an, wenn geschrieben wird (Foto hochladen).</summary>
    internal static async Task<Result> ResolveAsync(
        ClaimsPrincipal user,
        Guid sessionId,
        PartyPicDbContext db,
        TimeProvider clock,
        bool requireActive,
        CancellationToken ct)
    {
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.Id == sessionId, ct);
        if (session is null)
            return new Result(null, Denied.NotFound);

        var role = user.FindFirstValue(PartyPicClaims.Role);
        Member? member = null;

        if (role == PartyPicClaims.HostRole)
        {
            // Ein Gastgeber kommt nur an die eigenen Partys — nicht an jede.
            if (Guid.TryParse(user.FindFirstValue(PartyPicClaims.Subject), out var hostId) && session.UserId == hostId)
                member = new Member(session, IsHost: true, GuestId: null, DisplayName: user.FindFirstValue("email") ?? "Gastgeber");
        }
        else if (role == PartyPicClaims.GuestRole)
        {
            // Der Session-Claim im Token entscheidet, nicht die Id aus der URL.
            var tokenSession = user.FindFirstValue(PartyPicClaims.SessionId);
            if (Guid.TryParse(tokenSession, out var claimedSession) && claimedSession == sessionId &&
                Guid.TryParse(user.FindFirstValue(PartyPicClaims.Subject), out var guestId))
            {
                // Der Gast muss noch existieren: nach dem Rauswurf ist sein Token wertlos.
                var guest = await db.SessionUsers
                    .FirstOrDefaultAsync(g => g.Id == guestId && g.SessionId == sessionId, ct);

                if (guest is not null)
                    member = new Member(session, IsHost: false, guest.Id, guest.UserName);
            }
        }

        if (member is null)
            return new Result(null, Denied.Forbidden);

        if (requireActive && session.EndsAt <= clock.GetUtcNow().UtcDateTime)
            return new Result(null, Denied.Expired);

        return new Result(member, Denied.None);
    }

    /// <summary>Uebersetzt eine Ablehnung in die passende HTTP-Antwort.</summary>
    internal static IResult ToResult(this Denied reason) => reason switch
    {
        Denied.NotFound => Results.Problem("Diese Party gibt es nicht.", statusCode: StatusCodes.Status404NotFound),
        Denied.Expired => Results.Problem("Diese Party ist vorbei.", statusCode: StatusCodes.Status410Gone),
        _ => Results.Problem("Kein Zugriff auf diese Party.", statusCode: StatusCodes.Status403Forbidden),
    };
}
