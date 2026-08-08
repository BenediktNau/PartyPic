using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PartyPic.Core;
using PartyPic.Core.Abstractions;
using PartyPic.Core.Identity;
using PartyPic.Infrastructure.Auth;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Api.Endpoints;

/// <summary>Registrierung und Login der Gastgeber. Gaeste laufen ueber
/// <see cref="SessionEndpoints"/> — sie haben bewusst keinen Account.</summary>
internal static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (
            RegisterRequest body,
            AccountService accounts,
            ITokenIssuer tokens,
            IOptions<PartyOptions> options,
            CancellationToken ct) =>
        {
            if (!options.Value.AllowRegistration)
                return Results.Problem("Auf dieser Instanz sind keine neuen Accounts vorgesehen.", statusCode: StatusCodes.Status403Forbidden);

            var validation = new Validation()
                .Required(nameof(body.Name), body.Name, "Wie sollen wir dich nennen?")
                .MaxLength(nameof(body.Name), body.Name, 255)
                .Required(nameof(body.Email), body.Email, "Ohne E-Mail-Adresse geht es nicht.")
                .Email(nameof(body.Email), body.Email)
                .Required(nameof(body.Password), body.Password, "Bitte ein Passwort setzen.")
                .MinLength(nameof(body.Password), body.Password, 8);

            if (validation.HasErrors)
                return validation.Problem();

            var user = await accounts.RegisterAsync(body.Name, body.Email, body.Password, ct);
            if (user is null)
            {
                // 409 statt des ungefangenen Unique-Verstosses, der zuvor als 500 ankam.
                return Results.Problem("Diese E-Mail-Adresse ist schon vergeben.", statusCode: StatusCodes.Status409Conflict);
            }

            var token = tokens.IssueHostToken(user.Id, user.Email);
            return Results.Ok(new AuthResponse(token.AccessToken, token.ExpiresAt,
                new HostResponse(user.Id, user.Name, user.Email), Guest: null));
        })
        .RequireRateLimiting(RateLimitPolicies.Auth);

        group.MapPost("/login", async (
            LoginRequest body,
            AccountService accounts,
            ITokenIssuer tokens,
            CancellationToken ct) =>
        {
            var validation = new Validation()
                .Required(nameof(body.Email), body.Email, "Ohne E-Mail-Adresse geht es nicht.")
                .Required(nameof(body.Password), body.Password, "Bitte das Passwort eingeben.");

            if (validation.HasErrors)
                return validation.Problem();

            var user = await accounts.VerifyPasswordAsync(body.Email, body.Password, ct);
            if (user is null)
            {
                // Die NestJS-Version antwortete hier mit 201 und einer Meldung im Body —
                // jeder HTTP-Client hielt den fehlgeschlagenen Login fuer erfolgreich.
                return Results.Problem("E-Mail-Adresse oder Passwort stimmt nicht.", statusCode: StatusCodes.Status401Unauthorized);
            }

            var token = tokens.IssueHostToken(user.Id, user.Email);
            return Results.Ok(new AuthResponse(token.AccessToken, token.ExpiresAt,
                new HostResponse(user.Id, user.Name, user.Email), Guest: null));
        })
        .RequireRateLimiting(RateLimitPolicies.Auth);

        // Sagt dem Frontend, ob ein gespeichertes Token noch traegt — ohne es selbst
        // zerlegen zu muessen.
        group.MapGet("/me", async (ClaimsPrincipal principal, PartyPicDbContext db, CancellationToken ct) =>
        {
            var role = principal.FindFirstValue(PartyPicClaims.Role);
            if (!Guid.TryParse(principal.FindFirstValue(PartyPicClaims.Subject), out var id))
                return Results.Unauthorized();

            if (role == PartyPicClaims.HostRole)
            {
                var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
                return user is null
                    ? Results.Unauthorized()
                    : Results.Ok(new AuthResponse(string.Empty, DateTime.MinValue,
                        new HostResponse(user.Id, user.Name, user.Email), Guest: null));
            }

            var guest = await db.SessionUsers.FirstOrDefaultAsync(g => g.Id == id, ct);
            return guest is null
                ? Results.Unauthorized()
                : Results.Ok(new AuthResponse(string.Empty, DateTime.MinValue, Host: null,
                    new GuestResponse(guest.Id, guest.UserName, guest.SessionId)));
        })
        .RequireAuthorization(PartyPicClaims.PartyMemberPolicy);
    }
}
