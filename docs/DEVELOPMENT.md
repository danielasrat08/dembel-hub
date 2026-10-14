# Local development

Requirements: Node 20+, PostgreSQL 16 (or Docker).

```bash
npm install
# Database (Docker):
docker run -d --name dembel-pg -e POSTGRES_USER=dembel -e POSTGRES_PASSWORD=localdev -e POSTGRES_DB=dembel_hub -p 5432:5432 postgres:16-alpine
export DATABASE_URL=postgresql://dembel:localdev@localhost:5432/dembel_hub
export SEED_ADMIN_PASSWORD=local-temp-pass

npm run db:migrate:dev -w apps/api
npm run db:seed -w apps/api
npm run dev:api            # http://localhost:4000/api/health
npm run dev:web            # http://localhost:3000 (proxies /api to :4000)
```

## Changing the database
1. Edit `apps/api/src/db/schema.ts`.
2. `npm run db:generate -w apps/api -- --name short_description` writes a new SQL file in `src/db/migrations/`.
3. Read the SQL, commit both files. Servers apply it automatically on the next deploy.

CI fails if `schema.ts` and the migrations disagree.
