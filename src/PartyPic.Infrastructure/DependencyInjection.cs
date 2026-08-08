using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using PartyPic.Core;
using PartyPic.Core.Abstractions;
using PartyPic.Infrastructure.Auth;
using PartyPic.Infrastructure.Maintenance;
using PartyPic.Infrastructure.Metrics;
using PartyPic.Infrastructure.Storage;

namespace PartyPic.Infrastructure;

/// <summary>Komposition der Infrastruktur. Der Host ruft genau diese eine Methode —
/// welche Implementierung wo haengt, bleibt hier.</summary>
public static class DependencyInjection
{
    public static IHostApplicationBuilder AddPartyPicInfrastructure(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.Configure<PartyOptions>(builder.Configuration.GetSection(PartyOptions.SectionName));
        services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.SectionName));
        services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
        services.PostConfigure<JwtOptions>(EnsureSigningSecret);

        services.TryAddSingleton(TimeProvider.System);

        services.AddScoped<AccountService>();
        services.AddSingleton<ITokenIssuer, TokenIssuer>();
        services.AddSingleton<IPhotoStorage, S3PhotoStorage>();

        services.AddSingleton<PartyMetrics>();
        services.AddHostedService<PartyStatsCollector>();
        services.AddSingleton<ExpiredSessionCleanupService>();
        services.AddHostedService(sp => sp.GetRequiredService<ExpiredSessionCleanupService>());

        return builder;
    }

    /// <summary>Ohne gesetztes Secret wird eines gewuerfelt. Das haelt den Erststart
    /// huerdenfrei und ist trotzdem nicht unsicher — nur nicht neustart-fest, worauf der
    /// Start-Log hinweist. Ein zu kurzes Secret wird nicht stillschweigend geflickt,
    /// sondern abgelehnt: HMAC-SHA256 braucht 256 Bit.</summary>
    private static void EnsureSigningSecret(JwtOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Secret))
        {
            options.Secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
            options.IsEphemeral = true;
            return;
        }

        if (System.Text.Encoding.UTF8.GetByteCount(options.Secret) < JwtOptions.MinimumSecretBytes)
        {
            throw new InvalidOperationException(
                $"PartyPic:Jwt:Secret ist zu kurz — mindestens {JwtOptions.MinimumSecretBytes} Zeichen werden benoetigt.");
        }
    }
}
