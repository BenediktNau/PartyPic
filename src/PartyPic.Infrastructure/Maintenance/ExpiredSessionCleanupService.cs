using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PartyPic.Core;
using PartyPic.Core.Abstractions;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Infrastructure.Maintenance;

/// <summary>Raeumt abgelaufene Sessions samt Bildern und Objekten im Storage ab.
/// Die NestJS-Version hatte gar keine Aufraeumlogik: <c>ends_at</c> wurde gesetzt und nie
/// wieder angesehen, Fotos blieben unbegrenzt liegen. Fuer eine Instanz, die zu Hause
/// laeuft, ist das der Unterschied zwischen "laeuft" und "Platte voll".</summary>
public sealed class ExpiredSessionCleanupService(
    IServiceScopeFactory scopeFactory,
    IOptions<PartyOptions> options,
    TimeProvider clock,
    ILogger<ExpiredSessionCleanupService> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = options.Value.CleanupInterval;
        if (interval <= TimeSpan.Zero)
        {
            log.LogInformation("Cleanup abgeschaltet (PartyPic:CleanupInterval = 0).");
            return;
        }

        using var timer = new PeriodicTimer(interval, clock);
        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                log.LogError(ex, "Cleanup abgelaufener Sessions fehlgeschlagen.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    /// <summary>Ein Durchlauf. Oeffentlich, damit der Test ihn ohne Timer ausloesen kann.</summary>
    public async Task<int> RunOnceAsync(CancellationToken ct)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PartyPicDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IPhotoStorage>();

        var now = clock.GetUtcNow().UtcDateTime;
        var expired = await db.Sessions
            .Where(s => s.EndsAt <= now)
            .Select(s => s.Id)
            .ToListAsync(ct);

        foreach (var sessionId in expired)
        {
            // Erst die Objekte, dann die Zeilen: bricht es dazwischen ab, findet der
            // naechste Lauf die Session noch und raeumt zu Ende. Andersherum waeren die
            // Objekte verwaist und niemand wuesste mehr von ihnen.
            await storage.DeletePrefixAsync($"{sessionId}/", ct);
            await db.Sessions.Where(s => s.Id == sessionId).ExecuteDeleteAsync(ct);
            log.LogInformation("Abgelaufene Session {SessionId} abgeraeumt.", sessionId);
        }

        return expired.Count;
    }
}
