#!/bin/bash
# =============================================================================
# AWS Credentials External Data Source
#
# Wird von Terraform als external data source aufgerufen.
# Liest AWS Credentials aus Umgebungsvariablen oder ~/.aws/credentials.
# Gibt JSON zurueck das Terraform parsen kann.
#
# Reihenfolge:
# 1. Umgebungsvariablen (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
# 2. ~/.aws/credentials Datei (default Profil)
# =============================================================================

CRED_FILE="$HOME/.aws/credentials"

# Versuche zuerst Umgebungsvariablen
ACCESS_KEY="${AWS_ACCESS_KEY_ID:-$AWS_ACCESS_KEY}"
SECRET_KEY="${AWS_SECRET_ACCESS_KEY:-$AWS_SECRET_KEY}"
SESSION_TOKEN="${AWS_SESSION_TOKEN:-}"

# Falls leer, lese aus ~/.aws/credentials
if [ -z "$ACCESS_KEY" ] && [ -f "$CRED_FILE" ]; then
  ACCESS_KEY=$(grep -A5 '^\[default\]' "$CRED_FILE" | grep 'aws_access_key_id' | cut -d'=' -f2 | tr -d ' ')
  SECRET_KEY=$(grep -A5 '^\[default\]' "$CRED_FILE" | grep 'aws_secret_access_key' | cut -d'=' -f2 | tr -d ' ')
  SESSION_TOKEN=$(grep -A5 '^\[default\]' "$CRED_FILE" | grep 'aws_session_token' | cut -d'=' -f2 | tr -d ' ')
fi

cat <<EOF
{
  "aws_access_key": "$ACCESS_KEY",
  "aws_secret_key": "$SECRET_KEY",
  "aws_session_token": "${SESSION_TOKEN:-}"
}
EOF
