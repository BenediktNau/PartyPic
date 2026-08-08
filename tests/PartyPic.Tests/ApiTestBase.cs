namespace PartyPic.Tests;

/// <summary>Gemeinsame Basis der Endpoint-Tests: eine frische Anwendung samt eigener
/// In-Memory-Datenbank pro Testklasse.</summary>
public abstract class ApiTestBase : IDisposable
{
    protected PartyPicAppFactory App { get; }
    protected TestApi Api { get; }

    protected ApiTestBase()
    {
        App = new PartyPicAppFactory().Initialize();
        Api = new TestApi(App.CreateClient());
    }

    /// <summary>Zweiter, unabhaengiger Aufrufer gegen dieselbe Anwendung — fuer Tests, in
    /// denen sich zwei Identitaeten in die Quere kommen sollen.</summary>
    protected TestApi NewClient() => new(App.CreateClient());

    public void Dispose()
    {
        App.Dispose();
        GC.SuppressFinalize(this);
    }
}
