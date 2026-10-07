import { resolve, relative } from 'node:path';
import { createApp } from '../apps/api/src/app.js';
import { readConfig, workspaceRoot } from '../apps/api/src/config.js';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import {
  createDatabasePool,
  applyMigrations,
  seedDemo,
  fixtureBusinessId,
  demoCustomers,
  createCommerce,
  createRepositories,
  withScope,
} from '../packages/db/src/index.js';
import { localAdminUrl, roleCredentials, connectionForRole } from './database.js';
import { createJobs } from '../apps/api/src/jobs.js';
import { createScripted } from '../apps/api/src/scripted.js';
import { matchIntent } from '../packages/demo-assistant/src/index.js';
import type { TrustedScope } from '../packages/contracts/src/index.js';
const name = `customerbuddy_phase5_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
const url = await localAdminUrl(),
  admin = createDatabasePool(url),
  creds = await roleCredentials();
await admin.query(`CREATE DATABASE ${name}`);
const u = new URL(url);
u.pathname = '/' + name;
const bootstrap = createDatabasePool(u.toString()),
  runtime = createDatabasePool(connectionForRole(url, 'cb_runtime', creds.runtime, name)),
  worker = createDatabasePool(connectionForRole(url, 'cb_worker', creds.worker, name));
const documentRoot = resolve(workspaceRoot, '.local', name);
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
const from = Number(process.argv[2] ?? 1);
const only = process.argv[3] ? Number(process.argv[3]) : null;
const previous =
  from > 1 || only !== null
    ? JSON.parse(await readFile('docs/evidence/phase5-integration.json', 'utf8')).results
    : [];
const results: { id: string; status: string; error?: string }[] = [],
  bytes = new Map<string, Uint8Array>();
const storage = {
  async put(key: string, content: Uint8Array) {
    bytes.set(key, content);
  },
  async read(key: string) {
    const b = bytes.get(key);
    if (!b) throw new Error('missing');
    return b;
  },
};
const owner: TrustedScope = { businessId: fixtureBusinessId, role: 'owner', subject: 'demo:owner' },
  farah: TrustedScope = {
    businessId: fixtureBusinessId,
    customerId: demoCustomers[0]!.id,
    role: 'customer',
    subject: demoCustomers[0]!.subject,
  },
  jason: TrustedScope = {
    businessId: fixtureBusinessId,
    customerId: demoCustomers[1]!.id,
    role: 'customer',
    subject: demoCustomers[1]!.subject,
  },
  work: TrustedScope = { businessId: fixtureBusinessId, role: 'worker', subject: 'test:worker' };
const commerce = createCommerce(runtime),
  repos = createRepositories(runtime),
  assistant = createScripted(runtime),
  jobs = createJobs(worker, storage),
  ownerJobs = createJobs(runtime, storage);
async function check(id: string, fn: () => Promise<void>) {
  if (
    Number(id.match(/^P5-(\d+)/)?.[1]) < from ||
    (only !== null && Number(id.match(/^P5-(\d+)/)?.[1]) !== only)
  ) {
    const old = previous.find((r: { id: string }) => r.id === id);
    if (old) results.push(old);
    return;
  }
  try {
    await fn();
    results.push({ id, status: 'passed' });
    console.log('PASS ' + id);
  } catch (e) {
    results.push({ id, status: 'failed', error: (e as Error).message });
    console.error('Scenario failed:', id, (e as Error).message);
    throw e;
  }
}
async function order(s = farah) {
  const q = await commerce.quote(
    s,
    {
      items: [{ sku: 'brownie-tray', quantity: 1 }],
      pickupDate: '2026-10-10',
      pickupSlotCode: 'midday',
    },
    randomUUID(),
  );
  const ch = await commerce.challenge(s, q.id, q.proposalHash, randomUUID());
  return commerce.confirm(
    s,
    { quoteId: q.id, proposalHash: q.proposalHash, challengeToken: ch.challengeToken },
    randomUUID(),
  );
}
try {
  await bootstrap.query(`REVOKE CONNECT,TEMPORARY ON DATABASE ${name} FROM PUBLIC`);
  await bootstrap.query(`GRANT CONNECT ON DATABASE ${name} TO cb_runtime,cb_worker`);
  await applyMigrations(bootstrap);
  await seedDemo(bootstrap);
  await check('P5-01 allowlisted BM/EN/mixed routing and authority fallback', async () => {
    for (const [text, intent] of [
      ['menu please', 'catalogue'],
      ['harga produk', 'catalogue'],
      ['pickup', 'faq'],
      ['pesan lagi', 'repeat_order'],
      ['order status', 'order_status'],
      ['ingat kegemaran', 'preference_proposal'],
      ['preferences', 'preference_proposal'],
      ['pemilik help', 'human_handoff'],
      ['quote Saturday', 'prepare_quote'],
      ['approve payment', 'unknown'],
      ['unrecognised xyz', 'unknown'],
    ])
      assert.equal(matchIntent(text!), intent);
  });
  const conv = await commerce.conversation(farah, 'bm', randomUUID());
  await check(
    'P5-02 scoped persisted response uses published prices and deduplicates',
    async () => {
      const m = await commerce.message(farah, conv.id, 'menu', randomUUID());
      const first = await assistant.respond(farah, conv.id, m.id);
      assert.equal(first.intent, 'catalogue');
      assert.match(first.reply, /Produk/);
      assert.match(first.reply, /78.00/);
      await assistant.respond(farah, conv.id, m.id);
      assert.equal((await commerce.messages(farah, conv.id)).length, 2);
      await assert.rejects(() => assistant.respond(jason, conv.id, m.id));
      await assert.rejects(() => assistant.respond(owner, conv.id, m.id));
      await repos.profile(farah, { displayName: 'Farah', preferredLanguage: 'en' });
      const newer = await commerce.message(farah, conv.id, 'menu', randomUUID());
      const switched = await assistant.respond(farah, conv.id, newer.id);
      assert.match(switched.reply, /Current published/);
      await repos.profile(farah, { displayName: 'Farah', preferredLanguage: 'bm' });
    },
  );
  await check('P5-03 unknown/quote/preference intents never confirm or write memory', async () => {
    const before = ((await repos.orders(farah)) as unknown[]).length;
    const preferences = await repos.preferences(farah);
    for (const text of ['approve payment', 'quote Saturday', 'remember brownie']) {
      const m = await commerce.message(farah, conv.id, text, randomUUID());
      await assistant.respond(farah, conv.id, m.id);
    }
    assert.equal(((await repos.orders(farah)) as unknown[]).length, before);
    assert.deepEqual(await repos.preferences(farah), preferences);
  });
  await check('P5-04 handoff pauses dispatch until explicit owner resume', async () => {
    const m = await commerce.message(farah, conv.id, 'pemilik', randomUUID());
    await assistant.respond(farah, conv.id, m.id);
    const m2 = await commerce.message(farah, conv.id, 'menu', randomUUID());
    assert.equal((await assistant.respond(farah, conv.id, m2.id)).intent, 'paused');
    await commerce.takeover(owner, conv.id, false, randomUUID());
    assert.equal((await assistant.respond(farah, conv.id, m2.id)).intent, 'catalogue');
  });
  const firstOrder = await order();
  await check('P5-05 worker generates unique snapshot PDFs and order summaries', async () => {
    await jobs.run(work);
    await jobs.run(work);
    const d = await withScope(
      runtime,
      farah,
      async (c) =>
        (await c.query('SELECT * FROM app.documents WHERE order_id=$1', [firstOrder.id])).rows,
    );
    assert.equal(d.length, 2);
    assert.ok(d.every((x) => x.state === 'available'));
    const quoteJobs = (await ownerJobs.status(owner)).jobs.filter(
      (j) => j.kind === 'quote_document',
    );
    assert.ok(quoteJobs.length && quoteJobs.every((j) => j.state === 'completed'));
    for (const x of d)
      assert.equal(
        Buffer.from(await storage.read(x.storage_key))
          .subarray(0, 4)
          .toString(),
        '%PDF',
      );
  });
  await commerce.verifyPayment(
    owner,
    { orderId: firstOrder.id, amountSen: 3900, reference: 'SYNTHETIC-P5-DEPOSIT' },
    randomUUID(),
  );
  await check('P5-06 receipt binds verified payment and ledger totals', async () => {
    await jobs.run(work);
    const d = await withScope(
      runtime,
      farah,
      async (c) =>
        (
          await c.query(
            "SELECT d.*,p.amount_sen FROM app.documents d JOIN app.payments p ON p.id=d.payment_id WHERE d.order_id=$1 AND d.kind='receipt'",
            [firstOrder.id],
          )
        ).rows,
    );
    assert.equal(d.length, 1);
    assert.equal(Number(d[0].amount_sen), 3900);
    assert.equal(d[0].state, 'available');
  });
  await check('P5-07 clock controls owner-only and durable paused instant', async () => {
    await assert.rejects(() => ownerJobs.clock(farah, 'advance', 1));
    const clockKey = randomUUID();
    await ownerJobs.clock(owner, 'advance', 12, clockKey);
    await ownerJobs.clock(owner, 'advance', 12, clockKey);
    await assert.rejects(() => ownerJobs.clock(owner, 'advance', 13, clockKey));
    assert.equal((await ownerJobs.status(owner)).clock.paused, true);
    assert.equal(new Date((await ownerJobs.status(owner)).clock.instant).getUTCHours(), 14);
  });
  if (from > 7) {
    await jobs.run(work);
    await ownerJobs.clock(owner, 'advance', 12);
  }
  await check('P5-08 paid deposit reminder suppressed at delivery boundary', async () => {
    await jobs.run(work);
    const r = await withScope(
      runtime,
      owner,
      async (c) =>
        (
          await c.query(
            "SELECT state FROM app.jobs WHERE order_id=$1 AND kind='deposit_reminder'",
            [firstOrder.id],
          )
        ).rows[0],
    );
    assert.equal(r.state, 'suppressed');
  });
  await repos.consents(farah, 'operational_reminders', true);
  await ownerJobs.clock(owner, 'advance', 11); //09:00 Malaysia next day; allow lead time to11Oct
  async function laterOrder() {
    const q = await commerce.quote(
      farah,
      {
        items: [{ sku: 'cupcake-box', quantity: 1 }],
        pickupDate: '2026-10-11',
        pickupSlotCode: 'midday',
      },
      randomUUID(),
    );
    const ch = await commerce.challenge(farah, q.id, q.proposalHash, randomUUID());
    return commerce.confirm(
      farah,
      { quoteId: q.id, proposalHash: q.proposalHash, challengeToken: ch.challengeToken },
      randomUUID(),
    );
  }
  const reminderOrder = await laterOrder();
  await jobs.enqueue(work);
  await check('P5-09 quiet window defers without consuming retries', async () => {
    await ownerJobs.clock(owner, 'advance', 12);
    await jobs.run(work);
    const j = await withScope(
      runtime,
      owner,
      async (c) =>
        (
          await c.query("SELECT * FROM app.jobs WHERE order_id=$1 AND kind='deposit_reminder'", [
            reminderOrder.id,
          ])
        ).rows[0],
    );
    assert.equal(j.state, 'queued');
    assert.equal(j.attempts, 0);
    assert.ok(
      new Date(j.due_at).getTime() >
        new Date((await ownerJobs.status(owner)).clock.instant).getTime(),
    );
  });
  await check('P5-10 eligible reminder delivered once before hold expiry', async () => {
    await ownerJobs.clock(owner, 'advance', 12); //09:00 next day exactly expiry -> shift fixture hold1hour to test window then stale separately
    await bootstrap.query(
      "UPDATE app.reservations SET expires_at=expires_at+interval '1 hour' WHERE order_id=$1",
      [reminderOrder.id],
    );
    await jobs.run(work);
    await jobs.run(work);
    const count = await withScope(
      runtime,
      farah,
      async (c) =>
        (
          await c.query('SELECT count(*)::integer AS n FROM app.notifications WHERE order_id=$1', [
            reminderOrder.id,
          ])
        ).rows[0].n,
    );
    assert.equal(count, 1);
  });
  await check('P5-11 real lease recovery and retry budget', async () => {
    await withScope(worker, work, async (c) => {
      await c.query(
        "INSERT INTO app.jobs(id,business_id,kind,action_key,due_at,state,attempts,lease_owner,lease_until) VALUES($1,$2,'unsupported','retry-case',app.business_now(),'running',1,'dead',clock_timestamp()-interval '1 second')",
        [randomUUID(), fixtureBusinessId],
      );
    });
    await jobs.run(work);
    await ownerJobs.clock(owner, 'advance', 1);
    await jobs.run(work);
    const j = await withScope(
      runtime,
      owner,
      async (c) => (await c.query("SELECT * FROM app.jobs WHERE action_key='retry-case'")).rows[0],
    );
    assert.equal(j.state, 'failed');
    assert.equal(j.attempts, 3);
    assert.equal(j.last_error, 'UNKNOWN_JOB');
  });
  await check('P5-12 digest idempotency reconciles ledger', async () => {
    const d = await ownerJobs.digest(owner, 'digest-unique'),
      repeat = await ownerJobs.digest(owner, 'digest-unique');
    assert.equal(d.id, repeat.id);
    const paid = await withScope(
      runtime,
      owner,
      async (c) =>
        (
          await c.query(
            "SELECT sum(amount_sen)::integer AS n FROM app.payments WHERE state='verified'",
          )
        ).rows[0].n,
    );
    assert.equal(d.snapshot_json.verifiedPaymentSen, paid);
  });
  await check('P5-13 owner and worker boundaries deny customer job control', async () => {
    await assert.rejects(() => ownerJobs.run(farah));
    await assert.rejects(() => ownerJobs.digest(farah, 'denied'));
    const visible = await withScope(
      runtime,
      jason,
      async (c) => (await c.query('SELECT * FROM app.notifications')).rows,
    );
    assert.equal(visible.length, 0);
  });
  await check(
    'P5-14 suppression rechecks consent, takeover, global pause, exceptions and expiry',
    async () => {
      const checks = [
        ['consent', 'SELECT 1'],
        ['takeover', 'UPDATE app.conversations SET human_takeover=true WHERE customer_id=$1'],
        ['pause', 'UPDATE app.businesses SET automation_paused=true WHERE id=$2'],
        ['exception', 'UPDATE app.orders SET exception_paused=true WHERE id=$3'],
        [
          'expiry',
          "UPDATE app.reservations SET expires_at=now()-interval '1 hour' WHERE order_id=$3",
        ],
      ];
      for (const [label, sql] of checks) {
        await repos.consents(farah, 'operational_reminders', label !== 'consent');
        const fixtureClient = await bootstrap.connect();
        try {
          await fixtureClient.query('BEGIN');
          await fixtureClient.query(
            "SELECT set_config('app.business_id',$1,true),set_config('app.actor_role','owner',true)",
            [fixtureBusinessId],
          );
          await fixtureClient.query(
            "UPDATE app.reservations SET expires_at=now()+interval '30 days' WHERE order_id=$1",
            [reminderOrder.id],
          );
          await fixtureClient.query(
            'UPDATE app.conversations SET human_takeover=false WHERE customer_id=$1',
            [farah.customerId],
          );
          await fixtureClient.query('UPDATE app.businesses SET automation_paused=false');
          await fixtureClient.query('UPDATE app.orders SET exception_paused=false WHERE id=$1', [
            reminderOrder.id,
          ]);
          // Use exact fixture identifiers, never a different customer's scope.
          const query = sql!
            .replace('$3', "'" + reminderOrder.id + "'")
            .replace('$2', "'" + fixtureBusinessId + "'");
          await fixtureClient.query(query, query.includes('$1') ? [farah.customerId] : []);
          await fixtureClient.query('COMMIT');
        } catch (error) {
          await fixtureClient.query('ROLLBACK');
          throw error;
        } finally {
          fixtureClient.release();
        }
        await withScope(worker, work, async (c) => {
          await c.query(
            "INSERT INTO app.jobs(id,business_id,customer_id,order_id,kind,action_key,due_at) VALUES($1,$2,$3,$4,'deposit_reminder',$5,app.business_now())",
            [
              randomUUID(),
              fixtureBusinessId,
              farah.customerId,
              reminderOrder.id,
              `suppression-${label}`,
            ],
          );
        });
        await jobs.run(work);
        const j = await withScope(
          runtime,
          owner,
          async (c) =>
            (
              await c.query('SELECT state FROM app.jobs WHERE action_key=$1', [
                `suppression-${label}`,
              ])
            ).rows[0],
        );
        assert.equal(j.state, 'suppressed', label);
      }
    },
  );
  await check('P5-15 HTTP private PDF, auth/owner/CSRF denial and download integrity', async () => {
    const docs = await withScope(
      runtime,
      farah,
      async (c) =>
        (
          await c.query("SELECT * FROM app.documents WHERE order_id=$1 AND kind='receipt'", [
            firstOrder.id,
          ])
        ).rows,
    );
    const doc = docs[0];
    await mkdir(resolve(documentRoot, fixtureBusinessId), { recursive: true });
    await writeFile(resolve(documentRoot, doc.storage_key), await storage.read(doc.storage_key));
    const config = { ...readConfig(), documentPath: documentRoot };
    server = createApp(config, runtime, async () => {
      try {
        await seedDemo(bootstrap, true);
      } catch (e) {
        console.error('Reset fixture failed:', (e as Error).message);
        throw e;
      }
    }).listen(0, '127.0.0.1');
    await new Promise<void>((r) => server!.once('listening', r));
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('listener');
    const base = `http://127.0.0.1:${addr.port}/api/v1`;
    async function login(accountKey: string) {
      const response = await fetch(base + '/demo/sessions', {
        method: 'POST',
        headers: { Origin: config.allowedOrigins[0]!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountKey }),
      });
      assert.equal(response.status, 201);
      return {
        Cookie: response.headers.get('set-cookie')!.split(';')[0]!,
        csrf: (await response.json()).csrfToken as string,
      };
    }
    const customer = await login('farah'),
      other = await login('jason'),
      boss = await login('owner');
    const download = '/documents/' + doc.id + '/download';
    assert.equal((await fetch(base + download)).status, 401);
    assert.equal((await fetch(base + download, { headers: { Cookie: other.Cookie } })).status, 404);
    const pdf = await fetch(base + download, { headers: { Cookie: customer.Cookie } });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    assert.equal(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 4)
        .toString(),
      '%PDF',
    );
    assert.equal(
      (await fetch(base + '/owner/demo/jobs', { headers: { Cookie: customer.Cookie } })).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + '/owner/demo/jobs/run', {
          method: 'POST',
          headers: { Cookie: boss.Cookie, Origin: config.allowedOrigins[0]! },
        })
      ).status,
      403,
    );
    const denied = await fetch(base + '/owner/demo/reset', {
      method: 'POST',
      headers: {
        Cookie: boss.Cookie,
        Origin: config.allowedOrigins[0]!,
        'X-CSRF-Token': boss.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'wrong' }),
    });
    assert.equal(denied.status, 400);
    const reset = await fetch(base + '/owner/demo/reset', {
      method: 'POST',
      headers: {
        Cookie: boss.Cookie,
        Origin: config.allowedOrigins[0]!,
        'X-CSRF-Token': boss.csrf,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'RESET SYNTHETIC DEMO' }),
    });
    assert.equal(reset.status, 200);
    assert.equal((await fetch(base + '/me', { headers: { Cookie: boss.Cookie } })).status, 401);
  });
  await check('P5-16 reset restores fixture and refuses a non-demo business', async () => {
    assert.equal(((await repos.orders(farah)) as unknown[]).length, 1);
    assert.equal(
      new Date((await ownerJobs.status(owner)).clock.instant).toISOString(),
      '2026-10-07T02:00:00.000Z',
    );
    assert.equal((await ownerJobs.status(owner)).jobs.length, 0);
    const foreign = randomUUID();
    await bootstrap.query(
      "INSERT INTO app.businesses(id,slug,name) VALUES($1,'reset-refusal','Other business')",
      [foreign],
    );
    await assert.rejects(() => seedDemo(bootstrap, true), /other businesses/);
    await bootstrap.query('DELETE FROM app.businesses WHERE id=$1', [foreign]);
  });
} finally {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  const offset = relative(resolve(workspaceRoot, '.local'), documentRoot);
  if (!offset.startsWith('..') && offset === name)
    await rm(documentRoot, { recursive: true, force: true });
  await Promise.all([runtime.end(), worker.end(), bootstrap.end()]);
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.end();
  await mkdir('docs/evidence', { recursive: true });
  await writeFile(
    'docs/evidence/phase5-integration.json',
    JSON.stringify(
      { phase: 5, recordedAt: new Date().toISOString(), disposableDatabaseRemoved: true, results },
      null,
      2,
    ) + '\n',
  );
}
