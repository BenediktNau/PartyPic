namespace PartyPic.Core;

/// <summary>Alle fachlichen Stellschrauben der App an einem Ort, gebunden an die
/// Konfigurationssektion <c>PartyPic</c>. Bewusst mit brauchbaren Defaults: ein frisch
/// gestarteter Standalone-Container soll ohne eine einzige gesetzte Variable laufen.</summary>
public sealed class PartyOptions
{
    public const string SectionName = "PartyPic";

    /// <summary>Wie lange eine Party-Session ab Erstellung gilt. Danach antworten die
    /// Session-Endpoints mit 410 Gone und der Cleanup raeumt sie samt Fotos ab.</summary>
    public TimeSpan SessionLifetime { get; set; } = TimeSpan.FromDays(7);

    /// <summary>Wie lange die Galerie nach dem Party-Ende noch abrufbar bleibt, bevor der
    /// Cleanup sie samt Fotos entfernt. Ohne diese Frist waeren die Bilder eine Stunde
    /// nach dem Ende weg — genau dann, wenn alle sie sich ansehen wollen.</summary>
    public TimeSpan RetentionAfterEnd { get; set; } = TimeSpan.FromDays(30);

    /// <summary>Zeitfenster, innerhalb dessen ein Heartbeat einen Gast als "online" zaehlt.
    /// Der Client schlaegt alle 30 s an, zwei verpasste Schlaege sind also erlaubt.</summary>
    public TimeSpan OnlineWindow { get; set; } = TimeSpan.FromMinutes(1);

    /// <summary>Lebensdauer des Host-JWTs (Login am Web-Frontend).</summary>
    public TimeSpan HostTokenLifetime { get; set; } = TimeSpan.FromHours(12);

    /// <summary>Lebensdauer des Gast-JWTs. Deckelt zusaetzlich <see cref="SessionLifetime"/>:
    /// ein Gast-Token ueberlebt seine Party nie.</summary>
    public TimeSpan GuestTokenLifetime { get; set; } = TimeSpan.FromDays(2);

    /// <summary>Maximale Bildgroesse in Bytes. Wird schon beim Anfordern der Upload-URL
    /// geprueft und zusaetzlich beim Finalisieren gegen die reale Objektgroesse in S3.</summary>
    public long MaxUploadBytes { get; set; } = 15 * 1024 * 1024;

    /// <summary>Gueltigkeit der presigned PUT-URL.</summary>
    public TimeSpan UploadUrlLifetime { get; set; } = TimeSpan.FromMinutes(15);

    /// <summary>Gueltigkeit der presigned GET-URLs in der Galerie.</summary>
    public TimeSpan DownloadUrlLifetime { get; set; } = TimeSpan.FromHours(1);

    /// <summary>Wie oft der Hintergrund-Job abgelaufene Sessions abraeumt.
    /// <see cref="TimeSpan.Zero"/> schaltet den Cleanup ab.</summary>
    public TimeSpan CleanupInterval { get; set; } = TimeSpan.FromHours(1);

    /// <summary>Obergrenze fuer eine Galerie-Seite. Die Galerie laedt von oben wachsend
    /// nach statt seitenweise: bei einer Liste, an deren Anfang staendig neue Fotos
    /// dazukommen, verschieben sich Seitengrenzen sonst und Bilder tauchen doppelt oder
    /// gar nicht auf.</summary>
    public int MaxGalleryPageSize { get; set; } = 500;

    /// <summary>Registrierung neuer Hosts. Auf einer privaten Instanz sinnvollerweise nach dem
    /// eigenen Account aus — die Gaeste brauchen ohnehin keinen Account.</summary>
    public bool AllowRegistration { get; set; } = true;

    /// <summary>Migrationen beim Start einspielen. An, damit der Standalone-Betrieb aus
    /// einem einzigen Container besteht; aus, wenn das Schema separat verwaltet wird
    /// (oder im Test, der sein Schema selbst anlegt).</summary>
    public bool MigrateOnStartup { get; set; } = true;
}
