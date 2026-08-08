using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using PartyPic.Core;
using PartyPic.Core.Identity;
using PartyPic.Infrastructure.Auth;

namespace PartyPic.Tests;

public sealed class TokenIssuerTests
{
    private static readonly DateTime Now = new(2026, 6, 1, 20, 0, 0, DateTimeKind.Utc);

    private static (TokenIssuer Issuer, FakeTimeProvider Clock) Create(PartyOptions? party = null)
    {
        var clock = new FakeTimeProvider(new DateTimeOffset(Now, TimeSpan.Zero));
        var jwt = Options.Create(new JwtOptions { Secret = new string('k', 40) });
        return (new TokenIssuer(jwt, Options.Create(party ?? new PartyOptions()), clock), clock);
    }

    [Fact]
    public void Host_Token_traegt_Rolle_und_Id()
    {
        var (issuer, _) = Create();
        var userId = Guid.NewGuid();

        var token = new JwtSecurityTokenHandler().ReadJwtToken(issuer.IssueHostToken(userId, "host@party.test").AccessToken);

        Assert.Equal(userId.ToString(), token.Claims.Single(c => c.Type == "sub").Value);
        Assert.Equal(PartyPicClaims.HostRole, token.Claims.Single(c => c.Type == PartyPicClaims.Role).Value);
        Assert.DoesNotContain(token.Claims, c => c.Type == PartyPicClaims.SessionId);
    }

    [Fact]
    public void Gast_Token_ist_an_genau_eine_Session_gebunden()
    {
        var (issuer, _) = Create();
        var sessionId = Guid.NewGuid();

        var issued = issuer.IssueGuestToken(Guid.NewGuid(), sessionId, "Anna", Now.AddDays(7));
        var token = new JwtSecurityTokenHandler().ReadJwtToken(issued.AccessToken);

        Assert.Equal(sessionId.ToString(), token.Claims.Single(c => c.Type == PartyPicClaims.SessionId).Value);
        Assert.Equal(PartyPicClaims.GuestRole, token.Claims.Single(c => c.Type == PartyPicClaims.Role).Value);
    }

    [Fact]
    public void Gast_Token_wird_auf_das_Aufbewahrungsende_gedeckelt()
    {
        var (issuer, _) = Create(new PartyOptions { GuestTokenLifetime = TimeSpan.FromDays(2) });
        var partyEnd = Now.AddHours(3);

        var issued = issuer.IssueGuestToken(Guid.NewGuid(), Guid.NewGuid(), "Anna", partyEnd);

        // Der Aufrufer gibt die Obergrenze vor (Party-Ende plus Aufbewahrungsfrist);
        // laenger darf ein Gast-Token nie gelten.
        Assert.Equal(partyEnd, issued.ExpiresAt);
    }

    [Fact]
    public void Kurze_Party_verkuerzt_das_Token_nicht_unnoetig()
    {
        var (issuer, _) = Create(new PartyOptions { GuestTokenLifetime = TimeSpan.FromHours(1) });

        var issued = issuer.IssueGuestToken(Guid.NewGuid(), Guid.NewGuid(), "Anna", Now.AddDays(7));

        Assert.Equal(Now.AddHours(1), issued.ExpiresAt);
    }
}
