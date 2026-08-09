# CLAUDE.md

Hinweise für Claude Code (claude.ai/code) zur Arbeit an diesem Repository.

## Projekt

PartyPic ist eine Foto-App für Feiern: Der Gastgeber legt eine Party an und teilt einen
Link, Gäste treten ohne Account bei, bekommen Foto-Missionen ("Mach ein Foto vom DJ"),
knipsen direkt im Browser und sehen alles in einer gemeinsamen Galerie. Gedacht als
selbstgehostete Standalone-Instanz — ein Container, eine Datenbank, ein Bildspeicher.

## Kommandos

Die Solution-Datei ist `PartyPic.slnx` (XML-Format) — **nicht** `PartyPic.sln`.

```bash
# Alles zusammen starten (Postgres + MinIO + API + Frontend, mit Dashboard)
# Frontend :5174, API :5290, Dashboard :17123, pgweb :8082, Bildspeicher :9000 — fest
# vergeben, damit die Adressen einen Neustart ueberleben. Wo welcher Port steht, sagt die
# README. pgweb haengt direkt an partypicdb, ohne Verbindungsdialog.
aspire run                       # oder: dotnet run --project src/PartyPic.AppHost

dotnet build PartyPic.slnx
dotnet test  PartyPic.slnx       # 69 Tests, brauchen weder Docker noch Postgres

# Einzelne Testklasse bzw. Testmethode
dotnet test tests/PartyPic.Tests/PartyPic.Tests.csproj --filter PictureEndpointTests
dotnet test tests/PartyPic.Tests/PartyPic.Tests.csproj --filter "FullyQualifiedName~Gast_loescht_nur_die_eigenen_Fotos"

# Nur die API (erwartet Postgres + S3 aus der Konfiguration)
dotnet run --project src/PartyPic.Api

# Frontend allein
cd src/frontend && npm ci && npm run lint && npm run build
npm run dev                      # Vite-Devserver, proxyt /api an die API

# Migration nach einer Modelländerung
dotnet ef migrations add <Name> --project src/PartyPic.Infrastructure \
  --startup-project src/PartyPic.Infrastructure --output-dir Data/Migrations
```

Secrets gehören in User-Secrets, nie in `appsettings.json`:

```bash
dotnet user-secrets set "PartyPic:Jwt:Secret" "..." --project src/PartyPic.Api
```

## Architektur

Vier Projekte mit fester Abhängigkeitsrichtung: `Api → Infrastructure → Core`.

- **`PartyPic.Core`** — Domänen-Records (`Mission`), Abstraktionen (`IPhotoStorage`,
  `ITokenIssuer`), Claim-Namen und die reine Upload-Policy (MIME-Allowlist,
  Größenprüfung, Schlüsselschema). **Regel: Core hat keine Paketabhängigkeiten.** Kein
  EF, kein AWS-SDK, kein ASP.NET. Was von außen gebraucht wird, ist eine Schnittstelle.
- **`PartyPic.Infrastructure`** — EF Core (`PartyPicDbContext`, `*Entity`, Migrationen),
  `S3PhotoStorage`, `AccountService` (BCrypt), `TokenIssuer` (JWT), die Metriken und die
  beiden Hintergrund-Jobs. Komposition in `DependencyInjection.cs`
  (`AddPartyPicInfrastructure`).
- **`PartyPic.Api`** — Minimal-API-Host. Endpoints in `Endpoints/*.cs` als statische
  `Map*Endpoints`-Erweiterungen, DTOs gesammelt in `Contracts.cs`. Liefert im Betrieb
  zusätzlich das gebaute SPA aus `wwwroot` aus.
- **`PartyPic.AppHost`** / **`PartyPic.ServiceDefaults`** — Aspire: der AppHost startet
  Postgres, MinIO, API und Vite-Frontend zusammen; ServiceDefaults trägt OpenTelemetry,
  Health-Checks, Service Discovery und Resilience.
- **`src/frontend`** — React 19 + TypeScript + Vite + Tailwind 4, TanStack Router und
  Query.

### Autorisierung

Der Kern der App und die Stelle, an der die NestJS-Version am meisten leckte. Es gibt
zwei Token-Sorten, beide HS256-JWT:

- **Host-Token** — registrierter Gastgeber, Claim `partypic_role=host`.
- **Gast-Token** — Claim `partypic_role=guest` **plus `partypic_sid`**, die Session, an
  die es gebunden ist. Läuft nie länger als die Party.

`PartyAccess.ResolveAsync` (in `src/PartyPic.Api/PartyAccess.cs`) beantwortet für jeden
session-bezogenen Aufruf die Frage "darf dieser Aufrufer an diese Party?" — ein Gastgeber
nur bei den eigenen Partys, ein Gast nur bei der aus seinem Token. **Die Session-Id aus
der URL entscheidet nie.** Neue session-bezogene Endpoints gehen durch diese Methode,
nicht an ihr vorbei.

### Fotoweg

Bilddaten laufen nie durch die App:

`POST /api/sessions/{id}/pictures/upload-url` (prüft Mitgliedschaft, MIME, Größe; gibt
presigned PUT + Objektschlüssel) → Browser `PUT` direkt in den Storage →
`POST /api/sessions/{id}/pictures` (prüft, dass der Schlüssel unter dem Session-Präfix
liegt **und das Objekt wirklich im Bucket ist**, leitet den Content-Type aus dem selbst
vergebenen Schlüssel ab, übernimmt den Namen aus dem Token) → Zeile in `pictures`.

Der Objektschlüssel ist immer `<sessionId>/<uuid>.<ext>`; das Präfix macht das Abräumen
einer Party zu einem einzigen Prefix-Delete.

## Konventionen

- Kommentare erklären das **Warum**, nicht das Was — besonders dort, wo eine Entscheidung
  überrascht oder einen Fehler der Vorgängerversion abstellt. Deutsch, wie im übrigen Code.
- DTOs sind `sealed record`. Entities heißen `*Entity` und bleiben in Infrastructure.
- Zeitstempel sind `DateTime` in UTC — bewusst nicht `DateTimeOffset`: SQLite kann die in
  Abfragen nicht vergleichen, und die Tests laufen darauf.
- Ids vergibt die Anwendung (`Guid.CreateVersion7()`), nicht die Datenbank. Das Modell
  bleibt dadurch providerneutral (keine `gen_random_uuid()`-Defaults).
- Zeit kommt immer aus `TimeProvider`, nie aus `DateTime.UtcNow`. Nur so lässt sich
  "die Party ist vorbei" testen, ohne sieben Tage zu warten.
- Validierung liegt in `Validation.cs` neben den Endpoints; Meldungen sind deutsch und
  ohne Fachjargon, weil sie unter dem Eingabefeld landen.

## Tests

`tests/PartyPic.Tests` fährt über `PartyPicAppFactory` den echten Host hoch — dieselben
Endpoints, dieselbe Authentifizierung — nur mit SQLite in-memory und `FakePhotoStorage`.
Deshalb braucht die Suite kein Docker und läuft überall.

Zwei Fallen, die dabei zu beachten sind:

- Die Migrationen sind für Postgres erzeugt; die Tests setzen `PartyPic:MigrateOnStartup`
  auf `false` und legen das Schema per `EnsureCreated` an.
- Die Testuhr startet bei der **echten** Uhrzeit. Die Token-Prüfung von JwtBearer hängt an
  der Systemuhr — ein fest verdrahtetes Datum ließe jedes Token sofort als abgelaufen
  gelten. Vorspulen mit `App.Clock.Advance(...)` funktioniert trotzdem.
