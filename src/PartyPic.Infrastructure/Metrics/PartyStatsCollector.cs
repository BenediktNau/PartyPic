using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PartyPic.Core;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Infrastructure.Metrics;

/// <summary>Fuellt die Gauges in <see cref="PartyMetrics"/> im festen Takt aus der Datenbank.
/// Genau ein Job — die NestJS-Version hatte zwei, die dieselbe Kennzahl mit
/// unterschiedlicher Definition ueberschrieben, sodass sie im Dashboard hin und her sprang.</summary>
public sealed class PartyStatsCollector(
    IServiceScopeFactory scopeFactory,
    PartyMetrics metrics,
    IOptions<PartyOptions> options,
    TimeProvider clock,
    ILogger<PartyStatsCollector> log) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval, clock);
        do
        {
            try
            {
                metrics.Update(await CollectAsync(stoppingToken));
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                // Kennzahlen sind nie ein Grund, den Prozess zu beenden — letzter Stand
                // bleibt stehen, bis die Datenbank wieder antwortet.
                log.LogWarning(ex, "Kennzahlen konnten nicht eingesammelt werden.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task<PartyStats> CollectAsync(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PartyPicDbContext>();

        var now = clock.GetUtcNow().UtcDateTime;
        var onlineSince = now - options.Value.OnlineWindow;

        return new PartyStats(
            ActiveSessions: await db.Sessions.CountAsync(s => s.EndsAt > now, ct),
            OnlineGuests: await db.SessionUsers.CountAsync(g => g.LastSeen > onlineSince, ct),
            TotalPhotos: await db.Pictures.CountAsync(ct));
    }
}
