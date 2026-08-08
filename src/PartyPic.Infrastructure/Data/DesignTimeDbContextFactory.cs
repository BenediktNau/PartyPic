using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PartyPic.Infrastructure.Data;

/// <summary>Nur fuer <c>dotnet ef migrations</c>. Ohne diese Fabrik muesste das Werkzeug
/// den ganzen Web-Host hochziehen — samt Connection-String, den es beim Erzeugen einer
/// Migration gar nicht braucht.</summary>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<PartyPicDbContext>
{
    public PartyPicDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<PartyPicDbContext>()
            .UseNpgsql("Host=localhost;Database=partypic;Username=postgres")
            .Options;

        return new PartyPicDbContext(options);
    }
}
