/** Applies pending SQL migrations from src/db/migrations (copied next to dist in production). */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './client';

async function run() {
  const { db, pool } = createDb();
  const candidates = [path.join(__dirname, 'migrations'), path.join(__dirname, '../../src/db/migrations')];
  const migrationsFolder = candidates.find((p) => existsSync(path.join(p, 'meta/_journal.json')));
  if (!migrationsFolder) throw new Error('Migrations folder not found');
  await migrate(db, { migrationsFolder });
  console.log(`Migrations applied from ${migrationsFolder}`);
  await pool.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
