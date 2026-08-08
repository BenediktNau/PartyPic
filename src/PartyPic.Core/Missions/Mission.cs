namespace PartyPic.Core.Missions;

/// <summary>Eine Foto-Aufgabe ("Mach ein Foto vom DJ"). Die Id vergibt der Server, damit ein
/// Foto spaeter stabil auf seine Mission zeigen kann.</summary>
/// <param name="Id">Serverseitig vergebene Id, stabil ueber Umbenennungen hinweg.</param>
/// <param name="Description">Der Text, den die Gaeste sehen.</param>
public sealed record Mission(string Id, string Description);
