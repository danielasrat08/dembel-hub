#!/usr/bin/env bash
# Nightly PostgreSQL backup, keeps 14 days. Add to cron:
#   15 2 * * * /opt/dembel-hub/infra/scripts/backup.sh >> /opt/dembel-hub-backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a
OUT=/opt/dembel-hub-backups/dembel_hub_$(date +%Y-%m-%d_%H%M).sql.gz
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip > "$OUT"
find /opt/dembel-hub-backups -name 'dembel_hub_*.sql.gz' -mtime +14 -delete
echo "$(date -Is) backup written: $OUT ($(du -h "$OUT" | cut -f1))"
# Copy off the server too (e.g. rclone to Google Drive) — set up in Phase 1.
