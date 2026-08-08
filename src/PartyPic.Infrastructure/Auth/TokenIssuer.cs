using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PartyPic.Core;
using PartyPic.Core.Abstractions;
using PartyPic.Core.Identity;

namespace PartyPic.Infrastructure.Auth;

/// <summary>Stellt die Host- und Gast-Tokens aus (HS256).</summary>
public sealed class TokenIssuer(IOptions<JwtOptions> jwt, IOptions<PartyOptions> party, TimeProvider clock) : ITokenIssuer
{
    private readonly JwtOptions _jwt = jwt.Value;
    private readonly PartyOptions _party = party.Value;

    public IssuedToken IssueHostToken(Guid userId, string email)
    {
        var expires = clock.GetUtcNow().UtcDateTime.Add(_party.HostTokenLifetime);
        return Issue(
            [
                new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(PartyPicClaims.Role, PartyPicClaims.HostRole),
            ],
            expires);
    }

    public IssuedToken IssueGuestToken(Guid sessionUserId, Guid sessionId, string displayName, DateTime notAfter)
    {
        // Ein Gast-Token darf seine Party nie ueberleben — sonst haette jemand nach dem
        // Ende noch Schreibrecht auf eine Galerie, die es fachlich nicht mehr gibt.
        var expires = clock.GetUtcNow().UtcDateTime.Add(_party.GuestTokenLifetime);
        if (expires > notAfter)
            expires = notAfter;

        return Issue(
            [
                new Claim(JwtRegisteredClaimNames.Sub, sessionUserId.ToString()),
                new Claim(PartyPicClaims.SessionId, sessionId.ToString()),
                new Claim(PartyPicClaims.DisplayName, displayName),
                new Claim(PartyPicClaims.Role, PartyPicClaims.GuestRole),
            ],
            expires);
    }

    private IssuedToken Issue(Claim[] claims, DateTime expires)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret!));
        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            notBefore: clock.GetUtcNow().UtcDateTime,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new IssuedToken(new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
