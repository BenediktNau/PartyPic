namespace PartyPic.Api;

/// <summary>Fragt die eigene Liveness-Route ab und meldet das Ergebnis über den
/// Exit-Code. Gedacht als <c>HEALTHCHECK</c> des Containers.
///
/// Der naheliegende Weg — <c>curl</c> oder <c>wget</c> im Healthcheck — funktioniert
/// nicht: <c>mcr.microsoft.com/dotnet/aspnet:10.0</c> bringt beide nicht mit (nachgesehen
/// in den Image-Layern, <c>usr/bin</c> enthält weder das eine noch das andere). Statt
/// dafür ein Paket nachzuinstallieren und sich dessen Pflege ans Bein zu binden, prüft
/// sich die Anwendung mit ihrer eigenen Laufzeit — die ist garantiert da.</summary>
internal static class HealthProbe
{
    public const string Argument = "--healthcheck";

    public static async Task<int> RunAsync()
    {
        // Denselben Port nehmen, den auch der Server bedient. Das Format erlaubt mehrere,
        // durch Semikolon getrennt — für die Prüfung genügt der erste.
        var port = (Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS") ?? "8080")
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault() ?? "8080";

        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            using var response = await http.GetAsync($"http://127.0.0.1:{port}/alive");
            return response.IsSuccessStatusCode ? 0 : 1;
        }
        catch
        {
            // Egal woran es scheitert — nicht erreichbar ist nicht gesund.
            return 1;
        }
    }
}
