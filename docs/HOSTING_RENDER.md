# Free test hosting — Render + Neon (no payment card)

About 20 minutes. You need a GitHub sign-in only.

| Part | Service | Free plan (checked Oct 2026) |
|---|---|---|
| Database | **Neon** Postgres | Permanent free plan, no card. 0.5–1 GB storage per project is far more than the Hub needs. Pauses after 5 min idle, wakes in about a second. |
| API + web app | **Render** | Free web services, no card. 512 MB RAM. **Sleep after 15 min without visitors**; the first visit after that takes about a minute. |

Fine for testing and the pilot. For daily use by the whole branch, move to a paid plan (~US$7 per service per month on Render) or a company server, so it doesn't sleep.

## 1. Create the database (Neon)
1. Go to neon.com → **Sign up with GitHub**.
2. Create a project: name `dembel-hub`, Postgres 16, region **AWS Europe (Frankfurt)**.
3. On the project dashboard click **Connect** and copy the connection string. It looks like
   `postgresql://neondb_owner:…@ep-…eu-central-1.aws.neon.tech/neondb?sslmode=require`
   Keep it private — it's the database password.

## 2. Deploy the app (Render)
1. Go to render.com → **Get started** → **Sign up with GitHub** (as danielasrat08) and allow access to the `dembel-hub` repository.
2. Click **New → Blueprint**, pick `danielasrat08/dembel-hub`. Render reads `render.yaml` and shows two services: `dembel-api` and `dembel-web`.
3. Fill in the values it asks for:
   - `DATABASE_URL` — the Neon connection string from step 1
   - `SEED_ADMIN_PASSWORD` — a temporary password for the first Office Admin login (10+ characters)
   - `STAFF_SEED_B64` — paste the contents of the roster file Claude sent you (`staff-roster-b64.txt`)
   - `SEED_SALES_MANAGER_NAME` — the Sales Manager's full name
4. Click **Apply**. The first build takes 5–10 minutes.

On first start the API creates the tables and loads the branch, teams, staff IDs and targets automatically. On later starts it skips that.

## 3. Check it
Open the `dembel-web` address Render shows (e.g. `https://dembel-web.onrender.com`) on a phone.
The status card should show **Server** and **Database** online, **5 teams**, **45 active staff**.

## Afterwards
- Every push to `main` on GitHub redeploys automatically.
- Logs: Render dashboard → service → **Logs**.
- Backups: Neon keeps a short restore history on the free plan; the Office Admin can also export data from the app (Phase 1).
