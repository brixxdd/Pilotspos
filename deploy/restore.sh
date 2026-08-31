#!/usr/bin/env bash
set -euo pipefail

# Restaura un backup de Corte POS en el MISMO VPS (sobrescribe la BD actual).
# Uso:  /opt/corte-pos/deploy/restore.sh /opt/backups/corte-pos/corte-20260830.sql.gz
#
# 1. Detiene la API (corta escrituras) pero deja Postgres arriba.
# 2. Vuelca el backup dentro de la BD.
# 3. Vuelve a arrancar la API.

COMPOSE_DIR="${COMPOSE_DIR:-/opt/corte-pos}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <archivo.sql.gz>" >&2
  exit 1
fi
if [ ! -f "$BACKUP_FILE" ]; then
  echo "El archivo no existe: $BACKUP_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$COMPOSE_DIR/.env"
set +a

echo "Deteniendo la API…"
docker compose -f "$COMPOSE_DIR/docker-compose.prod.yml" stop api

echo "Restaurando $BACKUP_FILE…"
gzip -dc "$BACKUP_FILE" | docker compose -f "$COMPOSE_DIR/docker-compose.prod.yml" exec -T postgres \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -v ON_ERROR_STOP=1

echo "Arrancando la API…"
docker compose -f "$COMPOSE_DIR/docker-compose.prod.yml" start api

echo "Restaurado desde $BACKUP_FILE"
