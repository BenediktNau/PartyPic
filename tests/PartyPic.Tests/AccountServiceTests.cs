using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using PartyPic.Infrastructure.Auth;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Tests;

public sealed class AccountServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PartyPicDbContext _db;
    private readonly AccountService _accounts;

    public AccountServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _db = new PartyPicDbContext(new DbContextOptionsBuilder<PartyPicDbContext>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();

        _accounts = new AccountService(_db, new FakeTimeProvider(new DateTimeOffset(2026, 6, 1, 20, 0, 0, TimeSpan.Zero)));
    }

    [Fact]
    public async Task Passwort_wird_gehasht_abgelegt()
    {
        var user = await _accounts.RegisterAsync("Tom", "tom@party.test", "supersicher123");

        Assert.NotNull(user);
        Assert.NotEqual("supersicher123", user.PasswordHash);
        // Bewusst BCrypt mit Cost 10 wie in der NestJS-Version, damit Bestandsaccounts
        // weiter verifizieren.
        Assert.StartsWith("$2", user.PasswordHash, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Mailadresse_wird_kleingeschrieben_gespeichert()
    {
        var user = await _accounts.RegisterAsync("Tom", "  Tom@Party.Test ", "supersicher123");

        Assert.Equal("tom@party.test", user!.Email);
    }

    [Fact]
    public async Task Zweite_Registrierung_derselben_Adresse_scheitert()
    {
        await _accounts.RegisterAsync("Tom", "tom@party.test", "supersicher123");

        // Auch in anderer Schreibweise: ohne Normalisierung konnte sich derselbe Mensch
        // zweimal registrieren, weil Postgres ohne citext case-sensitiv vergleicht.
        Assert.Null(await _accounts.RegisterAsync("Tom", "TOM@party.test", "supersicher123"));
    }

    [Fact]
    public async Task Anmeldung_klappt_unabhaengig_von_der_Schreibweise()
    {
        await _accounts.RegisterAsync("Tom", "tom@party.test", "supersicher123");

        Assert.NotNull(await _accounts.VerifyPasswordAsync("TOM@Party.test", "supersicher123"));
    }

    [Fact]
    public async Task Falsches_Passwort_wird_abgelehnt()
    {
        await _accounts.RegisterAsync("Tom", "tom@party.test", "supersicher123");

        Assert.Null(await _accounts.VerifyPasswordAsync("tom@party.test", "danebengegriffen"));
    }

    [Fact]
    public async Task Unbekannte_Adresse_wird_abgelehnt()
    {
        Assert.Null(await _accounts.VerifyPasswordAsync("niemand@party.test", "supersicher123"));
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }
}
