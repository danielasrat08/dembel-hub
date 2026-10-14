# Dembel Performance Hub

Reporting, verification and analytics web app (installable PWA) for **Temer Real Estate · Dembel Branch**.
Replaces the daily Telegram texts, the five team trackers and the Friday report templates.

Design: see the approved blueprint (v0.3) and `docs/DECISIONS.md`.

## Status — Phase 0 (foundation)

| Part | State |
|---|---|
| Repository layout, workspaces, CI | Done |
| Database schema (21 tables, Phase 1 scope) + first SQL migration | Done |
| Seed: branch, 5 teams, 47 staff with IDs, 17 metrics + OKR targets, sites, property types, lead origins | Done |
| API (NestJS 11) with `/api/health` reading the database | Done |
| Web PWA (Next.js 16) shell: EN/አማ labels, manifest, service worker, live status card | Done |
| Docker Compose stack (Postgres, Redis, API, Web, Caddy HTTPS) | Done |
| Test-server scripts: bootstrap, deploy, backup, restore | Done |

Phase 1 starts with sign-in, staff IDs and the Office Admin console.

## Layout

```
apps/
  api/                 NestJS 11 + Drizzle ORM (PostgreSQL 16)
    src/db/schema.ts   ← the data model (single source of truth)
    src/db/migrations/ ← generated SQL migrations (committed)
    src/db/seed.ts     ← reference data from the team trackers / IPMS / OKR
  web/                 Next.js 16 PWA (React 19)
infra/
  Caddyfile            HTTPS + routing (/api → api, everything else → web)
  scripts/             server-bootstrap.sh, deploy.sh, backup.sh, restore.sh
docs/
  HOSTING_RENDER.md    Free test hosting on Render + Neon (no card)
  SERVER_SETUP.md      Own server / Oracle Cloud with Docker Compose
  DEVELOPMENT.md       Run it on a laptop
  DECISIONS.md         Why things are the way they are
docker-compose.yml     Whole stack on one server
```

## Free test hosting (no card)

Render + Neon, set up from `render.yaml` in a few clicks: see `docs/HOSTING_RENDER.md`.

## Quick start (own server)

```bash
cp .env.example .env        # fill in passwords and APP_DOMAIN
docker compose up -d --build
docker compose run --rm -e SEED_ADMIN_PASSWORD='temporary-pass' api node dist/db/seed.js
curl https://<your-domain>/api/health
```

Full guide: `docs/SERVER_SETUP.md`.
