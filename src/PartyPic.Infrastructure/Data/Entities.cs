using PartyPic.Core.Missions;

namespace PartyPic.Infrastructure.Data;

/// <summary>Ein registrierter Gastgeber. Gaeste stehen in <see cref="SessionUserEntity"/>
/// und haben bewusst keinen Account.</summary>
public sealed class UserEntity
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>Immer klein geschrieben abgelegt. Postgres vergleicht ohne <c>citext</c>
    /// case-sensitiv — in der NestJS-Version konnte sich derselbe Mensch daher mit
    /// "A@b.de" und "a@b.de" zweimal registrieren.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>BCrypt-Hash (Cost 10), nie das Klartext-Passwort.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public List<PartySessionEntity> Sessions { get; set; } = [];
}

/// <summary>Eine Party: gehoert genau einem Gastgeber, laeuft ab, traegt die Missionen.</summary>
public sealed class PartySessionEntity
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime EndsAt { get; set; }
    public Guid UserId { get; set; }
    public UserEntity? User { get; set; }

    /// <summary>Anzeigename der Party ("Toms 30er"). In der NestJS-Version gab es nur
    /// eine nackte UUID — auf dem Handy praktisch nicht auseinanderzuhalten.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Der Missionskatalog. Als JSON-Dokument gehalten, weil er immer komplett
    /// ersetzt wird und nie einzeln abgefragt.</summary>
    public List<Mission> Missions { get; set; } = [];

    public List<SessionUserEntity> Guests { get; set; } = [];
}

/// <summary>Ein Gast in genau einer Session. Die Id ist seine Identitaet; das ausgestellte
/// Gast-JWT verweist darauf.</summary>
public sealed class SessionUserEntity
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public Guid SessionId { get; set; }
    public PartySessionEntity? Session { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>Letzter Heartbeat. Speist die Online-Anzeige.</summary>
    public DateTime LastSeen { get; set; }
}

/// <summary>Ein hochgeladenes Foto. Die Bilddaten liegen im Objektspeicher, hier steht
/// nur der Verweis.</summary>
public sealed class PictureEntity
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>Anzeigename des Fotografen, aus dem Gast-Token uebernommen — nicht aus
    /// dem Request-Body, sonst koennte jeder unter fremdem Namen posten.</summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>Die Mission, zu der das Foto gehoert, oder <c>null</c> fuer ein freies Foto.
    /// Die NestJS-Version schrieb hier faelschlich die Session-Id hinein.</summary>
    public string? MissionId { get; set; }

    public Guid SessionId { get; set; }
    public PartySessionEntity? Session { get; set; }

    public string OriginalFilename { get; set; } = string.Empty;
    public string ObjectKey { get; set; } = string.Empty;
    public string BucketName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }

    /// <summary>Wer das Foto hochgeladen hat — erlaubt dem Gast, sein eigenes Bild
    /// wieder zu loeschen (dem Gastgeber jedes).</summary>
    public Guid UploadedBySessionUserId { get; set; }
}
