namespace PartyPic.Core.Identity;

/// <summary>Die Claim-Namen und Rollen, auf denen die Autorisierung aufsetzt.
/// An einer Stelle definiert, weil sie an drei zusammenpassen muessen: Ausstellung
/// (TokenIssuer), Pruefung (Authorization-Policies) und Auslesen (Endpoints).</summary>
public static class PartyPicClaims
{
    /// <summary>Der Subject-Claim: Host-Id bzw. Gast-Id. Bewusst der rohe JWT-Name —
    /// die Token-Pruefung laeuft mit abgeschaltetem Claim-Mapping, sodass aus <c>sub</c>
    /// kein <c>nameidentifier</c> wird.</summary>
    public const string Subject = "sub";

    /// <summary>Rolle des Tokens: <see cref="HostRole"/> oder <see cref="GuestRole"/>.</summary>
    public const string Role = "partypic_role";

    /// <summary>Die Session, an die ein Gast-Token gebunden ist. Ohne diesen Claim kommt
    /// kein Gast an Fotos — genau das war in der NestJS-Version das Loch:
    /// dort reichte die blosse Kenntnis einer sessionId.</summary>
    public const string SessionId = "partypic_sid";

    /// <summary>Anzeigename des Gastes, damit ein Upload nicht auf einen frei
    /// waehlbaren Namen aus dem Request-Body vertraut.</summary>
    public const string DisplayName = "partypic_name";

    public const string HostRole = "host";
    public const string GuestRole = "guest";

    /// <summary>Policy: nur registrierte Gastgeber.</summary>
    public const string HostPolicy = "PartyPic.Host";

    /// <summary>Policy: Gast oder Gastgeber — wer drin ist, darf die Galerie sehen.</summary>
    public const string PartyMemberPolicy = "PartyPic.PartyMember";
}
