// Der Aspire-AppHost: startet Datenbank, Objektspeicher, API und Frontend zusammen.
// Ein "aspire run" ersetzt damit die frueheren vier Schritte (Compose hoch, Bucket im
// MinIO-UI anlegen, Server starten, Client starten).

var builder = DistributedApplication.CreateBuilder(args);

const int FrontendPort = 5174;

// Der Datenbank-Browser. Fester Port aus demselben Grund wie beim Frontend.
const int PgWebPort = 8082;

var postgres = builder.AddPostgres("postgres")
    // Ohne Volume waere nach jedem Neustart die Party weg — samt Accounts.
    .WithDataVolume("partypic-db");

var database = postgres.AddDatabase("partypicdb");

// pgweb landet sonst auf seinem Verbindungsdialog: Aspire startet ihn mit "--sessions",
// und in diesem Modus verlangt jede Anfrage erst eine Session, die man im Browser per
// Hand aufmacht. Das Lesezeichen, das Aspire fuer die Datenbank hinterlegt, enthaelt aber
// bereits Host, Benutzer, Passwort und Datenbankname — also direkt damit verbinden,
// statt es sich anklicken zu lassen. Der Name des Lesezeichens ist der der
// Datenbank-Ressource; ueber database.Resource.Name bleibt beides zusammen, falls sie
// einmal umbenannt wird.
postgres.WithPgWeb(pgweb => pgweb
    .WithHostPort(PgWebPort)
    .WithArgs(context =>
    {
        context.Args.Remove("--sessions");
        context.Args.Add($"--bookmark={database.Resource.Name}");
    })
    // Ohne "--sessions" verbindet pgweb schon beim Start statt erst beim Anklicken.
    // Beim allerersten Lauf legt Postgres in dem Moment noch sein Datenverzeichnis an und
    // die Datenbank gibt es noch gar nicht — ohne dieses Warten liefe pgweb in seinen
    // Verbindungs-Timeout und stuende danach tot da.
    .WaitFor(database));

// MinIO als S3-Ersatz. Aspire bringt dafuer keine eigene Integration mit, ein normaler
// Container reicht aber vollkommen.
var storageUser = builder.AddParameter("storage-user", "partypic");
var storagePassword = builder.AddParameter("storage-password", "partypic-dev-secret", secret: true);

var minio = builder.AddContainer("minio", "minio/minio", "RELEASE.2025-04-22T22-12-26Z")
    .WithEnvironment("MINIO_ROOT_USER", storageUser)
    .WithEnvironment("MINIO_ROOT_PASSWORD", storagePassword)
    .WithArgs("server", "/data", "--console-address", ":9001")
    .WithVolume("partypic-photos", "/data")
    .WithHttpEndpoint(port: 9000, targetPort: 9000, name: "s3")
    .WithHttpEndpoint(port: 9001, targetPort: 9001, name: "console")
    .WithUrlForEndpoint("console", url => url.DisplayText = "MinIO Console");

var s3 = minio.GetEndpoint("s3");

var api = builder.AddProject<Projects.PartyPic_Api>("api")
    .WithReference(database)
    .WaitFor(database)
    .WithEnvironment("PartyPic__Storage__ServiceUrl", s3)
    // Die presigned URLs muessen fuer den Browser gelten, nicht fuer den Server-Prozess.
    // Lokal ist beides dieselbe Adresse; im LAN-Betrieb (Handy!) hier die Host-IP setzen.
    .WithEnvironment("PartyPic__Storage__PublicUrl", s3)
    .WithEnvironment("PartyPic__Storage__AccessKey", storageUser)
    .WithEnvironment("PartyPic__Storage__SecretKey", storagePassword)
    .WaitFor(minio)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var frontend = builder.AddViteApp("frontend", "../frontend")
    .WithReference(api)
    .WaitFor(api)
    // Installiert die npm-Pakete vor dem Start — ein frisch geklontes Repo laeuft damit
    // ohne vorheriges "npm install".
    .WithNpm()
    // Fester Port fuer die Adresse, die im Browser steht. Aspire wuerfelt sie sonst bei
    // jedem Start neu — jedes Lesezeichen und jeder schon geteilte Party-Link waeren nach
    // einem Neustart tot. Nur der aeussere Port ist gesetzt; auf welchem Port Vite
    // dahinter tatsaechlich lauscht, darf Aspire weiter selbst waehlen.
    .WithEndpoint("http", endpoint => endpoint.Port = FrontendPort, createIfNotExists: false)
    .WithExternalHttpEndpoints();

// Beim Publish wandert das gebaute SPA in das wwwroot des API-Containers — heraus kommt
// ein einziges Image, das die ganze Anwendung ausliefert.
api.PublishWithContainerFiles(frontend, "wwwroot");

builder.Build().Run();
