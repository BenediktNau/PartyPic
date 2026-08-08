using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PartyPic.Api;
using PartyPic.Api.Endpoints;
using PartyPic.Core.Identity;
using PartyPic.Infrastructure;
using PartyPic.Infrastructure.Auth;
using PartyPic.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// Telemetrie, Health-Checks, Service Discovery und Resilience — gemeinsam fuer alles,
// was im Aspire-Stack laeuft.
builder.AddServiceDefaults();

// Aspire liefert den Connection-String unter diesem Namen; im Standalone-Betrieb kommt er
// aus ConnectionStrings__partypicdb.
builder.AddNpgsqlDbContext<PartyPicDbContext>("partypicdb");

builder.AddPartyPicInfrastructure();

builder.Services.AddSingleton<IConfigureOptions<JwtBearerOptions>, ConfigureJwtBearerOptions>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(PartyPicClaims.HostPolicy, p => p.RequireClaim(PartyPicClaims.Role, PartyPicClaims.HostRole))
    .AddPolicy(PartyPicClaims.PartyMemberPolicy, p =>
        p.RequireClaim(PartyPicClaims.Role, PartyPicClaims.HostRole, PartyPicClaims.GuestRole));

builder.Services.AddPartyPicRateLimiting();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

// Nur fuer die getrennte Frontend-Entwicklung (Vite auf einem anderen Port). Im Betrieb
// liefert dieselbe Anwendung das SPA aus, dann faellt Cross-Origin komplett weg — anders
// als in der NestJS-Version, die mit "origin: true" jede Herkunft zurueckspiegelte.
const string DevCorsPolicy = "partypic-dev";
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(o => o.AddPolicy(DevCorsPolicy, p => p
        .SetIsOriginAllowed(origin => new Uri(origin).IsLoopback)
        .AllowAnyHeader()
        .AllowAnyMethod()));
}

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors(DevCorsPolicy);
}

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapDefaultEndpoints();
app.MapAuthEndpoints();
app.MapSessionEndpoints();
app.MapPictureEndpoints();

// Das gebaute SPA liegt im Container unter wwwroot. Jeder Pfad, der keine API-Route ist,
// bekommt index.html — sonst waere ein direkt aufgerufener Deep-Link (der geteilte
// Party-Link!) ein 404.
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

await app.StartupAsync();

await app.RunAsync();
