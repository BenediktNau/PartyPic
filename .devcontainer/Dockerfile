FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install Node.js 24, build tools, psql client and utilities
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates gnupg g++ make python3 python3-pip git vim lsb-release apt-transport-https \
  && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
  && apt-get install -y --no-install-recommends nodejs build-essential \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/* \
  && sudo npm install -g @nestjs/cli 

RUN sudo apt-get update && sudo apt-get install -y gnupg software-properties-common

RUN wget -O- https://apt.releases.hashicorp.com/gpg | \
  gpg --dearmor | \
  sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null

RUN gpg --no-default-keyring \
  --keyring /usr/share/keyrings/hashicorp-archive-keyring.gpg \
  --fingerprint

RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

RUN sudo apt update

RUN sudo apt-get install terraform

# Installiere AWS CLI v2 abhängig von der Systemarchitektur
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "x86_64" ]; then \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"; \
  elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"; \
  else \
    echo "Unsupported architecture: $ARCH" && exit 1; \
  fi && \
  unzip awscliv2.zip && \
  sudo ./aws/install && \
  rm -rf aws awscliv2.zip



# Create workspace user is already 'vscode' in base image; ensure node_modules permission compatibility
USER vscode

