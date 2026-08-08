using Microsoft.EntityFrameworkCore;
using PartyPic.Infrastructure.Data;

namespace PartyPic.Infrastructure.Auth;

/// <summary>Registrierung und Passwortpruefung der Gastgeber-Accounts.</summary>
public sealed class AccountService(PartyPicDbContext db, TimeProvider clock)
{
    /// <summary>BCrypt-Arbeitsfaktor. Bleibt bei 10 wie in der NestJS-Version, damit
    /// bestehende Hashes weiter verifizieren.</summary>
    private const int WorkFactor = 10;

    /// <summary>Legt einen Gastgeber an. Gibt <c>null</c> zurueck, wenn die Mailadresse
    /// schon vergeben ist — der Aufrufer macht daraus ein 409 statt eines 500 wie zuvor.</summary>
    public async Task<UserEntity?> RegisterAsync(string name, string email, string password, CancellationToken ct = default)
    {
        var normalized = NormalizeEmail(email);
        if (await db.Users.AnyAsync(u => u.Email == normalized, ct))
            return null;

        var user = new UserEntity
        {
            Id = Guid.CreateVersion7(),
            CreatedAt = clock.GetUtcNow().UtcDateTime,
            Name = name.Trim(),
            Email = normalized,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, WorkFactor),
        };

        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Zwei gleichzeitige Registrierungen derselben Adresse: der Unique-Index
            // gewinnt, und der Verlierer bekommt dieselbe Antwort wie beim Vorab-Check.
            return null;
        }

        return user;
    }

    /// <summary>Prueft Mailadresse und Passwort. <c>null</c> heisst "stimmt nicht" —
    /// ohne Unterscheidung zwischen unbekannter Adresse und falschem Passwort.</summary>
    public async Task<UserEntity?> VerifyPasswordAsync(string email, string password, CancellationToken ct = default)
    {
        var normalized = NormalizeEmail(email);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalized, ct);
        if (user is null)
        {
            // Gleicher Rechenaufwand wie bei existierendem Account: sonst verraet die
            // Antwortzeit, welche Adressen registriert sind.
            BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
            return null;
        }

        return BCrypt.Net.BCrypt.Verify(password, user.PasswordHash) ? user : null;
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
