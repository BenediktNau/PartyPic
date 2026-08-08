using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PartyPic.Infrastructure.Data;
using PartyPic.Infrastructure.Maintenance;

namespace PartyPic.Tests;

public sealed class ExpiredSessionCleanupServiceTests
{
    /// <summary>Der Cleanup schliesst die Luecke, die es in der NestJS-Version gar nicht
    /// gab: <c>ends_at</c> wurde gesetzt und nie wieder angesehen — Fotos blieben fuer
    /// immer liegen.</summary>
    [Fact]
    public async Task Abgelaufene_Party_verschwindet_samt_Bildern_und_Objekten()
    {
        using var app = new PartyPicAppFactory().Initialize();
        var api = new TestApi(app.CreateClient());

        await api.RegisterHostAsync();
        var session = await api.CreateSessionAsync();

        var guest = new TestApi(app.CreateClient());
        await guest.JoinAsync(session.Id, "Anna");

        var (_, upload) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });
        app.Storage.Upload(upload!.ObjectKey);
        await guest.PostAsync<PictureBody>($"/api/sessions/{session.Id}/pictures",
            new { upload.ObjectKey, OriginalFilename = "foto.jpg", MissionId = (string?)null });

        var cleanup = app.Resolve<ExpiredSessionCleanupService>();

        // Solange die Party laeuft, wird nichts angefasst.
        Assert.Equal(0, await cleanup.RunOnceAsync(CancellationToken.None));
        Assert.True(app.Storage.Exists(upload.ObjectKey));

        // Auch direkt nach dem Ende noch nicht: die Galerie soll die Aufbewahrungsfrist
        // ueberleben, sonst waeren die Bilder eine Stunde nach der Feier weg.
        app.Clock.Advance(TimeSpan.FromDays(8));
        Assert.Equal(0, await cleanup.RunOnceAsync(CancellationToken.None));
        Assert.True(app.Storage.Exists(upload.ObjectKey));

        app.Clock.Advance(TimeSpan.FromDays(31));

        Assert.Equal(1, await cleanup.RunOnceAsync(CancellationToken.None));
        Assert.False(app.Storage.Exists(upload.ObjectKey));

        await app.WithDbAsync(async db =>
        {
            Assert.False(await db.Sessions.AnyAsync());
            Assert.False(await db.Pictures.AnyAsync());
            Assert.False(await db.SessionUsers.AnyAsync());
        });
    }

    [Fact]
    public async Task Laufende_Partys_bleiben_unangetastet()
    {
        using var app = new PartyPicAppFactory().Initialize();
        var api = new TestApi(app.CreateClient());

        await api.RegisterHostAsync();
        await api.CreateSessionAsync("Laeuft noch");

        app.Clock.Advance(TimeSpan.FromDays(6));

        var removed = await app.Resolve<ExpiredSessionCleanupService>().RunOnceAsync(CancellationToken.None);

        Assert.Equal(0, removed);
        await app.WithDbAsync(async db => Assert.Equal(1, await db.Sessions.CountAsync()));
    }
}
