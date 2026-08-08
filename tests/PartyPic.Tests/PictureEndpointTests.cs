using Microsoft.EntityFrameworkCore;

namespace PartyPic.Tests;

public sealed class PictureEndpointTests : ApiTestBase
{
    /// <summary>Der komplette Weg eines Fotos: Party, Gast, Upload-URL, "Browser laedt hoch",
    /// Bestaetigung, Galerie.</summary>
    private async Task<(SessionBody Session, TestApi Guest)> ArrangePartyWithGuestAsync()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var guest = NewClient();
        await guest.JoinAsync(session.Id, "Anna");
        return (session, guest);
    }

    [Fact]
    public async Task Upload_URL_gibt_es_nur_fuer_Mitglieder_der_Party()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        // Ohne Token. Frueher war dieser Endpoint voellig ungeschuetzt, und der
        // Session-Check verglich eine nicht abgewartete Promise mit null.
        var status = await NewClient().PostAsync($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 1000 });

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Upload_URL_fuer_eine_erfundene_Party_gibt_es_nicht()
    {
        var (_, guest) = await ArrangePartyWithGuestAsync();

        var status = await guest.PostAsync($"/api/sessions/{Guid.NewGuid()}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 1000 });

        Assert.Equal(HttpStatusCode.NotFound, status);
        Assert.Empty(App.Storage.IssuedUploadKeys);
    }

    [Theory]
    [InlineData("image/svg+xml", 1000)]
    [InlineData("application/pdf", 1000)]
    [InlineData("image/jpeg", 0)]
    [InlineData("image/jpeg", 999_000_000)]
    public async Task Unerlaubte_Uploads_bekommen_keine_URL(string contentType, long size)
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();

        var status = await guest.PostAsync($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = contentType, SizeBytes = size });

        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.Empty(App.Storage.IssuedUploadKeys);
    }

    [Fact]
    public async Task Upload_Schluessel_liegt_unter_dem_Praefix_der_Party()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();

        var (status, body) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.StartsWith($"{session.Id}/", body!.ObjectKey, StringComparison.Ordinal);
        Assert.EndsWith(".jpg", body.ObjectKey, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Bestaetigung_ohne_hochgeladenes_Objekt_erzeugt_keine_Galerie_Leiche()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();
        var (_, upload) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });

        // Der PUT des Browsers bleibt bewusst aus. Zuvor wurde ungeprueft eingetragen,
        // was der Client behauptete — die Galerie fuellte sich mit toten Kacheln.
        var status = await guest.PostAsync($"/api/sessions/{session.Id}/pictures",
            new { upload!.ObjectKey, OriginalFilename = "foto.jpg", MissionId = (string?)null });

        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    [Fact]
    public async Task Fremder_Objektschluessel_wird_abgewiesen()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();
        var foreignKey = $"{Guid.NewGuid()}/{Guid.NewGuid()}.jpg";
        App.Storage.Upload(foreignKey);

        var status = await guest.PostAsync($"/api/sessions/{session.Id}/pictures",
            new { ObjectKey = foreignKey, OriginalFilename = "fremd.jpg", MissionId = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Foto_landet_mit_Namen_aus_dem_Token_in_der_Galerie()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();
        var (_, upload) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });

        App.Storage.Upload(upload!.ObjectKey, 2048);

        var (status, picture) = await guest.PostAsync<PictureBody>($"/api/sessions/{session.Id}/pictures",
            new { upload.ObjectKey, OriginalFilename = "urlaub/foto.jpg", MissionId = (string?)null });

        Assert.Equal(HttpStatusCode.Created, status);
        // Der Name kommt aus dem Token, nicht aus dem Body — sonst koennte jeder unter
        // fremdem Namen posten.
        Assert.Equal("Anna", picture!.UserName);
        Assert.Equal(2048, picture.FileSizeBytes);

        // Der Originalname ist reine Anzeige und wird auf den Dateinamen reduziert.
        await App.WithDbAsync(async db =>
        {
            var row = await db.Pictures.SingleAsync();
            Assert.Equal("foto.jpg", row.OriginalFilename);
        });

        var (galleryStatus, gallery) = await guest.GetAsync<GalleryBody>($"/api/sessions/{session.Id}/pictures");
        Assert.Equal(HttpStatusCode.OK, galleryStatus);
        Assert.Equal(1, gallery!.Total);
        Assert.Single(gallery.Items);
    }

    [Fact]
    public async Task Unbekannte_Mission_wird_abgewiesen()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();
        var (_, upload) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });
        App.Storage.Upload(upload!.ObjectKey);

        var status = await guest.PostAsync($"/api/sessions/{session.Id}/pictures",
            new { upload.ObjectKey, OriginalFilename = "foto.jpg", MissionId = "gibt-es-nicht" });

        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Foto_behaelt_die_Mission_zu_der_es_gehoert()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();

        var (_, missions) = await Api.PutAsync<List<MissionBody>>($"/api/sessions/{session.Id}/missions",
            new { Missions = new[] { new { Id = (string?)null, Description = "Foto vom DJ" } } });
        var missionId = missions![0].Id;

        var (_, upload) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });
        App.Storage.Upload(upload!.ObjectKey);

        var (status, picture) = await guest.PostAsync<PictureBody>($"/api/sessions/{session.Id}/pictures",
            new { upload.ObjectKey, OriginalFilename = "dj.jpg", MissionId = missionId });

        Assert.Equal(HttpStatusCode.Created, status);
        // In der NestJS-Version stand hier stur die Session-Id — kein Foto war je einer
        // Mission zugeordnet.
        Assert.Equal(missionId, picture!.MissionId);
        Assert.Equal("Foto vom DJ", picture.MissionDescription);
    }

    [Fact]
    public async Task Gast_einer_anderen_Party_sieht_die_Galerie_nicht()
    {
        await Api.RegisterHostAsync();
        var partyA = await Api.CreateSessionAsync("A");
        var partyB = await Api.CreateSessionAsync("B");

        var guest = NewClient();
        await guest.JoinAsync(partyB.Id, "Anna");

        var (status, _) = await guest.GetAsync<GalleryBody>($"/api/sessions/{partyA.Id}/pictures");

        Assert.Equal(HttpStatusCode.Forbidden, status);
    }

    [Fact]
    public async Task Gast_loescht_nur_die_eigenen_Fotos()
    {
        var (session, anna) = await ArrangePartyWithGuestAsync();

        var (_, upload) = await anna.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });
        App.Storage.Upload(upload!.ObjectKey);
        var (_, picture) = await anna.PostAsync<PictureBody>($"/api/sessions/{session.Id}/pictures",
            new { upload.ObjectKey, OriginalFilename = "foto.jpg", MissionId = (string?)null });

        var bob = NewClient();
        await bob.JoinAsync(session.Id, "Bob");
        Assert.Equal(HttpStatusCode.Forbidden, await bob.DeleteAsync($"/api/sessions/{session.Id}/pictures/{picture!.Id}"));

        // Der Gastgeber darf jedes Foto entfernen — und das Objekt verschwindet mit.
        Assert.Equal(HttpStatusCode.NoContent, await Api.DeleteAsync($"/api/sessions/{session.Id}/pictures/{picture.Id}"));
        Assert.False(App.Storage.Exists(upload.ObjectKey));
    }

    [Fact]
    public async Task Nach_dem_Party_Ende_wird_nicht_mehr_hochgeladen_aber_noch_geschaut()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();
        var (_, upload) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 });
        App.Storage.Upload(upload!.ObjectKey);
        await guest.PostAsync<PictureBody>($"/api/sessions/{session.Id}/pictures",
            new { upload.ObjectKey, OriginalFilename = "foto.jpg", MissionId = (string?)null });

        App.Clock.Advance(TimeSpan.FromDays(8));

        // Das alte Gast-Token ist inzwischen abgelaufen — mit demselben Namen kommt man
        // zurueck in dieselbe Identitaet und bekommt ein frisches.
        await guest.JoinAsync(session.Id, "Anna");

        Assert.Equal(HttpStatusCode.Gone, await guest.PostAsync($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 }));

        // Die Erinnerungen bleiben abrufbar, bis der Cleanup sie abraeumt.
        var (galleryStatus, gallery) = await guest.GetAsync<GalleryBody>($"/api/sessions/{session.Id}/pictures");
        Assert.Equal(HttpStatusCode.OK, galleryStatus);
        Assert.Equal(1, gallery!.Total);
    }

    [Fact]
    public async Task Galerie_ist_seitenweise_abrufbar()
    {
        var (session, guest) = await ArrangePartyWithGuestAsync();

        for (var i = 0; i < 5; i++)
        {
            var (_, upload) = await guest.PostAsync<UploadUrlBody>($"/api/sessions/{session.Id}/pictures/upload-url",
                new { ContentType = "image/jpeg", SizeBytes = 2048 });
            App.Storage.Upload(upload!.ObjectKey);
            await guest.PostAsync<PictureBody>($"/api/sessions/{session.Id}/pictures",
                new { upload.ObjectKey, OriginalFilename = $"foto{i}.jpg", MissionId = (string?)null });
            App.Clock.Advance(TimeSpan.FromSeconds(1));
        }

        var (status, page) = await guest.GetAsync<GalleryBody>($"/api/sessions/{session.Id}/pictures?skip=2&take=2");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(5, page!.Total);
        Assert.Equal(2, page.Items.Count);
    }
}
