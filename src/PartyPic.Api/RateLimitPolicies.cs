using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace PartyPic.Api;

/// <summary>Zwei schmale Bremsen, die die NestJS-Version gar nicht hatte: gegen das
/// Durchprobieren von Passwoertern und gegen das massenhafte Ziehen von presigned URLs
/// (jede davon ist ein Schreibrecht auf den Bucket).</summary>
internal static class RateLimitPolicies
{
    public const string Auth = "auth";
    public const string Join = "join";
    public const string Upload = "upload";

    public static void AddPartyPicRateLimiting(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Gastgeber-Anmeldung: eng, hier wird sonst durchprobiert.
            options.AddPolicy(Auth, ctx => RateLimitPartition.GetFixedWindowLimiter(
                PartitionKey(ctx),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));

            // Beitritt: eigene, deutlich weitere Bremse — und pro Party gezaehlt statt pro
            // IP. Auf einer Feier haengen alle Gaeste an demselben WLAN, teilen sich also
            // eine Adresse; mit dem Login-Limit haetten die ersten zehn Ankommenden alle
            // weiteren ausgesperrt.
            options.AddPolicy(Join, ctx => RateLimitPartition.GetFixedWindowLimiter(
                ctx.Request.RouteValues["sessionId"]?.ToString() ?? PartitionKey(ctx),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 60, Window = TimeSpan.FromMinutes(1) }));

            // Grosszuegiger: auf einer Party fotografieren viele Gaeste gleichzeitig, und
            // hinter einem WLAN teilen sie sich eine IP.
            options.AddPolicy(Upload, ctx => RateLimitPartition.GetFixedWindowLimiter(
                PartitionKey(ctx),
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) }));
        });

    /// <summary>Angemeldete Aufrufer werden pro Identitaet gezaehlt, anonyme pro IP —
    /// sonst wuerde ein einzelner Gast das Limit fuer das ganze Party-WLAN aufbrauchen.</summary>
    private static string PartitionKey(HttpContext ctx) =>
        ctx.User.Identity?.IsAuthenticated == true
            ? $"user:{ctx.User.Identity!.Name ?? ctx.User.FindFirst("sub")?.Value}"
            : $"ip:{ctx.Connection.RemoteIpAddress}";
}
