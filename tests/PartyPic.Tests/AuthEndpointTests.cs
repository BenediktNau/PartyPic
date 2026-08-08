namespace PartyPic.Tests;

public sealed class AuthEndpointTests : ApiTestBase
{
    [Fact]
    public async Task Register_gibt_Token_und_Host_zurueck()
    {
        var body = await Api.RegisterHostAsync();

        Assert.False(string.IsNullOrWhiteSpace(body.Token));
        Assert.Equal("host@party.test", body.Host!.Email);
        Assert.Null(body.Guest);
    }

    [Fact]
    public async Task Register_normalisiert_die_Mailadresse()
    {
        await Api.RegisterHostAsync("Gross@Party.Test");

        var (status, _) = await NewClient().PostAsync<AuthBody>("/api/auth/login",
            new { Email = "gross@party.test", Password = "supersicher123" });

        Assert.Equal(HttpStatusCode.OK, status);
    }

    [Fact]
    public async Task Register_mit_belegter_Mailadresse_ist_ein_Konflikt()
    {
        await Api.RegisterHostAsync();

        // Zuvor lief das in einen ungefangenen Unique-Verstoss und kam als 500 an.
        var status = await NewClient().PostAsync("/api/auth/register",
            new { Name = "Zweiter", Email = "host@party.test", Password = "supersicher123" });

        Assert.Equal(HttpStatusCode.Conflict, status);
    }

    [Theory]
    [InlineData("", "a@b.de", "supersicher123")]
    [InlineData("Name", "keine-mail", "supersicher123")]
    [InlineData("Name", "a@b.de", "kurz")]
    public async Task Register_weist_unvollstaendige_Eingaben_ab(string name, string email, string password)
    {
        // Die NestJS-Version hatte zwar Validierungs-Annotationen, aber keine ValidationPipe —
        // sie liefen also nie, und fehlende Felder wurden zu 500ern aus der Datenbank.
        var status = await Api.PostAsync("/api/auth/register", new { Name = name, Email = email, Password = password });

        Assert.Equal(HttpStatusCode.BadRequest, status);
    }

    [Fact]
    public async Task Login_mit_falschem_Passwort_ist_401()
    {
        await Api.RegisterHostAsync();

        // Frueher antwortete der Server hier mit 201 und "{ message: 'Unauthorized' }" —
        // jeder Client hielt den Fehlversuch fuer einen erfolgreichen Login.
        var status = await NewClient().PostAsync("/api/auth/login",
            new { Email = "host@party.test", Password = "falsch-aber-lang-genug" });

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Login_mit_unbekannter_Adresse_ist_401()
    {
        var status = await Api.PostAsync("/api/auth/login",
            new { Email = "niemand@party.test", Password = "supersicher123" });

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Me_ohne_Token_ist_401()
    {
        var (status, _) = await Api.GetAsync<AuthBody>("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, status);
    }

    [Fact]
    public async Task Me_liefert_den_angemeldeten_Gastgeber()
    {
        await Api.RegisterHostAsync();

        var (status, body) = await Api.GetAsync<AuthBody>("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal("host@party.test", body!.Host!.Email);
    }

    [Fact]
    public async Task Me_liefert_den_Gast_samt_Session()
    {
        await Api.RegisterHostAsync();
        var session = await Api.CreateSessionAsync();

        var guestApi = NewClient();
        await guestApi.JoinAsync(session.Id, "Anna");

        var (status, body) = await guestApi.GetAsync<AuthBody>("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(session.Id, body!.Guest!.SessionId);
        Assert.Null(body.Host);
    }
}
