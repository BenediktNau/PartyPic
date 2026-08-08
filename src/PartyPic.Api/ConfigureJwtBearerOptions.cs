using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PartyPic.Infrastructure.Auth;

namespace PartyPic.Api;

/// <summary>Verdrahtet die Token-Pruefung mit demselben Schluessel, mit dem der
/// <see cref="Infrastructure.Auth.TokenIssuer"/> signiert. Als
/// <see cref="IConfigureOptions{TOptions}"/> und nicht inline in Program.cs, weil das
/// Secret erst nach dem <c>PostConfigure</c> feststeht (dort entsteht ggf. das
/// Wegwerf-Secret) — inline gelesen waere es zum falschen Zeitpunkt.</summary>
internal sealed class ConfigureJwtBearerOptions(IOptions<JwtOptions> jwt) : IConfigureNamedOptions<JwtBearerOptions>
{
    public void Configure(JwtBearerOptions options) => Configure(Options.DefaultName, options);

    public void Configure(string? name, JwtBearerOptions options)
    {
        if (name != JwtBearerDefaults.AuthenticationScheme)
            return;

        var settings = jwt.Value;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = settings.Issuer,
            ValidateAudience = true,
            ValidAudience = settings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret!)),
            ValidateLifetime = true,
            // Der Default von fuenf Minuten laesst abgelaufene Tokens weiterlaufen; bei
            // Gast-Tokens, die an das Party-Ende gekoppelt sind, ist das unerwuenscht.
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "sub",
            RoleClaimType = "role",
        };
    }
}
