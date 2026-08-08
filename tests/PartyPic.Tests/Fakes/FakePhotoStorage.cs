using System.Collections.Concurrent;
using PartyPic.Core.Abstractions;

namespace PartyPic.Tests.Fakes;

/// <summary>Objektspeicher im Arbeitsspeicher. Damit laeuft die ganze Testsuite ohne MinIO
/// und ohne Docker — und der Schritt "Browser laedt hoch" wird zu einem einzigen
/// <see cref="Upload"/>-Aufruf, der sich im Test auch bewusst weglassen laesst.</summary>
public sealed class FakePhotoStorage : IPhotoStorage
{
    private readonly ConcurrentDictionary<string, long> _objects = new(StringComparer.Ordinal);

    public string BucketName => "test-bucket";

    /// <summary>Alle Schluessel, fuer die je eine Upload-URL ausgegeben wurde.</summary>
    public List<string> IssuedUploadKeys { get; } = [];

    /// <summary>Simuliert den erfolgreichen PUT des Browsers.</summary>
    public void Upload(string objectKey, long sizeInBytes = 1024) => _objects[objectKey] = sizeInBytes;

    public bool Exists(string objectKey) => _objects.ContainsKey(objectKey);

    public Task<string> CreateUploadUrlAsync(string objectKey, string contentType, TimeSpan lifetime, CancellationToken ct = default)
    {
        lock (IssuedUploadKeys)
            IssuedUploadKeys.Add(objectKey);

        return Task.FromResult($"https://storage.test/{objectKey}?upload");
    }

    public Task<string> CreateDownloadUrlAsync(string objectKey, TimeSpan lifetime, CancellationToken ct = default) =>
        Task.FromResult($"https://storage.test/{objectKey}?download");

    public Task<long?> GetObjectSizeAsync(string objectKey, CancellationToken ct = default) =>
        Task.FromResult(_objects.TryGetValue(objectKey, out var size) ? size : (long?)null);

    public Task DeleteAsync(string objectKey, CancellationToken ct = default)
    {
        _objects.TryRemove(objectKey, out _);
        return Task.CompletedTask;
    }

    public Task DeletePrefixAsync(string prefix, CancellationToken ct = default)
    {
        foreach (var key in _objects.Keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal)))
            _objects.TryRemove(key, out _);

        return Task.CompletedTask;
    }

    public Task EnsureBucketAsync(CancellationToken ct = default) => Task.CompletedTask;
}
