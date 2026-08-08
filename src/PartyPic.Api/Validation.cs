using System.Globalization;

namespace PartyPic.Api;

/// <summary>Sammelt Feldfehler und macht daraus ein <c>ValidationProblemDetails</c>.
/// Bewusst von Hand statt ueber DataAnnotations: die Regeln stehen so direkt neben dem
/// Endpoint und die Meldungen sind auf Deutsch und ohne Fachjargon — sie landen im
/// Frontend unter dem Eingabefeld. In der NestJS-Version lief gar keine Validierung
/// (die <c>class-validator</c>-Annotationen waren ohne <c>ValidationPipe</c> wirkungslos),
/// jedes fehlende Feld wurde ein 500er.</summary>
internal sealed class Validation
{
    private readonly Dictionary<string, List<string>> _errors = [];

    public bool HasErrors => _errors.Count > 0;

    public IResult Problem() => Results.ValidationProblem(
        _errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));

    public Validation Required(string field, string? value, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
            Add(field, message);
        return this;
    }

    public Validation MaxLength(string field, string? value, int max)
    {
        if (value is not null && value.Trim().Length > max)
            Add(field, string.Create(CultureInfo.InvariantCulture, $"Bitte hoechstens {max} Zeichen."));
        return this;
    }

    public Validation MinLength(string field, string? value, int min)
    {
        if (!string.IsNullOrWhiteSpace(value) && value.Length < min)
            Add(field, string.Create(CultureInfo.InvariantCulture, $"Bitte mindestens {min} Zeichen."));
        return this;
    }

    public Validation Email(string field, string? value)
    {
        // Absichtlich grob: eine vollstaendige RFC-5322-Pruefung lehnt mehr gueltige
        // Adressen ab, als sie ungueltige faengt. Zustellbar ist ohnehin nur, was ankommt.
        if (!string.IsNullOrWhiteSpace(value))
        {
            var at = value.IndexOf('@', StringComparison.Ordinal);
            if (at <= 0 || at == value.Length - 1 || value.IndexOf('.', at) < 0 || value.Contains(' ', StringComparison.Ordinal))
                Add(field, "Das sieht nicht nach einer E-Mail-Adresse aus.");
        }
        return this;
    }

    public Validation Check(string field, bool condition, string message)
    {
        if (!condition)
            Add(field, message);
        return this;
    }

    private void Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list))
            _errors[field] = list = [];
        list.Add(message);
    }
}
