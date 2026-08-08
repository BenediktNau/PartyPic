using System.Diagnostics.Metrics;

namespace PartyPic.Infrastructure.Metrics;

/// <summary>Die App-Metriken. Namen wie in der NestJS-Version (<c>partypic_*</c>), damit
/// bestehende Dashboards weiter passen; der Transport ist jetzt OpenTelemetry statt eines
/// eigenen <c>/metrics</c>-Endpoints — das Aspire-Dashboard zeigt sie ohne Zusatzaufbau an.</summary>
public sealed class PartyMetrics
{
    public const string MeterName = "PartyPic";

    private readonly Counter<long> _sessionsCreated;
    private readonly Counter<long> _photosUploaded;
    private readonly Counter<long> _guestsJoined;

    /// <summary>Zuletzt eingesammelte Momentaufnahme. Die Gauges lesen nur aus diesem Feld:
    /// ein Callback der Metrik-Pipeline darf nicht auf die Datenbank warten.</summary>
    private volatile PartyStats _stats = PartyStats.Empty;

    public PartyMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create(MeterName);

        _sessionsCreated = meter.CreateCounter<long>("partypic_sessions_created_total",
            description: "Anzahl aller jemals erstellten Sessions");
        _photosUploaded = meter.CreateCounter<long>("partypic_photos_uploaded_total",
            description: "Anzahl aller erfolgreich finalisierten Foto-Uploads");
        _guestsJoined = meter.CreateCounter<long>("partypic_guests_joined_total",
            description: "Anzahl aller Session-Beitritte von Gaesten");

        meter.CreateObservableGauge("partypic_active_sessions", () => _stats.ActiveSessions,
            description: "Aktuell laufende (nicht abgelaufene) Sessions");
        meter.CreateObservableGauge("partypic_users_online", () => _stats.OnlineGuests,
            description: "Gaeste mit Heartbeat innerhalb des Online-Fensters");
        meter.CreateObservableGauge("partypic_photos_total", () => _stats.TotalPhotos,
            description: "Gesamtanzahl aller Fotos in der Datenbank");
    }

    public void SessionCreated() => _sessionsCreated.Add(1);
    public void PhotoUploaded() => _photosUploaded.Add(1);
    public void GuestJoined() => _guestsJoined.Add(1);

    public PartyStats Stats => _stats;

    public void Update(PartyStats stats) => _stats = stats;
}

/// <summary>Momentaufnahme der Kennzahlen ueber alle Sessions.</summary>
public sealed record PartyStats(long ActiveSessions, long OnlineGuests, long TotalPhotos)
{
    public static readonly PartyStats Empty = new(0, 0, 0);
}
