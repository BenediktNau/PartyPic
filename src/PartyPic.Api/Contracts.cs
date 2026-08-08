using PartyPic.Core.Missions;

namespace PartyPic.Api;

// Alle Request- und Response-Formen der API an einer Stelle. Records, weil sie reine
// Datentraeger sind — und getrennt von den EF-Entities, damit interne Spalten
// (Passwort-Hash, Objektschluessel) nie versehentlich ueber die Leitung gehen.

/// <param name="Name">Anzeigename des Gastgebers.</param>
public sealed record RegisterRequest(string Name, string Email, string Password);

public sealed record LoginRequest(string Email, string Password);

/// <summary>Antwort auf jede erfolgreiche Anmeldung — Host wie Gast.</summary>
public sealed record AuthResponse(string Token, DateTime ExpiresAt, HostResponse? Host, GuestResponse? Guest);

public sealed record HostResponse(Guid Id, string Name, string Email);

public sealed record GuestResponse(Guid Id, string Name, Guid SessionId);

public sealed record CreateSessionRequest(string? Name);

/// <summary>Die Party aus Sicht des Gastgebers.</summary>
public sealed record SessionResponse(
    Guid Id,
    string Name,
    DateTime CreatedAt,
    DateTime EndsAt,
    IReadOnlyList<Mission> Missions,
    int GuestCount,
    int PhotoCount);

/// <summary>Was ein noch nicht beigetretener Gast sehen darf: gerade genug, um zu
/// erkennen, ob er beim richtigen Fest gelandet ist.</summary>
/// <param name="IsHost">Ob der Aufrufer der Gastgeber genau dieser Party ist. Das
/// Frontend braucht die Auskunft, um einen angemeldeten Gastgeber, der den Link einer
/// fremden Party öffnet, in den normalen Beitritt zu schicken statt in eine Oberfläche,
/// deren Aufrufe allesamt mit 403 zurückkommen.</param>
public sealed record SessionPreviewResponse(
    Guid Id,
    string Name,
    DateTime EndsAt,
    bool HasEnded,
    int MissionCount,
    bool IsHost);

public sealed record JoinSessionRequest(string Username);

public sealed record SetMissionsRequest(IReadOnlyList<MissionInput> Missions);

/// <param name="Id">Leer lassen fuer eine neue Mission; eine bestehende Id erhaelt die
/// Zuordnung bereits hochgeladener Fotos.</param>
public sealed record MissionInput(string? Id, string Description);

public sealed record UploadUrlRequest(string ContentType, long SizeBytes);

public sealed record UploadUrlResponse(string UploadUrl, string ObjectKey, DateTime ExpiresAt);

public sealed record FinalizeUploadRequest(string ObjectKey, string? OriginalFilename, string? MissionId);

public sealed record PictureResponse(
    Guid Id,
    DateTime CreatedAt,
    string UserName,
    string? MissionId,
    string? MissionDescription,
    string ContentType,
    long FileSizeBytes,
    string Url,
    bool CanDelete);

public sealed record GalleryResponse(IReadOnlyList<PictureResponse> Items, int Total);

/// <summary>Live-Zahlen einer Party fuer die Kopfzeile im Frontend.</summary>
public sealed record SessionStatsResponse(int PhotoCount, int GuestCount, int OnlineGuests);
