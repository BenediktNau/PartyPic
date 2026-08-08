# PartyPic

Fotos sammeln auf jeder Feier. Der Gastgeber legt eine Party an und teilt einen Link oder
QR-Code, die Gäste treten ohne Account bei, bekommen Foto-Aufträge („Mach ein Foto vom
DJ"), knipsen direkt im Browser — und alles landet in einer gemeinsamen Galerie.

Gedacht als **selbstgehostete Standalone-Instanz**: ein Container, eine Datenbank, ein
Bildspeicher. Kein Cluster, kein Konto bei irgendwem.

```
┌──────────────┐   Link/QR    ┌──────────────┐
│  Gastgeber   │ ───────────► │    Gäste     │
│ legt Party   │              │ nur Name     │
│ + Aufträge   │              │ eingeben     │
└──────┬───────┘              └──────┬───────┘
       │                             │
       └──────────► Galerie ◄────────┘
```

## Loslegen

### Variante A — Docker Compose (zum Betreiben)

```bash
cp .env.example .env
printf 'JWT_SECRET=%s\nDB_PASSWORD=%s\nSTORAGE_PASSWORD=%s\n' \
  "$(openssl rand -base64 48)" "$(openssl rand -base64 24)" "$(openssl rand -base64 24)" >> .env
docker compose up -d
```

Danach läuft die App auf **http://localhost:8080**. Fertig — Datenbank, Bildspeicher und
Anwendung starten zusammen.

Die drei Geheimnisse haben bewusst keine Vorgabewerte: ein mitgeliefertes Passwort wäre
auf jeder Instanz dasselbe und stünde obendrein öffentlich im Repo. Fehlt eines, sagt
Compose beim Start, welches.

> **Fürs Handy im WLAN:** Die Fotos laufen per signierter URL direkt zwischen Browser und
> Bildspeicher. Damit das vom Handy klappt, muss `PUBLIC_STORAGE_URL` in der `.env` auf
> die **IP des Rechners** zeigen, nicht auf `localhost` — sonst sucht das Handy den
> Speicher bei sich selbst und die Galerie bleibt grau:
>
> ```
> PUBLIC_STORAGE_URL=http://192.168.1.20:9000
> ```

### Variante B — Aspire (zum Entwickeln)

```bash
aspire run          # oder: dotnet run --project src/PartyPic.AppHost
```

Startet Postgres, MinIO, die API und das Frontend zusammen und öffnet das
Aspire-Dashboard mit Logs, Traces und Metriken.

Voraussetzungen: [.NET 10 SDK](https://dotnet.microsoft.com/download), Node 22+, eine
Container-Laufzeit (Docker oder Podman).

## Was die App kann

**Als Gastgeber**

- Account anlegen, beliebig viele Partys starten
- Aufträge pflegen — einzeln oder als `.txt` mit einer Zeile pro Auftrag
- Gäste per QR-Code oder Link einladen
- Live sehen, wie viele Fotos da sind und wer gerade online ist
- Jedes Foto löschen, die Party samt Bildern auflösen

**Als Gast**

- Link öffnen, Namen eingeben — kein Account, keine Installation
- Auftrag steht direkt über dem Sucher; nach jedem Foto kommt der nächste
- Foto knipsen oder eines aus dem Speicher hochladen
- Gemeinsame Galerie mit Vollbild, Wischen und Speichern
- Eigene Fotos wieder löschen

Nach dem Party-Ende (standardmäßig 7 Tage) sind keine neuen Uploads mehr möglich. Die
Galerie bleibt danach noch 30 Tage abrufbar — wer den Link hat und seinen Namen eingibt,
kommt weiter an die Bilder. Erst danach räumt der Aufräum-Job die Party samt Fotos ab.

## Konfiguration

Bis auf die drei Geheimnisse aus dem Schnellstart hat alles brauchbare Standardwerte.

| Variable | Bedeutung | Standard |
|---|---|---|
| `PartyPic__Jwt__Secret` | Signaturschlüssel, mindestens 32 Zeichen. Fehlt er, wird pro Start einer gewürfelt und alle müssen sich nach einem Neustart neu anmelden. | — |
| `PartyPic__Storage__SecretKey` | Passwort des Bildspeichers. Ohne Wert startet Compose gar nicht erst. | — |
| `ConnectionStrings__partypicdb` | Postgres-Verbindung | aus Compose/Aspire |
| `PartyPic__Storage__ServiceUrl` | Adresse des Bildspeichers aus Sicht des Servers | aus Compose/Aspire |
| `PartyPic__Storage__PublicUrl` | Adresse aus Sicht der Geräte (siehe Hinweis oben) | wie `ServiceUrl` |
| `PartyPic__Storage__BucketName` | Bucket, wird bei Bedarf angelegt | `partypic` |
| `PartyPic__AllowRegistration` | Neue Gastgeber-Accounts erlauben. Nach dem eigenen Account sinnvollerweise `false`. | `true` |
| `PartyPic__SessionLifetime` | Laufzeit einer Party | `7.00:00:00` |
| `PartyPic__RetentionAfterEnd` | Wie lange die Galerie nach dem Ende noch abrufbar bleibt | `30.00:00:00` |
| `PartyPic__MaxUploadBytes` | Größtes erlaubtes Bild | 15 MB |
| `PartyPic__CleanupInterval` | Takt des Aufräum-Jobs, `0` schaltet ihn ab | `01:00:00` |

Für AWS S3 statt MinIO: `ServiceUrl` leer lassen, `Region` setzen und entweder Keys
angeben oder die IAM-Rolle der Instanz greifen lassen.

## Aufbau

```
src/
  PartyPic.Core/            Domänen-Records, Abstraktionen, Upload-Regeln (keine Pakete)
  PartyPic.Infrastructure/  EF Core, S3-Speicher, Auth, Metriken, Hintergrund-Jobs
  PartyPic.Api/             Minimal-API + Auslieferung des SPA
  PartyPic.AppHost/         Aspire-Orchestrierung
  PartyPic.ServiceDefaults/ OpenTelemetry, Health-Checks, Resilience
  frontend/                 React 19, TypeScript, Vite, Tailwind 4
tests/
  PartyPic.Tests/           69 Tests, laufen ohne Docker
```

Details zur Architektur und den Konventionen stehen in [CLAUDE.md](CLAUDE.md).

## Entwicklung

```bash
dotnet build PartyPic.slnx
dotnet test  PartyPic.slnx

cd src/frontend && npm ci && npm run lint && npm run build
```

Die Testsuite fährt den echten Host hoch — dieselben Endpoints, dieselbe Autorisierung —
nur mit SQLite im Arbeitsspeicher und einem Fake-Bildspeicher. Deshalb braucht sie weder
Postgres noch MinIO noch Docker.

## Sicherheitsmodell in Kürze

- **Gastgeber** melden sich mit E-Mail und Passwort an (BCrypt) und bekommen ein JWT.
- **Gäste** bekommen ebenfalls ein JWT — fest an *eine* Party gebunden und nie länger
  gültig als deren Aufbewahrungsfrist. Die Session-Id in der URL allein öffnet nichts.
- Bilder laufen nie durch die Anwendung: der Browser lädt per signierter URL direkt in
  den Speicher. Bestätigt wird ein Upload erst, wenn das Objekt wirklich im Bucket liegt.
- Erlaubt sind nur echte Bildformate (kein SVG — das wäre ausführbares XML in der Galerie).
- Anmeldung, Beitritt und Upload sind mengenmäßig begrenzt; der Beitritt wird pro Party
  gezählt, damit ein volles Party-WLAN sich nicht selbst aussperrt.

## Lizenz

Privates Projekt, keine Garantie auf gar nichts. Viel Spaß auf der Feier.
