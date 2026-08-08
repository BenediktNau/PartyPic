namespace PartyPic.Infrastructure.Auth;

/// <summary>Signaturparameter der ausgestellten Tokens (Sektion <c>PartyPic:Jwt</c>).</summary>
public sealed class JwtOptions
{
    public const string SectionName = "PartyPic:Jwt";

    /// <summary>HMAC-Schluessel. Fehlt er, erzeugt der Start einen zufaelligen fuer diesen
    /// Prozess — bequem zum Ausprobieren, aber alle Tokens sind nach einem Neustart
    /// ungueltig. Fuer echten Betrieb setzen (siehe <see cref="IsEphemeral"/>).</summary>
    public string? Secret { get; set; }

    public string Issuer { get; set; } = "partypic";
    public string Audience { get; set; } = "partypic";

    /// <summary>Wurde der Schluessel beim Start selbst gewuerfelt? Der Startup-Log warnt dann.</summary>
    public bool IsEphemeral { get; internal set; }

    /// <summary>HMAC-SHA256 verlangt mindestens 256 Bit Schluesselmaterial; kuerzere
    /// Secrets laesst die Bibliothek gar nicht erst zu.</summary>
    public const int MinimumSecretBytes = 32;
}
