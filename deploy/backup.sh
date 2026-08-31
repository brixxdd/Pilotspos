#!/usr/bin/env bash
set -euo pipefail

# Backup diario de la base de Corte POS.
# Corre en el HOST del VPS (root), junto al compose de producción.
#
#   crontab -e   →   30 4 * * * /opt/corte-pos/deploy/backup.sh >> /var/log/corte-backup.log 2>&1
#
# Los backups quedan en /opt/backups/corte-pos/, con retención por días.

COMPOSE_DIR="${COMPOSE_DIR:-/opt/corte-pos}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/corte-pos}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# POSTGRES_USER / POSTGRES_DB viven en el .env del proyecto.
set -a
# shellcheck disable=SC1091
source "$COMPOSE_DIR/.env"
set +a

FILE="$BACKUP_DIR/corte-$(date +%Y%m%d).sql.gz"

# pg_dump es consistente y no bloquea escrituras. Sale por la red interna de
# Docker (postgres no publica puerto a propósito), así que solo funciona desde
# el host que tiene acceso a la red del compose.
docker compose -f "$COMPOSE_DIR/docker-compose.prod.yml" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  | gzip -9 > "$FILE"

chmod 600 "$FILE"

# Rotación: se borran los que pasaron de KEEP_DAYS.
find "$BACKUP_DIR" -name 'corte-*.sql.gz' -type f -mtime +"$KEEP_DAYS" -delete

echo "[$(date -Is)] Backup OK: $FILE ($(du -h "$FILE" | cut -f1))"
