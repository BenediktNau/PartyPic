using Microsoft.EntityFrameworkCore;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Tests;

public sealed class SessionEndpointTests : ApiTestBase
{
    [Fact]
    public async Task Session_anlegen_geht_nur_mit_Host_Token()
    {
        var status = await Api.PostAsync("/api/sessions", new { Name = "Ohne Anmeldung" });

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Gastgeber_kann_mehrere_Partys_haben()
    {
        await Api.RegisterHostAsync();
        await Api.CreateSessionAsync("Geburtstag");
        await Api.CreateSessionAsync("Silvester");

        var (status, sessions) = await Api.GetAsync<List<SessionBody>>("/api/sessions/mine");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(2, sessions!.Count);
        Assert.Contains(sessions, s => s.Name == "Silvester");
    }

    [Fact]
    public async Task Vorschau_ist_oeffentlich_und_verraet_nur_das_Noetigste()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync("Sommerfest");

        // Ohne jedes Token — genau der Zustand, in dem ein Gast den Link oeffnet.
        var (status, preview) = await NewClient().GetAsync<PreviewBody>($"/api/sessions/{session.Id}");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal("Sommerfest", preview!.Name);
        Assert.False(preview.HasEnded);
    }

    [Fact]
    public async Task Beitritt_mit_gleichem_Namen_liefert_dieselbe_Identitaet()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var first = await NewClient().JoinAsync(session.Id, "Anna");
        var second = await NewClient().JoinAsync(session.Id, "Anna");

        // Ersetzt den frueheren loginSessionUser-Endpoint: wer auf dem Handy den Speicher
        // verliert, kommt mit seinem Namen zurueck in dieselbe Identitaet.
        Assert.Equal(first.Guest!.Id, second.Guest!.Id);
    }

    [Fact]
    public async Task Beitritt_ohne_Namen_ist_400()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var status = await NewClient().PostAsync($"/api/sessions/{session.Id}/join", new { Username = "   " });

        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Beitritt_zu_unbekannter_Party_ist_404()
    {
        var status = await Api.PostAsync($"/api/sessions/{Guid.NewGuid()}/join", new { Username = "Anna" });

        Assert.Equal(HttpStatusCode.NotFound, status);
    }

    [Fact]
    public async Task Nach_dem_Party_Ende_kommt_man_noch_zum_Anschauen_herein()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        App.Clock.Advance(TimeSpan.FromDays(8));

        var guest = NewClient();
        var (status, body) = await guest.PostAsync<AuthBody>($"/api/sessions/{session.Id}/join",
            new { Username = "Spaet" });

        // Der Beitritt bleibt offen, damit niemand von den Bildern des eigenen Abends
        // ausgesperrt wird; gesperrt ist nur das Hochladen.
        Assert.Equal(HttpStatusCode.OK, status);
        guest.Token = body!.Token;

        Assert.Equal(HttpStatusCode.OK, (await guest.GetAsync<GalleryBody>($"/api/sessions/{session.Id}/pictures")).Status);
        Assert.Equal(HttpStatusCode.Gone, await guest.PostAsync($"/api/sessions/{session.Id}/pictures/upload-url",
            new { ContentType = "image/jpeg", SizeBytes = 2048 }));
    }

    [Fact]
    public async Task Missionen_setzen_darf_nur_der_Gastgeber()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var guest = NewClient();
        await guest.JoinAsync(session.Id, "Anna");

        var (status, _) = await guest.PutAsync<List<MissionBody>>($"/api/sessions/{session.Id}/missions",
            new { Missions = new[] { new { Id = (string?)null, Description = "Foto vom DJ" } } });

        Assert.Equal(HttpStatusCode.Forbidden, status);
    }

    [Fact]
    public async Task Fremder_Gastgeber_kommt_nicht_an_die_Party()
    {
        await Api.RegisterHostAsync("erster@party.test");
        var session = await Api.CreateSessionAsync();

        var other = NewClient();
        await other.RegisterHostAsync("zweiter@party.test");

        var (status, _) = await other.PutAsync<List<MissionBody>>($"/api/sessions/{session.Id}/missions",
            new { Missions = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.Forbidden, status);
    }

    [Fact]
    public async Task Missionen_bekommen_serverseitige_Ids_und_behalten_sie()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var (_, created) = await Api.PutAsync<List<MissionBody>>($"/api/sessions/{session.Id}/missions",
            new { Missions = new[] { new { Id = (string?)null, Description = "Foto vom DJ" } } });

        var existingId = created![0].Id;
        Assert.False(string.IsNullOrWhiteSpace(existingId));

        // Beim zweiten Speichern bleibt die Id der bestehenden Mission erhalten, damit
        // bereits hochgeladene Fotos ihre Zuordnung nicht verlieren.
        var (_, updated) = await Api.PutAsync<List<MissionBody>>($"/api/sessions/{session.Id}/missions",
            new
            {
                Missions = new[]
                {
                    new { Id = (string?)existingId, Description = "Foto vom DJ" },
                    new { Id = (string?)null, Description = "Foto mit dem Gastgeber" },
                },
            });

        Assert.Equal(existingId, updated![0].Id);
        Assert.NotEqual(existingId, updated[1].Id);
    }

    [Fact]
    public async Task Leere_Mission_wird_abgewiesen()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var (status, _) = await Api.PutAsync<List<MissionBody>>($"/api/sessions/{session.Id}/missions",
            new { Missions = new[] { new { Id = (string?)null, Description = "  " } } });

        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Heartbeat_setzt_den_Gast_auf_online()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var guest = NewClient();
        await guest.JoinAsync(session.Id, "Anna");

        App.Clock.Advance(TimeSpan.FromMinutes(5));
        var (status, stats) = await guest.PostAsync<StatsBody>($"/api/sessions/{session.Id}/heartbeat");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(1, stats!.OnlineGuests);

        // Nach dem Online-Fenster ohne weiteren Heartbeat gilt derselbe Gast als offline.
        App.Clock.Advance(TimeSpan.FromMinutes(5));
        var (_, later) = await guest.GetAsync<StatsBody>($"/api/sessions/{session.Id}/stats");

        Assert.Equal(0, later!.OnlineGuests);
        Assert.Equal(1, later.GuestCount);
    }

    [Fact]
    public async Task Gast_einer_anderen_Party_kommt_nicht_an_die_Statistik()
    {
        await Api.RegisterHostAsync();
        var partyA = await Api.CreateSessionAsync("A");
        var partyB = await Api.CreateSessionAsync("B");

        var guest = NewClient();
        await guest.JoinAsync(partyA.Id, "Anna");

        // Der Session-Claim im Token entscheidet, nicht die Id in der URL. In der
        // NestJS-Version genuegte die Kenntnis einer beliebigen sessionId.
        var (status, _) = await guest.GetAsync<StatsBody>($"/api/sessions/{partyB.Id}/stats");

        Assert.Equal(HttpStatusCode.Forbidden, status);
    }

    [Fact]
    public async Task Gastgeber_loest_die_Party_samt_Bildern_auf()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var guest = NewClient();
        await guest.JoinAsync(session.Id, "Anna");

        Assert.Equal(HttpStatusCode.NoContent, await Api.DeleteAsync($"/api/sessions/{session.Id}"));

        await App.WithDbAsync(async db =>
        {
            Assert.False(await db.Sessions.AnyAsync(s => s.Id == session.Id));
            // Die Gaeste haengen per Cascade an der Session.
            Assert.False(await db.SessionUsers.AnyAsync(g => g.SessionId == session.Id));
        });
    }
}
