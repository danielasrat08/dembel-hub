/**
 * Startup helper for hosts without a shell (Render free plan):
 * seeds the database once, only if it has no branch yet and SEED_ADMIN_PASSWORD is set.
 */
import { count } from 'drizzle-orm';
import { createDb } from './client';
import { branches } from './schema';
import { runSeed } from './seed';

async function run() {
  const { db, pool } = createDb();
  const [{ n }] = await db.select({ n: count() }).from(branches);
  await pool.end();
  if (n > 0) return console.log('Database already seeded; skipping.');
  if (!process.env.SEED_ADMIN_PASSWORD) return console.log('Empty database but SEED_ADMIN_PASSWORD not set; skipping seed.');
  await runSeed();
}
run().catch((e) => { console.error(e); process.exit(1); });
