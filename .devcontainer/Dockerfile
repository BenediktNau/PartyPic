FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install Node.js 24, build tools, psql client and utilities
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates gnupg g++ make python3 python3-pip git vim lsb-release apt-transport-https \
  && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y --no-install-recommends nodejs build-essential \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# Create workspace user is already 'vscode' in base image; ensure node_modules permission compatibility
USER vscode

