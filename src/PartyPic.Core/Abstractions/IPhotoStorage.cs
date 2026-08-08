namespace PartyPic.Core.Abstractions;

/// <summary>Der Bildspeicher hinter presigned URLs. Die App reicht nie Bilddaten durch:
/// der Browser laedt direkt gegen den Storage hoch und runter.</summary>
public interface IPhotoStorage
{
    /// <summary>Name des Buckets, in den geschrieben wird — landet zur Nachvollziehbarkeit
    /// mit in der Bild-Zeile.</summary>
    string BucketName { get; }

    /// <summary>Presigned PUT-URL fuer genau einen Objektschluessel und Content-Type.</summary>
    Task<string> CreateUploadUrlAsync(string objectKey, string contentType, TimeSpan lifetime, CancellationToken ct = default);

    /// <summary>Presigned GET-URL zum Anzeigen in der Galerie.</summary>
    Task<string> CreateDownloadUrlAsync(string objectKey, TimeSpan lifetime, CancellationToken ct = default);

    /// <summary>Groesse des Objekts, oder <c>null</c> wenn es (noch) nicht existiert.
    /// So laesst sich beim Finalisieren pruefen, ob wirklich etwas angekommen ist.</summary>
    Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken ct = default);

    /// <summary>Loescht ein Objekt. Fehlt es bereits, ist das kein Fehler.</summary>
    Task DeleteAsync(string objectKey, CancellationToken ct = default);

    /// <summary>Loescht alle Objekte unter einem Praefix — beim Abraeumen einer Session.</summary>
    Task DeletePrefixAsync(string prefix, CancellationToken ct = default);

    /// <summary>Legt den Bucket an, falls er fehlt. Macht den Erststart ohne manuelles
    /// MinIO-Setup moeglich.</summary>
    Task EnsureBucketAsync(CancellationToken ct = default);
}
