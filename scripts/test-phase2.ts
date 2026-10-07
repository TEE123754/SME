import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createDatabasePool,
  applyMigrations,
  seedDemo,
  fixtureId,
  fixtureBusinessId,
  demoCustomers,
  withScope,
  assertRestrictedRuntime,
  createRepositories,
} from '../packages/db/src/index.js';
import type { Pool } from '../packages/db/src/index.js';
import type { TrustedScope } from '../packages/contracts/src/index.js';
import { createApp } from '../apps/api/src/app.js';
import { readConfig } from '../apps/api/src/config.js';
import { LocalDemoIdentity, tokenHash } from '../apps/api/src/auth.js';
import { localAdminUrl, roleCredentials, connectionForRole, rootDirectory } from './database.js';

const database = `customerbuddy_phase2_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
if (!/^customerbuddy_phase2_test_\d+_[a-f0-9]{8}$/.test(database))
  throw new Error('Unsafe disposable database name');
const adminUrl = await localAdminUrl();
const admin = createDatabasePool(adminUrl);
const credentials = await roleCredentials();
let bootstrap: Pool | undefined, runtime: Pool | undefined, worker: Pool | undefined;
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
const results: { name: string; status: string; error?: string }[] = [];
async function check(name: string, operation: () => Promise<void>) {
  try {
    await operation();
    results.push({ name, status: 'passed' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({
      name,
      status: 'failed',
      error: (error as { code?: string }).code ?? (error as Error).message,
    });
    throw error;
  }
}
const sqlCode = (code: string) => (error: unknown) => (error as { code?: string }).code === code;
const first = demoCustomers[0],
  second = demoCustomers[1];
if (!first || !second) throw new Error('Missing synthetic customer fixtures');
const farah: TrustedScope = {
  businessId: fixtureBusinessId,
  customerId: first.id,
  subject: first.subject,
  role: 'customer',
};
const jason: TrustedScope = {
  businessId: fixtureBusinessId,
  customerId: second.id,
  subject: second.subject,
  role: 'customer',
};
const owner: TrustedScope = { businessId: fixtureBusinessId, subject: 'demo:owner', role: 'owner' };
try {
  await admin.query(`CREATE DATABASE ${database}`);
  const disposableAdminUrl = new URL(adminUrl);
  disposableAdminUrl.pathname = `/${database}`;
  bootstrap = createDatabasePool(disposableAdminUrl.toString());
  await bootstrap.query(`REVOKE CONNECT,TEMPORARY ON DATABASE ${database} FROM PUBLIC`);
  await bootstrap.query(`GRANT CONNECT ON DATABASE ${database} TO cb_runtime,cb_worker`);
  await check('P2-01 apply and replay migrations on empty disposable database', async () => {
    assert.equal(await applyMigrations(bootstrap!), 1);
    assert.equal(await applyMigrations(bootstrap!), 0);
  });
  await check('P2-02 idempotent synthetic seed preserves history', async () => {
    assert.equal(await seedDemo(bootstrap!), true);
    assert.equal(await seedDemo(bootstrap!), false);
    assert.equal(
      (await bootstrap!.query('SELECT count(*)::integer AS n FROM app.customers')).rows[0].n,
      10,
    );
  });
  runtime = createDatabasePool(
    connectionForRole(adminUrl, 'cb_runtime', credentials.runtime, database),
  );
  worker = createDatabasePool(
    connectionForRole(adminUrl, 'cb_worker', credentials.worker, database),
  );
  const pool = runtime;
  const repos = createRepositories(pool);
  await check('P2-03 restricted runtime rejects bootstrap connection', async () => {
    await assertRestrictedRuntime(pool);
    await assert.rejects(assertRestrictedRuntime(bootstrap!));
    const flags = (
      await bootstrap!.query(
        "SELECT rolname,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname IN ('cb_runtime','cb_worker')",
      )
    ).rows;
    assert.equal(flags.length, 2);
    for (const role of flags) {
      assert.equal(role.rolsuper, false);
      assert.equal(role.rolbypassrls, false);
      assert.equal(role.rolcreatedb, false);
      assert.equal(role.rolcreaterole, false);
    }
  });
  await check('P2-04 sensitive tables force RLS and are not runtime-owned', async () => {
    const tables = (
      await bootstrap!.query(
        "SELECT relrowsecurity,relforcerowsecurity,pg_get_userbyid(relowner) AS owner FROM pg_class WHERE relnamespace='app'::regnamespace AND relkind='r'",
      )
    ).rows;
    assert.equal(tables.length, 31);
    for (const table of tables) {
      assert.equal(table.relrowsecurity, true);
      assert.equal(table.relforcerowsecurity, true);
      assert.notEqual(table.owner, 'cb_runtime');
    }
  });
  await check('P2-05 missing context denies reads and pooled context is cleared', async () => {
    assert.equal((await pool.query('SELECT id FROM app.customers')).rowCount, 0);
    assert.equal(
      (await withScope(pool, farah, (c) => c.query('SELECT id FROM app.customers'))).rowCount,
      1,
    );
    assert.equal((await pool.query('SELECT id FROM app.customers')).rowCount, 0);
    assert.equal(
      (await withScope(pool, jason, (c) => c.query('SELECT id FROM app.customers'))).rows[0].id,
      second.id,
    );
  });
  await check('P2-06 no cross-customer order, transcript or preference reads', async () => {
    assert.equal(((await repos.orders(farah)) as { customer_id: string }[]).length, 1);
    await assert.rejects(
      repos.orders(farah, fixtureId('order-jason')),
      (e: unknown) => (e as { code: string }).code === 'NOT_FOUND',
    );
    for (const table of ['messages', 'customer_preferences', 'quotes', 'payments'])
      assert.equal(
        (
          await withScope<{ rowCount: number | null }>(pool, farah, (c) =>
            c.query(`SELECT * FROM app.${table} WHERE customer_id=$1`, [second.id]),
          )
        ).rowCount,
        0,
      );
  });
  const otherBusiness = fixtureId('other-business'),
    otherCustomer = fixtureId('other-customer');
  await bootstrap.query(
    "INSERT INTO app.businesses(id,slug,name) VALUES($1,'isolation-test','Isolation fixture')",
    [otherBusiness],
  );
  await bootstrap.query(
    "INSERT INTO app.customers(id,business_id,auth_provider,provider_subject,display_code,display_name) VALUES($1,$2,'demo','demo:other','C-001','Other synthetic customer')",
    [otherCustomer, otherBusiness],
  );
  await check('P2-07 owner and customer records cannot cross business scope', async () => {
    assert.equal(((await repos.ownerCustomers(owner)) as unknown[]).length, 10);
    await assert.rejects(
      repos.ownerCustomers(owner, otherCustomer),
      (e: unknown) => (e as { code: string }).code === 'NOT_FOUND',
    );
    const otherScope: TrustedScope = {
      businessId: otherBusiness,
      customerId: otherCustomer,
      subject: 'demo:other',
      role: 'customer',
    };
    assert.equal((await repos.me(otherScope)).profile.id, otherCustomer);
    assert.equal((await repos.catalogue(otherScope)).length, 0);
    assert.equal(
      (await withScope(pool, owner, (c) => c.query('SELECT id FROM app.businesses'))).rowCount,
      1,
    );
  });
  await check(
    'P2-08 composite foreign keys reject cross-business and cross-customer attachments',
    async () => {
      await assert.rejects(
        bootstrap!.query(
          "INSERT INTO app.conversations(id,business_id,customer_id,language) VALUES($1,$2,$3,'en')",
          [randomUUID(), fixtureBusinessId, otherCustomer],
        ),
        sqlCode('23503'),
      );
      await assert.rejects(
        bootstrap!.query(
          "INSERT INTO app.messages(id,business_id,customer_id,conversation_id,role,content) VALUES($1,$2,$3,$4,'customer','invalid synthetic link')",
          [randomUUID(), fixtureBusinessId, first.id, fixtureId('conversation-jason')],
        ),
        sqlCode('23503'),
      );
    },
  );
  await check('P2-09 RLS blocks cross-customer writes even with runtime grants', async () => {
    assert.equal(
      (
        await withScope(pool, farah, (c) =>
          c.query("UPDATE app.customers SET display_name='forged' WHERE id=$1", [second.id]),
        )
      ).rowCount,
      0,
    );
    await assert.rejects(
      withScope(pool, farah, (c) =>
        c.query(
          "INSERT INTO app.consent_events(id,business_id,customer_id,purpose,granted,source,notice_version) VALUES($1,$2,$3,'marketing',true,'customer_control','test')",
          [randomUUID(), fixtureBusinessId, second.id],
        ),
      ),
      sqlCode('42501'),
    );
  });
  await check('P2-10 bootstrap sessions and role switching are not runtime-readable', async () => {
    await assert.rejects(pool.query('SELECT * FROM app.demo_sessions'), sqlCode('42501'));
    await assert.rejects(pool.query('SET ROLE customerbuddy'), sqlCode('42501'));
    await assert.rejects(
      withScope(pool, farah, async (c) => {
        await c.query('SET LOCAL row_security=off');
        return c.query('SELECT * FROM app.customers');
      }),
      sqlCode('42501'),
    );
  });
  await check('P2-11 worker scope is distinct and cannot mutate payments', async () => {
    assert.equal(
      (
        await withScope(worker!, { ...owner, role: 'worker' }, (c) =>
          c.query('SELECT * FROM app.orders'),
        )
      ).rowCount,
      2,
    );
    assert.equal(
      (await withScope(worker!, owner, (c) => c.query('SELECT * FROM app.orders'))).rowCount,
      0,
    );
    await assert.rejects(
      withScope(worker!, { ...owner, role: 'worker' }, (c) =>
        c.query("UPDATE app.payments SET state='voided'"),
      ),
      sqlCode('42501'),
    );
  });
  await check(
    'P2-12 preference updates persist and optional deletion preserves commerce',
    async () => {
      await repos.putPreference(farah, 'packaging', 'gift');
      assert.equal(
        (await repos.preferences(farah)).find((p) => p.key === 'packaging')?.value,
        'gift',
      );
      await repos.deletePreference(farah, 'packaging');
      assert.equal(
        (await repos.preferences(farah)).some((p) => p.key === 'packaging'),
        false,
      );
      assert.equal(((await repos.orders(farah)) as unknown[]).length, 1);
    },
  );
  await check('P2-13 memory withdrawal clears preferences and blocks later writes', async () => {
    await repos.consents(farah, 'preference_memory', false);
    assert.deepEqual(await repos.preferences(farah), []);
    await assert.rejects(
      repos.putPreference(farah, 'packaging', 'gift'),
      (e: unknown) => (e as { code: string }).code === 'MEMORY_CONSENT_REQUIRED',
    );
    await assert.rejects(
      withScope(pool, farah, (c) =>
        c.query(
          'INSERT INTO app.customer_preferences(id,business_id,customer_id,key,value_json,consent_event_id) VALUES($1,$2,$3,$4,$5,$6)',
          [
            randomUUID(),
            fixtureBusinessId,
            first.id,
            'packaging',
            '"gift"',
            fixtureId('consent-farah-preference_memory'),
          ],
        ),
      ),
      sqlCode('23514'),
    );
    assert.equal(((await repos.orders(farah)) as unknown[]).length, 1);
  });
  await check('P2-14 simultaneous withdrawal and save cannot leave optional memory', async () => {
    await repos.consents(farah, 'preference_memory', true);
    const outcomes = await Promise.allSettled([
      repos.putPreference(farah, 'packaging', 'gift'),
      repos.consents(farah, 'preference_memory', false),
    ]);
    assert.equal(outcomes[1]?.status, 'fulfilled');
    assert.deepEqual(await repos.preferences(farah), []);
  });
  await check('P2-15 profile changes cannot change customer identity', async () => {
    await repos.profile(farah, { displayName: 'Farah Demo', preferredLanguage: 'en' });
    const me = await repos.me(farah);
    assert.equal(me.profile.id, first.id);
    assert.equal(me.profile.preferred_language, 'en');
    assert.equal(me.profile.display_name, 'Farah Demo');
    await assert.rejects(
      repos.profile(owner, { displayName: 'No' }),
      (e: unknown) => (e as { code: string }).code === 'CUSTOMER_ONLY',
    );
  });
  await check(
    'P2-16 published catalogue and seed capacity read authoritative records',
    async () => {
      const catalogue = await repos.catalogue(farah);
      assert.deepEqual(
        catalogue.map((p) => p.unit_price_sen).sort((a, b) => a - b),
        [4800, 7800],
      );
      assert.equal((await repos.pickupOptions(farah)).slots.length, 2);
      assert.deepEqual(
        (await repos.capacity(farah, '2026-10-10')).map((p) => p.available_units),
        [10, 8],
      );
      const draft = fixtureId('draft-knowledge');
      await bootstrap!.query(
        "INSERT INTO app.knowledge_versions(id,business_id,version_number,state,policy_json,created_by) VALUES($1,$2,2,'draft','{}','demo:owner')",
        [draft, fixtureBusinessId],
      );
      assert.equal(
        (await withScope(pool, farah, (c) => c.query('SELECT id FROM app.knowledge_versions')))
          .rowCount,
        1,
      );
      assert.equal(
        (await withScope(pool, owner, (c) => c.query('SELECT id FROM app.knowledge_versions')))
          .rowCount,
        2,
      );
    },
  );
  const config = readConfig();
  server = createApp(config, pool).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing local test port');
  const base = `http://127.0.0.1:${address.port}/api/v1`,
    origin = config.allowedOrigins[0]!;
  async function signIn(accountKey: string) {
    const response = await fetch(`${base}/demo/sessions`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountKey }),
    });
    assert.equal(response.status, 201);
    const value = (await response.json()) as { csrfToken: string };
    const cookie = response.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    return { cookie: cookie.split(';')[0]!, csrf: value.csrfToken };
  }
  const session = await signIn('farah'),
    ownerSession = await signIn('owner');
  const mutationHeaders = {
    Cookie: session.cookie,
    Origin: origin,
    'Content-Type': 'application/json',
    'X-CSRF-Token': session.csrf,
  };
  await check('P2-17 local selector lists known synthetic accounts only', async () => {
    const response = await fetch(`${base}/demo/accounts`);
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { accounts: unknown[] }).accounts.length, 11);
    const forged = await fetch(`${base}/demo/sessions`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountKey: 'farah', role: 'owner', customerId: second.id }),
    });
    assert.equal(forged.status, 400);
  });
  await check(
    'P2-18 session identity survives a new adapter; forged text/header IDs ignored',
    async () => {
      const response = await fetch(`${base}/me`, {
        headers: { Cookie: session.cookie, 'X-Customer-Id': second.id },
      });
      assert.equal(response.status, 200);
      assert.equal(((await response.json()) as { profile: { id: string } }).profile.id, first.id);
      const token = session.cookie.split('=')[1]!;
      assert.equal((await new LocalDemoIdentity(pool).resolveSession(token))?.customerId, first.id);
      assert.equal((await fetch(`${base}/me`)).status, 401);
      assert.equal(
        (await fetch(`${base}/me`, { headers: { Cookie: 'cb_session=forged' } })).status,
        401,
      );
    },
  );
  await check('P2-19 customer cannot read owner list or another customer order', async () => {
    assert.equal(
      (await fetch(`${base}/owner/customers`, { headers: { Cookie: session.cookie } })).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/orders/${fixtureId('order-jason')}`, {
          headers: { Cookie: session.cookie },
        })
      ).status,
      404,
    );
    const response = await fetch(`${base}/owner/customers`, {
      headers: { Cookie: ownerSession.cookie },
    });
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { customers: unknown[] }).customers.length, 10);
  });
  await check('P2-20 profile write needs exact origin and session-bound CSRF', async () => {
    const body = JSON.stringify({ preferredLanguage: 'bm' });
    assert.equal(
      (
        await fetch(`${base}/me`, {
          method: 'PATCH',
          headers: { Cookie: session.cookie, 'Content-Type': 'application/json' },
          body,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/me`, {
          method: 'PATCH',
          headers: { Cookie: session.cookie, Origin: origin, 'Content-Type': 'application/json' },
          body,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/me`, {
          method: 'PATCH',
          headers: mutationHeaders,
          body: JSON.stringify({ preferredLanguage: 'bm', customerId: second.id }),
        })
      ).status,
      400,
    );
    assert.equal(
      (await fetch(`${base}/me`, { method: 'PATCH', headers: mutationHeaders, body })).status,
      200,
    );
  });
  await check(
    'P2-21 API consent defaults, withdrawal and optional values are controlled',
    async () => {
      const newSession = await signIn('mei');
      const meResponse = await fetch(`${base}/me`, { headers: { Cookie: newSession.cookie } });
      const me = (await meResponse.json()) as { consents: Record<string, boolean> };
      assert.equal(me.consents.marketing, false);
      assert.equal(me.consents.preference_memory, false);
      assert.equal(
        (
          await fetch(`${base}/me/preferences`, {
            method: 'PATCH',
            headers: mutationHeaders,
            body: JSON.stringify({ key: 'health_condition', value: 'sensitive' }),
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await fetch(`${base}/me/preferences`, {
            method: 'PATCH',
            headers: mutationHeaders,
            body: JSON.stringify({ key: 'packaging', value: 'gift' }),
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await fetch(`${base}/me/consents`, {
            method: 'POST',
            headers: mutationHeaders,
            body: JSON.stringify({ purpose: 'preference_memory', granted: true }),
          })
        ).status,
        201,
      );
      assert.equal(
        (
          await fetch(`${base}/me/preferences`, {
            method: 'PATCH',
            headers: mutationHeaders,
            body: JSON.stringify({ key: 'packaging', value: 'gift' }),
          })
        ).status,
        200,
      );
    },
  );
  await check('P2-22 unknown, disabled and expired sessions do not authenticate', async () => {
    const missing = await fetch(`${base}/demo/sessions`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountKey: 'unknown' }),
    });
    assert.equal(missing.status, 404);
    await bootstrap!.query("UPDATE app.customers SET status='disabled' WHERE id=$1", [second.id]);
    assert.equal(await new LocalDemoIdentity(pool).signIn('jason'), null);
    const expired = randomBytes(32).toString('base64url');
    await bootstrap!.query(
      "INSERT INTO app.demo_sessions(token_hash,account_key,csrf_hash,created_at,expires_at) VALUES($1,'farah',$2,clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour')",
      [tokenHash(expired), tokenHash('expired-csrf')],
    );
    assert.equal(await new LocalDemoIdentity(pool).resolveSession(expired), null);
  });
  await check('P2-23 logout revokes persisted sessions', async () => {
    assert.equal(
      (await fetch(`${base}/demo/sessions`, { method: 'DELETE', headers: mutationHeaders })).status,
      204,
    );
    assert.equal((await fetch(`${base}/me`, { headers: { Cookie: session.cookie } })).status, 401);
  });
  await check(
    'P2-24 customer context stays empty after failures and audit stays append-only',
    async () => {
      assert.equal((await pool.query('SELECT * FROM app.orders')).rowCount, 0);
      await assert.rejects(
        withScope(pool, owner, (c) => c.query('DELETE FROM app.audit_events')),
        sqlCode('42501'),
      );
      const audit = (
        await withScope(pool, owner, (c) =>
          c.query('SELECT safe_details_json FROM app.audit_events'),
        )
      ).rows;
      assert.ok(audit.length > 0);
      assert.ok(audit.every((row) => !JSON.stringify(row.safe_details_json).includes('csrf')));
    },
  );
} finally {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  await Promise.all([runtime?.end(), worker?.end(), bootstrap?.end()]);
  // Drop only the exact disposable database created by this process, never the demo database.
  await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.end();
  await mkdir(resolve(rootDirectory, 'docs/evidence'), { recursive: true });
  await writeFile(
    resolve(rootDirectory, 'docs/evidence/phase2-integration.json'),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        phase: 2,
        implementation: 'Codex local scripted reference',
        disposableDatabaseRemoved: true,
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
console.log(
  `Phase 2 integration gate passed: ${results.length} cases; disposable database removed.`,
);
