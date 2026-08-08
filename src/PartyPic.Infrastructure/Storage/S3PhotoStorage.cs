using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PartyPic.Core.Abstractions;

namespace PartyPic.Infrastructure.Storage;

/// <summary>Bildspeicher auf S3 bzw. MinIO.</summary>
public sealed class S3PhotoStorage : IPhotoStorage, IDisposable
{
    private readonly StorageOptions _options;
    private readonly ILogger<S3PhotoStorage> _log;

    /// <summary>Client fuer echte Aufrufe (HEAD, DELETE, Bucket anlegen) — nutzt die
    /// intern erreichbare Adresse.</summary>
    private readonly AmazonS3Client _client;

    /// <summary>Client, der die presigned URLs signiert. Zeigt auf <see cref="StorageOptions.PublicUrl"/>,
    /// weil SigV4 den Host mitsigniert: eine im Nachhinein umgeschriebene URL waere ungueltig.
    /// Ohne abweichende oeffentliche Adresse ist es derselbe Client.</summary>
    private readonly AmazonS3Client _signingClient;

    /// <summary>Schema der presigned URLs. <see cref="GetPreSignedUrlRequest"/> signiert sonst
    /// immer nach HTTPS — auch wenn die ServiceURL http ist und AmazonS3Config.UseHttp gesetzt
    /// wurde. Ein MinIO ohne TLS bekäme so vom Browser einen Handshake, den es nicht beantworten
    /// kann, und jeder Upload scheiterte.</summary>
    private readonly Protocol _signingProtocol;

    public S3PhotoStorage(IOptions<StorageOptions> options, ILogger<S3PhotoStorage> log)
    {
        _options = options.Value;
        _log = log;

        var signingUrl = string.IsNullOrWhiteSpace(_options.PublicUrl) ? _options.ServiceUrl : _options.PublicUrl;
        _signingProtocol = signingUrl?.StartsWith("http://", StringComparison.OrdinalIgnoreCase) == true
            ? Protocol.HTTP
            : Protocol.HTTPS;

        _client = CreateClient(_options, _options.ServiceUrl);
        _signingClient = string.IsNullOrWhiteSpace(_options.PublicUrl) || _options.PublicUrl == _options.ServiceUrl
            ? _client
            : CreateClient(_options, _options.PublicUrl);
    }

    public string BucketName => _options.BucketName;

    private static AmazonS3Client CreateClient(StorageOptions o, string? serviceUrl)
    {
        var config = new AmazonS3Config
        {
            ForcePathStyle = o.ForcePathStyle,
            AuthenticationRegion = o.Region,
        };

        if (!string.IsNullOrWhiteSpace(serviceUrl))
        {
            config.ServiceURL = serviceUrl;
            // Ohne dieses Flag baut das SDK jede presigned URL als https, auch wenn die
            // ServiceURL http ist — der Browser läuft dann beim Hochladen in einen
            // TLS-Fehler gegen ein MinIO, das gar kein TLS spricht.
            config.UseHttp = serviceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase);
        }
        else
        {
            config.RegionEndpoint = RegionEndpoint.GetBySystemName(o.Region);
        }

        // Ohne explizite Keys greift die uebliche AWS-Kette (Umgebung, Profil, IAM-Rolle).
        // Die NestJS-Version verlangte die Keys hart und machte den Rollen-Weg damit unbenutzbar.
        if (string.IsNullOrWhiteSpace(o.AccessKey) || string.IsNullOrWhiteSpace(o.SecretKey))
            return new AmazonS3Client(config);

        AWSCredentials credentials = string.IsNullOrWhiteSpace(o.SessionToken)
            ? new BasicAWSCredentials(o.AccessKey, o.SecretKey)
            : new SessionAWSCredentials(o.AccessKey, o.SecretKey, o.SessionToken);

        return new AmazonS3Client(credentials, config);
    }

    public Task<string> CreateUploadUrlAsync(string objectKey, string contentType, TimeSpan lifetime, CancellationToken ct = default) =>
        _signingClient.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = _options.BucketName,
            Key = objectKey,
            Verb = HttpVerb.PUT,
            ContentType = contentType,
            Expires = DateTime.UtcNow.Add(lifetime),
            Protocol = _signingProtocol,
        });

    public Task<string> CreateDownloadUrlAsync(string objectKey, TimeSpan lifetime, CancellationToken ct = default) =>
        _signingClient.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = _options.BucketName,
            Key = objectKey,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(lifetime),
            Protocol = _signingProtocol,
        });

    public async Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken ct = default)
    {
        try
        {
            var meta = await _client.GetObjectMetadataAsync(_options.BucketName, objectKey, ct);
            return meta.ContentLength;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task DeleteAsync(string objectKey, CancellationToken ct = default)
    {
        try
        {
            await _client.DeleteObjectAsync(_options.BucketName, objectKey, ct);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Schon weg ist das gewuenschte Ergebnis.
        }
    }

    public async Task DeletePrefixAsync(string prefix, CancellationToken ct = default)
    {
        string? continuationToken = null;
        do
        {
            var listed = await _client.ListObjectsV2Async(new ListObjectsV2Request
            {
                BucketName = _options.BucketName,
                Prefix = prefix,
                ContinuationToken = continuationToken,
            }, ct);

            if (listed.S3Objects is { Count: > 0 })
            {
                await _client.DeleteObjectsAsync(new DeleteObjectsRequest
                {
                    BucketName = _options.BucketName,
                    Objects = [.. listed.S3Objects.Select(o => new KeyVersion { Key = o.Key })],
                }, ct);
            }

            continuationToken = listed.IsTruncated == true ? listed.NextContinuationToken : null;
        }
        while (continuationToken is not null);
    }

    public async Task EnsureBucketAsync(CancellationToken ct = default)
    {
        if (!_options.CreateBucketIfMissing)
            return;

        if (await AmazonS3Util.DoesS3BucketExistV2Async(_client, _options.BucketName))
            return;

        _log.LogInformation("Bucket {Bucket} fehlt und wird angelegt.", _options.BucketName);
        await _client.PutBucketAsync(new PutBucketRequest { BucketName = _options.BucketName }, ct);
    }

    public void Dispose()
    {
        if (!ReferenceEquals(_client, _signingClient))
            _signingClient.Dispose();
        _client.Dispose();
    }
}
