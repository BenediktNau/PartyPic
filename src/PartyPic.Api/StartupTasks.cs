using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PartyPic.Core;
using PartyPic.Core.Abstractions;
using PartyPic.Infrastructure.Auth;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Api;

/// <summary>Was einmal beim Start passieren muss, damit die Anwendung wirklich
/// betriebsbereit ist: Schema aktualisieren, Bucket sicherstellen, vor unsicherer
/// Konfiguration warnen.</summary>
internal static class StartupTasks
{
    public static async Task StartupAsync(this WebApplication app)
    {
        var log = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("PartyPic.Startup");

        var jwt = app.Services.GetRequiredService<IOptions<JwtOptions>>().Value;
        if (jwt.IsEphemeral)
        {
            log.LogWarning(
                "PartyPic:Jwt:Secret ist nicht gesetzt — es wurde ein zufaelliges Secret fuer diesen Prozess erzeugt. " +
                "Nach einem Neustart muessen sich alle neu anmelden.");
        }

        await using var scope = app.Services.CreateAsyncScope();

        // Migrationen laufen beim Start. Fuer eine Instanz, die als ein Container startet,
        // ist ein separater Migrationsschritt nur eine Stolperfalle.
        if (app.Services.GetRequiredService<IOptions<PartyOptions>>().Value.MigrateOnStartup)
        {
            var db = scope.ServiceProvider.GetRequiredService<PartyPicDbContext>();
            await db.Database.MigrateAsync();
            log.LogInformation("Datenbankschema ist aktuell.");
        }

        try
        {
            await scope.ServiceProvider.GetRequiredService<IPhotoStorage>().EnsureBucketAsync();
        }
        catch (Exception ex)
        {
            // Kein harter Abbruch: der Storage kann kurz nach der App oben sein, und die
            // Health-Checks melden den Zustand ohnehin.
            log.LogError(ex, "Bucket konnte beim Start nicht geprueft werden.");
        }
    }
}

/// <summary>Sichtbar fuer die Tests, die den echten Host per <c>WebApplicationFactory</c> starten.</summary>
public partial class Program;
