using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace PartyPic.Tests;

/// <summary>Duenne Huelle um den HttpClient: setzt das Token und liefert Status und Body
/// zusammen zurueck. Ohne das wiederholt sich in jedem Test dieselbe Handvoll Zeilen.</summary>
public sealed class TestApi(HttpClient http)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public string? Token { get; set; }

    public async Task<(HttpStatusCode Status, T? Body)> PostAsync<T>(string url, object? body = null)
    {
        using var response = await Send(HttpMethod.Post, url, body);
        return (response.StatusCode, await ReadAsync<T>(response));
    }

    public async Task<HttpStatusCode> PostAsync(string url, object? body = null)
    {
        using var response = await Send(HttpMethod.Post, url, body);
        return response.StatusCode;
    }

    public async Task<(HttpStatusCode Status, T? Body)> GetAsync<T>(string url)
    {
        using var response = await Send(HttpMethod.Get, url, null);
        return (response.StatusCode, await ReadAsync<T>(response));
    }

    public async Task<(HttpStatusCode Status, T? Body)> PutAsync<T>(string url, object body)
    {
        using var response = await Send(HttpMethod.Put, url, body);
        return (response.StatusCode, await ReadAsync<T>(response));
    }

    public async Task<HttpStatusCode> DeleteAsync(string url)
    {
        using var response = await Send(HttpMethod.Delete, url, null);
        return response.StatusCode;
    }

    /// <summary>Meldet einen Gastgeber an und merkt sich das Token fuer alle Folgeaufrufe.</summary>
    public async Task<AuthBody> RegisterHostAsync(string email = "host@party.test", string password = "supersicher123")
    {
        var (status, body) = await PostAsync<AuthBody>("/api/auth/register",
            new { Name = "Gastgeber", Email = email, Password = password });

        Assert.Equal(HttpStatusCode.OK, status);
        Token = body!.Token;
        return body;
    }

    public async Task<SessionBody> CreateSessionAsync(string name = "Testparty")
    {
        var (status, body) = await PostAsync<SessionBody>("/api/sessions", new { Name = name });
        Assert.Equal(HttpStatusCode.Created, status);
        return body!;
    }

    /// <summary>Tritt als Gast bei und uebernimmt dessen Token.</summary>
    public async Task<AuthBody> JoinAsync(Guid sessionId, string username)
    {
        var (status, body) = await PostAsync<AuthBody>($"/api/sessions/{sessionId}/join", new { Username = username });
        Assert.Equal(HttpStatusCode.OK, status);
        Token = body!.Token;
        return body;
    }

    private Task<HttpResponseMessage> Send(HttpMethod method, string url, object? body)
    {
        var request = new HttpRequestMessage(method, url);
        if (body is not null)
            request.Content = JsonContent.Create(body, options: Json);
        if (Token is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Token);

        return http.SendAsync(request);
    }

    private static async Task<T?> ReadAsync<T>(HttpResponseMessage response)
    {
        if (response.Content.Headers.ContentLength is 0 or null)
            return default;

        try
        {
            return await response.Content.ReadFromJsonAsync<T>(Json);
        }
        catch (JsonException)
        {
            // Fehlerantworten sind ProblemDetails und passen nicht auf T — der Test
            // prueft in dem Fall ohnehin nur den Statuscode.
            return default;
        }
    }
}

// Antwortformen, so weit die Tests sie brauchen.
public sealed record AuthBody(string Token, DateTime ExpiresAt, HostBody? Host, GuestBody? Guest);
public sealed record HostBody(Guid Id, string Name, string Email);
public sealed record GuestBody(Guid Id, string Name, Guid SessionId);
public sealed record SessionBody(Guid Id, string Name, DateTime CreatedAt, DateTime EndsAt, List<MissionBody> Missions, int GuestCount, int PhotoCount);
public sealed record MissionBody(string Id, string Description);
public sealed record UploadUrlBody(string UploadUrl, string ObjectKey, DateTime ExpiresAt);
public sealed record PictureBody(Guid Id, DateTime CreatedAt, string UserName, string? MissionId, string? MissionDescription, string ContentType, long FileSizeBytes, string Url, bool CanDelete);
public sealed record GalleryBody(List<PictureBody> Items, int Total);
public sealed record StatsBody(int PhotoCount, int GuestCount, int OnlineGuests);
public sealed record PreviewBody(Guid Id, string Name, DateTime EndsAt, bool HasEnded, int MissionCount);
