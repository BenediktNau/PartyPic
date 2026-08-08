using PartyPic.Core.Uploads;

namespace PartyPic.Tests;

public sealed class UploadPolicyTests
{
    [Theory]
    [InlineData("image/jpeg", "jpg")]
    [InlineData("image/png", "png")]
    [InlineData("image/heic", "heic")]
    [InlineData("IMAGE/JPEG", "jpg")]
    // Browser haengen gern Parameter an; ohne Abschneiden wuerde ein legitimer Upload scheitern.
    [InlineData("image/jpeg; charset=binary", "jpg")]
    public void Erlaubte_Bildtypen_ergeben_die_passende_Endung(string contentType, string expected)
    {
        Assert.True(UploadPolicy.TryGetExtension(contentType, out var extension));
        Assert.Equal(expected, extension);
    }

    [Theory]
    [InlineData("image/svg+xml")]   // ausfuehrbares XML -> Stored XSS auf der Galerie-Domain
    [InlineData("application/pdf")]
    [InlineData("text/html")]
    [InlineData("")]
    [InlineData(null)]
    public void Alles_andere_faellt_durch(string? contentType)
    {
        Assert.False(UploadPolicy.TryGetExtension(contentType, out _));
    }

    [Theory]
    [InlineData(1, true)]
    [InlineData(1024, true)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    [InlineData(1025, false)]
    public void Groessenpruefung_schliesst_leer_und_zu_gross_aus(long size, bool expected)
    {
        Assert.Equal(expected, UploadPolicy.IsAllowedSize(size, maxBytes: 1024));
    }

    [Fact]
    public void Objektschluessel_beginnt_mit_der_Session()
    {
        var sessionId = Guid.NewGuid();

        var key = UploadPolicy.BuildObjectKey(sessionId, "jpg");

        // Das Praefix macht das Abraeumen einer Party zu einem einzigen Prefix-Delete.
        Assert.StartsWith($"{sessionId}/", key, StringComparison.Ordinal);
        Assert.EndsWith(".jpg", key, StringComparison.Ordinal);
        Assert.NotEqual(key, UploadPolicy.BuildObjectKey(sessionId, "jpg"));
    }
}
