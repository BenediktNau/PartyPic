# syntax=docker/dockerfile:1

# Ein Image fuer die ganze Anwendung: die API liefert das gebaute SPA aus ihrem wwwroot
# aus. Damit gibt es im Betrieb keinen zweiten Container, keinen Reverse-Proxy davor und
# kein Cross-Origin — den Party-Link teilt man einfach.

# --- Frontend bauen ---
FROM node:26-alpine AS frontend
WORKDIR /frontend

# Erst die Lockfiles: solange sich die Abhaengigkeiten nicht aendern, bleibt der
# npm-ci-Layer im Cache.
COPY src/frontend/package.json src/frontend/package-lock.json ./
RUN npm ci

COPY src/frontend/ ./
RUN npm run build

# --- Backend bauen ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src

COPY PartyPic.slnx ./
COPY src/PartyPic.Core/PartyPic.Core.csproj src/PartyPic.Core/
COPY src/PartyPic.Infrastructure/PartyPic.Infrastructure.csproj src/PartyPic.Infrastructure/
COPY src/PartyPic.ServiceDefaults/PartyPic.ServiceDefaults.csproj src/PartyPic.ServiceDefaults/
COPY src/PartyPic.Api/PartyPic.Api.csproj src/PartyPic.Api/
RUN dotnet restore src/PartyPic.Api/PartyPic.Api.csproj

COPY src/PartyPic.Core/ src/PartyPic.Core/
COPY src/PartyPic.Infrastructure/ src/PartyPic.Infrastructure/
COPY src/PartyPic.ServiceDefaults/ src/PartyPic.ServiceDefaults/
COPY src/PartyPic.Api/ src/PartyPic.Api/
RUN dotnet publish src/PartyPic.Api/PartyPic.Api.csproj -c Release -o /app/publish --no-restore

# --- Laufzeit ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=backend /app/publish ./
COPY --from=frontend /frontend/dist ./wwwroot

# Vom Basis-Image bereitgestellter non-root-User.
USER $APP_UID

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

# Die Anwendung prueft sich selbst: das Image enthaelt weder curl noch wget, und ein
# Paket dafuer nachzuinstallieren waere Pflegeaufwand fuer eine einzige HTTP-Anfrage.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD ["dotnet", "/app/PartyPic.Api.dll", "--healthcheck"]

ENTRYPOINT ["dotnet", "PartyPic.Api.dll"]
