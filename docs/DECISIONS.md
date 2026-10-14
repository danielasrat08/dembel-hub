# Decision log

| # | Date | Decision | Why |
|---|---|---|---|
| 1 | 13 Oct 2026 | Web app as a **PWA**, no app store | Installs from the browser, one codebase for phone and desktop. |
| 2 | 13 Oct 2026 | **Free international hosting** for testing | No cost while piloting. See #15 for the provider. |
| 3 | 13 Oct 2026 | **Separate from ODOO** in phases 1–2 | Staff enter totals plus the few itemized records that need verification. |
| 4 | 13 Oct 2026 | Qualified = **all four BTAP** met; Reachable and Project match optional | Branch Manager decision, 2nd review. |
| 5 | 13 Oct 2026 | Each **visit** (office/site) and each **closed deal** verified individually; proof optional | Visits are often done with the supervisor. |
| 6 | 13 Oct 2026 | Paid amount stored in **ETB only**; no percentage or balance | 2nd review. |
| 7 | 13 Oct 2026 | Telemarketer commission eligible only for **Telemarketer calling** and **Digital Marketing team** origins | Rep own social media counts as personal prospecting. Stored as a flag on `lead_origins`, editable by Office Admin. |
| 8 | 13 Oct 2026 | Exports: weekly **HQ report** and per-deal **commission letter** to Excel / Google Sheets / PDF, on HQ's templates | 2nd review. Templates still to be supplied. |
| 9 | 13 Oct 2026 | English + Amharic **interface labels** only | Data entered is not translated. |
| 10 | 13 Oct 2026 | **Branch-aware** data model | Every business table has `branch_id`. |
| 11 | 13 Oct 2026 | **Drizzle ORM** instead of Prisma | Prisma needs native engine binaries downloaded at build time (failed in our build environment, and adds risk on ARM). Drizzle is pure TypeScript; migrations are plain SQL files in the repo. |
| 12 | 13 Oct 2026 | Visit proof files on a **Docker volume** for the test server | Fewer moving parts. Switch to S3-compatible storage for production via env vars. |
| 15 | 14 Oct 2026 | Test hosting moved to **Render (app) + Neon (Postgres)** | Oracle sign-up wasn't possible. Both are free without a card. Free Render services sleep after 15 min idle; acceptable for the pilot. Docker Compose setup kept for a later own server. |
| 14 | 14 Oct 2026 | Personal data (staff names) kept out of the repository | The repository may be public; names live only on the server. |
| 13 | 13 Oct 2026 | **NestJS 11, Next.js 16, React 19, PostgreSQL 16** | Current patched releases; `npm audit` reports 0 vulnerabilities at Phase 0. |

## Data cleanups made while importing the team trackers
- The Sales Manager is listed in every team's Reps sheet; imported once as **Sales Manager**, not as a team member.
- One rep in Team KFL had status "Active" with a deactivation date of 14 Aug 2026; imported as **Deactivated** from that date.
- One rep in Team BLY imported as Deactivated on 14 Aug 2026.
- **Staff names are not stored in git.** The real roster is `apps/api/src/db/seed/staff.private.json` on the server (git-ignored, or set `STAFF_SEED_FILE`). The repository only has an anonymised example so CI and development work.
- Sites seeded from the launch memos: CIT-SAR5 Phase II, City Plus Sarbet, Seken Diaspora DIA-SEK1 — **please confirm the full list** (the Office Admin can edit it).
- Office Admin and Branch Manager accounts are created with placeholder names; set the real names on first login.

## Open items
- HQ weekly report template and a sample commission request letter (needed by Phase 1, week 4).
- DLP campaign leads: currently **not** eligible for telemarketer commission.
- Google account that will own exported Sheets.
- Telemarketer names and staff, digital/media team members to add in the Office Admin console.
