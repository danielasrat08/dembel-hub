#!/usr/bin/env bash
# Restore a backup into the running database. DESTROYS current data.
# Usage: infra/scripts/restore.sh /opt/dembel-hub-backups/dembel_hub_2026-10-20_0215.sql.gz
set -euo pipefail
cd "$(dirname "$0")/../.."
FILE="${1:?Give the backup file path}"
set -a; . ./.env; set +a
read -r -p "This replaces ALL data in $POSTGRES_DB with $FILE. Type RESTORE to continue: " ok
[ "$ok" = "RESTORE" ] || { echo "Cancelled."; exit 1; }
docker compose stop api
docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB WITH (FORCE);" -c "CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;"
gunzip -c "$FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q
docker compose start api
echo "Restored from $FILE"
