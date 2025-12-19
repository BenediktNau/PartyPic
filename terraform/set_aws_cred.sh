#!/usr/bin/env bash
set -euo pipefail


TARGET_FILE="${TARGET_FILE:-$HOME/.aws/credentials}"


INPUT="$(cat)"

if [[ -z "$INPUT" ]]; then
  echo "ERROR: Keine Eingabe erhalten" >&2
  exit 1
fi


mkdir -p "$(dirname "$TARGET_FILE")"


: > "$TARGET_FILE"


printf '%s\n' "$INPUT" > "$TARGET_FILE"

LINE2="$(printf '%s\n' "$INPUT" | sed -n '2p')"
LINE3="$(printf '%s\n' "$INPUT" | sed -n '3p')"
LINE4="$(printf '%s\n' "$INPUT" | sed -n '4p')"


export AWS_ACCESS_KEY="${LINE2#*=}"
export AWS_SECRET_KEY="${LINE3#*=}"
export AWS_SESSION_TOKEN="${LINE4#*=}"


if [[ -z "$AWS_ACCESS_KEY" || -z "$AWS_SECRET_KEY" || -z "$AWS_SESSION_TOKEN" ]]; then
  echo "ERROR: Eine oder mehrere Variablen konnten nicht extrahiert werden" >&2
  exit 1
fi

echo "Exportierte Variablen:"
echo "VAR_LINE2=$AWS_ACCESS_KEY"
echo "VAR_LINE3=$AWS_SECRET_KEY"
echo "VAR_LINE4=$AWS_SESSION_TOKEN"
