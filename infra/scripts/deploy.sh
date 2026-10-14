#!/usr/bin/env bash
# Pull the latest code and restart the stack. Run from /opt/dembel-hub.
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f .env ] || { echo "Missing .env — copy .env.example to .env and fill it in."; exit 1; }

git pull --ff-only
export APP_VERSION="$(git rev-parse --short HEAD)"
docker compose build
docker compose up -d
echo "==> Waiting for the API…"
for i in $(seq 1 30); do
  if docker compose exec -T api node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "API healthy (version $APP_VERSION)"; docker image prune -f >/dev/null; exit 0
  fi
  sleep 3
done
echo "API did not become healthy. Check: docker compose logs api --tail 100"; exit 1
