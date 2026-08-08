namespace PartyPic.Core.Uploads;

/// <summary>Entscheidet, was hochgeladen werden darf, und leitet die Dateiendung ab.
/// Reine Funktion ohne I/O — der Kern der Upload-Haertung und entsprechend direkt testbar.
/// Die NestJS-Version hatte hier gar nichts: jeder MIME-Type, jede Groesse, und die Endung
/// entstand aus <c>mimetype.split('/')[1]</c> (aus <c>image/svg+xml</c> wurde <c>svg+xml</c>).</summary>
public static class UploadPolicy
{
    /// <summary>Allowlist statt Blocklist. SVG fehlt bewusst: es ist ausfuehrbares XML und
    /// wuerde als Bild ausgeliefert zu Stored XSS auf der Galerie-Domain.</summary>
    private static readonly Dictionary<string, string> ExtensionByContentType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = "jpg",
        ["image/png"] = "png",
        ["image/webp"] = "webp",
        ["image/gif"] = "gif",
        ["image/heic"] = "heic",
        ["image/heif"] = "heif",
        ["image/avif"] = "avif",
    };

    /// <summary>Die erlaubten MIME-Typen — auch fuer das <c>accept</c>-Attribut im Frontend.</summary>
    public static IReadOnlyCollection<string> AllowedContentTypes { get; } = [.. ExtensionByContentType.Keys];

    /// <summary>Prueft den MIME-Type und liefert die zugehoerige Dateiendung.</summary>
    public static bool TryGetExtension(string? contentType, out string extension)
    {
        extension = string.Empty;
        if (string.IsNullOrWhiteSpace(contentType))
            return false;

        // Browser haengen gern Parameter an ("image/jpeg; charset=binary") — abschneiden,
        // bevor die Allowlist greift, sonst schlaegt ein legitimer Upload fehl.
        var bare = contentType.Split(';', 2)[0].Trim();
        return ExtensionByContentType.TryGetValue(bare, out extension!);
    }

    /// <summary>Ist die angekuendigte bzw. tatsaechliche Groesse zulaessig?
    /// 0 Bytes ist ebenfalls ungueltig — das waere ein abgebrochener Upload.</summary>
    public static bool IsAllowedSize(long sizeInBytes, long maxBytes) =>
        sizeInBytes > 0 && sizeInBytes <= maxBytes;

    /// <summary>Objektschluessel im Bucket: <c>&lt;sessionId&gt;/&lt;uuid&gt;.&lt;ext&gt;</c>.
    /// Das Session-Praefix macht das Abraeumen einer Party zu einem Prefix-Delete.</summary>
    public static string BuildObjectKey(Guid sessionId, string extension) =>
        $"{sessionId}/{Guid.CreateVersion7()}.{extension}";
}
