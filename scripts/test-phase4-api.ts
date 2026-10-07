import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  createDatabasePool,
  applyMigrations,
  seedDemo,
  createCommerce,
  createRepositories,
  fixtureBusinessId,
  demoCustomers,
} from '../packages/db/src/index.js';
import type { Pool } from '../packages/db/src/index.js';
import type { TrustedScope } from '../packages/contracts/src/index.js';
import { policySchema } from '../packages/contracts/src/index.js';
import { createApp } from '../apps/api/src/app.js';
import { readConfig } from '../apps/api/src/config.js';
import { localAdminUrl, roleCredentials, connectionForRole, rootDirectory } from './database.js';
const database = `customerbuddy_phase4_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
if (!/^customerbuddy_phase4_test_\d+_[a-f0-9]{8}$/.test(database))
  throw new Error('Unsafe disposable target');
const adminUrl = await localAdminUrl(),
  admin = createDatabasePool(adminUrl),
  credentials = await roleCredentials();
let bootstrap: Pool | undefined,
  runtime: Pool | undefined,
  server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
const results: { name: string; status: string; error?: string }[] = [];
async function check(name: string, work: () => Promise<void>) {
  try {
    await work();
    results.push({ name, status: 'passed' });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, status: 'failed', error: (e as Error).message });
    throw e;
  }
}
try {
  await admin.query(`CREATE DATABASE ${database}`);
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  bootstrap = createDatabasePool(url.toString());
  await bootstrap.query(`REVOKE CONNECT,TEMPORARY ON DATABASE ${database} FROM PUBLIC`);
  await bootstrap.query(`GRANT CONNECT ON DATABASE ${database} TO cb_runtime,cb_worker`);
  await applyMigrations(bootstrap);
  await seedDemo(bootstrap);
  runtime = createDatabasePool(
    connectionForRole(adminUrl, 'cb_runtime', credentials.runtime, database),
  );
  const pool = runtime,
    commerce = createCommerce(pool),
    repos = createRepositories(pool);
  const customer = (index: number): TrustedScope => ({
      businessId: fixtureBusinessId,
      customerId: demoCustomers[index]!.id,
      subject: demoCustomers[index]!.subject,
      role: 'customer',
    }),
    farah = customer(0),
    jason = customer(1),
    owner: TrustedScope = { businessId: fixtureBusinessId, subject: 'demo:owner', role: 'owner' };
  server = createApp(readConfig(), pool).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server!.once('listening', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  const root = `http://127.0.0.1:${address.port}/api/v1`,
    origin = readConfig().allowedOrigins[0]!;
  async function login(accountKey: string) {
    const r = await fetch(`${root}/demo/sessions`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountKey }),
    });
    assert.equal(r.status, 201);
    return { Cookie: r.headers.get('set-cookie')!.split(';')[0]! };
  }
  const first = await login('farah'),
    second = await login('jason'),
    boss = await login('owner');
  async function read<T>(path: string, headers: Record<string, string>) {
    const r = await fetch(root + path, { headers });
    assert.equal(r.status, 200);
    return (await r.json()) as T;
  }
  const input = {
    items: [{ sku: 'brownie-tray', quantity: 1 }],
    pickupDate: '2026-10-10',
    pickupSlotCode: 'midday',
  };
  const q = await commerce.quote(farah, input, randomUUID()),
    a = await commerce.exception(
      farah,
      { kind: 'discount', quoteId: q.id, discountBasisPoints: 1000, note: 'Scoped offer' },
      randomUUID(),
    );
  const jq = await commerce.quote(jason, input, randomUUID());
  await commerce.exception(
    jason,
    { kind: 'discount', quoteId: jq.id, discountBasisPoints: 1000, note: 'Another customer offer' },
    randomUUID(),
  );
  await check(
    'P4-API-01 customer review list excludes other customer and owner raw decisions',
    async () => {
      const data = await read<{ reviews: { id: string }[] }>('/me/reviews', first);
      assert.equal(data.reviews.length, 1);
      assert.equal(data.reviews[0]!.id, a.id);
      assert.equal((await fetch(`${root}/owner/approvals`, { headers: first })).status, 403);
      assert.equal((await fetch(`${root}/me/reviews`, { headers: boss })).status, 403);
    },
  );
  await check(
    'P4-API-02 approved offer exposes only scoped quote for explicit customer acceptance',
    async () => {
      const decision = await commerce.decision(
        owner,
        a.id,
        {
          decision: 'approve',
          proposalHash: a.proposalHash,
          version: 1,
          note: 'Approve exact offer',
        },
        randomUUID(),
      );
      const list = await read<{ reviews: { quote_id: string }[] }>('/me/reviews', first);
      assert.equal(list.reviews[0]!.quote_id, decision.quote!.id);
      assert.equal(
        (await fetch(`${root}/quotes/${decision.quote!.id}`, { headers: second })).status,
        404,
      );
      const offer = await read<{ total_sen: number; state: string }>(
        `/quotes/${decision.quote!.id}`,
        first,
      );
      assert.equal(offer.total_sen, 7020);
      assert.equal(offer.state, 'active');
    },
  );
  await check(
    'P4-API-03 capacity UI receives scoped product identity and optimistic version',
    async () => {
      const data = await read<{
        capacity: { product_id: string; version: number; available_units: number }[];
      }>('/capacity?date=2026-10-10', boss);
      assert.equal(data.capacity.length, 2);
      assert.ok(
        data.capacity.every((b) => b.product_id && b.version === 1 && b.available_units >= 0),
      );
    },
  );
  await check(
    'P4-API-04 business clock reads require auth and preserve paused fixture instant',
    async () => {
      assert.equal((await fetch(`${root}/business-time`)).status, 401);
      assert.equal(
        (await read<{ demoTime: string }>('/business-time', first)).demoTime,
        '2026-10-07T02:00:00.000Z',
      );
    },
  );
  await check(
    'P4-API-05 stale policy reviews are nonactionable and dashboard excludes them',
    async () => {
      const knowledge = await repos.knowledge(owner),
        cat = await repos.catalogue(owner);
      await commerce.publish(
        owner,
        {
          expectedKnowledgeVersionId: knowledge.policy.id,
          policy: policySchema.parse(knowledge.policy.policy_json),
          catalogue: cat.map((p) => ({
            sku: p.sku,
            label: p.label,
            description: p.description,
            unitPriceSen: p.unit_price_sen,
            unitsDescription: p.units_description,
            available: true,
          })),
        },
        randomUUID(),
      );
      const list = await read<{ approvals: { effective_state: string }[] }>(
        '/owner/approvals',
        boss,
      );
      assert.ok(list.approvals.some((a) => a.effective_state === 'superseded'));
      assert.equal(
        (await read<{ pendingApprovals: number }>('/owner/dashboard', boss)).pendingApprovals,
        0,
      );
      assert.equal(
        (await read<{ reviews: { effective_state: string }[] }>('/me/reviews', second)).reviews[0]!
          .effective_state,
        'superseded',
      );
    },
  );
  await check('P4-API-06 paused-clock messages preserve customer-owner chronology', async () => {
    const conversation = await commerce.conversation(farah, 'en', randomUUID());
    await commerce.message(farah, conversation.id, 'First customer message', randomUUID());
    await commerce.takeover(owner, conversation.id, true, randomUUID());
    await commerce.message(owner, conversation.id, 'Second owner reply', randomUUID());
    await commerce.message(farah, conversation.id, 'Third customer message', randomUUID());
    const messages = await commerce.messages(farah, conversation.id);
    assert.deepEqual(
      messages.map((m) => m.content),
      ['First customer message', 'Second owner reply', 'Third customer message'],
    );
    assert.ok(
      new Date(messages[0]!.created_at).getTime() < new Date(messages[1]!.created_at).getTime(),
    );
  });
} finally {
  if (server)
    await new Promise<void>((resolve, reject) => server!.close((e) => (e ? reject(e) : resolve())));
  await Promise.all([runtime?.end(), bootstrap?.end()]);
  await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.end();
  await mkdir(resolve(rootDirectory, 'docs/evidence'), { recursive: true });
  await writeFile(
    resolve(rootDirectory, 'docs/evidence/phase4-api.json'),
    JSON.stringify(
      { phase: 4, recordedAt: new Date().toISOString(), disposableDatabaseRemoved: true, results },
      null,
      2,
    ) + '\n',
  );
}
