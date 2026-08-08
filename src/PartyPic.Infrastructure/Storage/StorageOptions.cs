namespace PartyPic.Infrastructure.Storage;

/// <summary>Zugang zum S3-kompatiblen Bildspeicher (Sektion <c>PartyPic:Storage</c>).
/// Die Defaults zeigen auf das MinIO, das der Aspire-AppHost und die Compose-Datei
/// mitstarten — damit laeuft der Erststart ohne eigene Konfiguration.</summary>
public sealed class StorageOptions
{
    public const string SectionName = "PartyPic:Storage";

    public string BucketName { get; set; } = "partypic";

    /// <summary>Leer lassen fuer echtes AWS S3; fuer MinIO die Basis-URL des API-Ports.</summary>
    public string? ServiceUrl { get; set; }

    public string Region { get; set; } = "us-east-1";

    /// <summary>MinIO adressiert Buckets im Pfad, AWS als Subdomain.</summary>
    public bool ForcePathStyle { get; set; } = true;

    public string? AccessKey { get; set; }
    public string? SecretKey { get; set; }

    /// <summary>Nur fuer temporaere AWS-Credentials (STS).</summary>
    public string? SessionToken { get; set; }

    /// <summary>URL, die in presigned Links steht, falls sie von der intern genutzten
    /// abweicht. Genau der Fall in Docker/Aspire: der Server erreicht MinIO unter
    /// <c>http://minio:9000</c>, das Handy im WLAN aber nur unter der Host-Adresse.</summary>
    public string? PublicUrl { get; set; }

    /// <summary>Bucket beim Start anlegen, falls er fehlt.</summary>
    public bool CreateBucketIfMissing { get; set; } = true;
}
