/**
 * End-to-end tests for sign-in and the Office Admin API, against a real (seeded) PostgreSQL.
 * Run: DATABASE_URL=... npm test -w apps/api   (after db:migrate and db:seed)
 */
import 'reflect-metadata';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { createDb } from '../src/db/client';
import { staff } from '../src/db/schema';
import { hashPassword } from '../src/auth/passwords';

let app: INestApplication;
let base = '';
const ADMIN = 'TMR-DMB-OA-0001';
const ADMIN_TEMP = 'Test-Temp-Pass-1';
const ADMIN_NEW = 'AdminTest2026';
const uniq = Date.now().toString().slice(-6);

/** Tiny cookie-keeping client, one per "browser". */
function client() {
  let cookie = '';
  return async (path: string, opts: { method?: string; body?: unknown; raw?: string } = {}) => {
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    let body: string | undefined;
    if (opts.body !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(opts.body); }
    if (opts.raw !== undefined) { headers['content-type'] = 'application/x-www-form-urlencoded'; body = opts.raw; }
    const res = await fetch(base + path, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
  };
}

before(async () => {
  // Reset the seeded admin to a known temporary password so the test is repeatable.
  const { db, pool } = createDb();
  await db.update(staff).set({ passwordHash: await hashPassword(ADMIN_TEMP), mustChangePassword: true, status: 'ACTIVE' }).where(eq(staff.staffCode, ADMIN));
  await pool.end();
  app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  await app.listen(0);
  base = (await app.getUrl()).replace('[::1]', 'localhost') + '/api';
});
after(async () => { await app?.close(); });

describe('sign-in', () => {
  const admin = client();

  test('health is public and reads the database', async () => {
    const r = await client()('/health');
    assert.equal(r.status, 200);
    assert.equal(r.json.database.teams, 5);
  });

  test('protected routes need a session', async () => {
    assert.equal((await client()('/auth/me')).status, 401);
    assert.equal((await client()('/admin/staff')).status, 401);
  });

  test('wrong password and unknown ID give the same message', async () => {
    const a = await client()('/auth/login', { body: { login: ADMIN, password: 'nope' } });
    const b = await client()('/auth/login', { body: { login: 'TMR-DMB-SR-9999', password: 'nope' } });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.json.message, b.json.message);
  });

  test('temporary password forces a change before anything else', async () => {
    const r = await admin('/auth/login', { body: { login: ADMIN.toLowerCase(), password: ADMIN_TEMP } });
    assert.equal(r.status, 200);
    assert.equal(r.json.mustChangePassword, true);
    const blocked = await admin('/admin/staff');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.code, 'PASSWORD_CHANGE_REQUIRED');
    assert.equal((await admin('/auth/me')).status, 200);
  });

  test('weak passwords are refused', async () => {
    for (const pw of ['short1', 'onlyletters', '12345678901', `x${ADMIN}9`]) {
      const r = await admin('/auth/change-password', { body: { currentPassword: ADMIN_TEMP, newPassword: pw } });
      assert.equal(r.status, 400, pw);
    }
  });

  test('changing the password unlocks the account', async () => {
    const r = await admin('/auth/change-password', { body: { currentPassword: ADMIN_TEMP, newPassword: ADMIN_NEW } });
    assert.equal(r.status, 200);
    const me = await admin('/auth/me');
    assert.equal(me.json.mustChangePassword, false);
    assert.equal(me.json.role, 'OA');
    assert.equal((await admin('/admin/staff')).status, 200);
  });

  test('form posts are rejected (CSRF guard)', async () => {
    assert.equal((await admin('/admin/staff', { raw: 'fullName=x' })).status, 403);
  });

  describe('office admin', () => {
    let repId = '';
    let repPw = '';
    const rep = client();

    test('creates a rep with the next staff ID and a temporary password', async () => {
      const teams = await admin('/admin/teams');
      const kfl = teams.json.find((t: any) => t.code === 'DMB-T-KFL');
      const before = kfl.activeReps;
      const r = await admin('/admin/staff', { body: { fullName: `Test Rep ${uniq}`, phone: `09${uniq}11`.slice(0, 10), role: 'SR', teamId: kfl.id } });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      assert.match(r.json.staffCode, /^TMR-DMB-SR-\d{4}$/);
      assert.equal(r.json.tempPassword.length, 10);
      repId = r.json.id; repPw = r.json.tempPassword;
      const after = (await admin('/admin/teams')).json.find((t: any) => t.code === 'DMB-T-KFL');
      assert.equal(after.activeReps, before + 1);
    });

    test('rejects an invalid phone number', async () => {
      const r = await admin('/admin/staff', { body: { fullName: 'Bad Phone', phone: '12345', role: 'SR' } });
      assert.equal(r.status, 400);
    });

    test('rep signs in with phone number and cannot open admin screens', async () => {
      const login = await rep('/auth/login', { body: { login: `+251 ${`09${uniq}11`.slice(1, 10)}`, password: repPw } });
      assert.equal(login.status, 200, JSON.stringify(login.json));
      assert.equal((await rep('/auth/change-password', { body: { currentPassword: repPw, newPassword: 'RepTest2026' } })).status, 200);
      const me = await rep('/auth/me');
      assert.equal(me.json.team.code, 'DMB-T-KFL');
      assert.equal((await rep('/admin/staff')).status, 403);
      assert.equal((await rep('/admin/lists')).status, 200, 'everyone can read dropdown lists');
      assert.equal((await rep('/admin/lists/sites', { body: { name: 'Nope' } })).status, 403);
    });

    test('deactivating a rep signs them out immediately', async () => {
      assert.equal((await admin(`/admin/staff/${repId}/deactivate`, { body: {} })).status, 200);
      assert.equal((await rep('/auth/me')).status, 401);
      const again = await client()('/auth/login', { body: { login: 'x', password: 'y' } });
      assert.equal(again.status, 400); // too short login → validation
    });

    test('admin cannot deactivate their own account', async () => {
      const me = await admin('/auth/me');
      assert.equal((await admin(`/admin/staff/${me.json.id}/deactivate`, { body: {} })).status, 400);
    });

    test('lists: add a site and mark a lead origin', async () => {
      const name = `Test Site ${uniq}`;
      const r = await admin('/admin/lists/sites', { body: { name } });
      assert.equal(r.status, 201);
      assert.equal((await admin('/admin/lists/sites', { body: { name } })).status, 409);
      const lists = await admin('/admin/lists');
      const eligible = lists.json.leadOrigins.filter((o: any) => o.tmCommissionEligible).map((o: any) => o.name).sort();
      assert.deepEqual(eligible, ['Digital Marketing team', 'Telemarketer calling']);
    });

    test('sign out ends the session', async () => {
      assert.equal((await admin('/auth/logout', { method: 'POST' })).status, 200);
      assert.equal((await admin('/auth/me')).status, 401);
    });
  });
});
