using PartyPic.Core.Identity;

namespace PartyPic.Core.Abstractions;

/// <summary>Stellt die beiden Token-Sorten aus, mit denen sich am API angemeldet wird.</summary>
public interface ITokenIssuer
{
    /// <summary>Token fuer einen registrierten Gastgeber (darf Sessions anlegen und Missionen setzen).</summary>
    IssuedToken IssueHostToken(Guid userId, string email);

    /// <summary>Token fuer einen Gast, fest verdrahtet auf genau eine Session.
    /// <paramref name="notAfter"/> deckelt die Lebensdauer auf das Party-Ende.</summary>
    IssuedToken IssueGuestToken(Guid sessionUserId, Guid sessionId, string displayName, DateTime notAfter);
}

/// <summary>Ausgestelltes Token samt Ablauf — der Client kann so ohne JWT-Parsing wissen,
/// wann er sich neu anmelden muss.</summary>
public sealed record IssuedToken(string AccessToken, DateTime ExpiresAt);
