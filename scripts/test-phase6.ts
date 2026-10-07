import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import {
  createDatabasePool,
  applyMigrations,
  seedDemo,
  demoCustomers,
  fixtureBusinessId,
  createCommerce,
  createRepositories,
  withScope,
} from '../packages/db/src/index.js';
import type { TrustedScope } from '../packages/contracts/src/index.js';
import { seedPolicy } from '../packages/db/src/seed.js';
import { localAdminUrl, roleCredentials, connectionForRole } from './database.js';
import { readConfig, workspaceRoot } from '../apps/api/src/config.js';
import { createApp } from '../apps/api/src/app.js';
import { createScripted } from '../apps/api/src/scripted.js';
import { createJobs } from '../apps/api/src/jobs.js';
import { localStorage } from '../apps/api/src/storage.js';

const database = `customerbuddy_phase6_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
assert.match(database, /^customerbuddy_phase6_test_\d+_[a-f0-9]{8}$/);
const url = await localAdminUrl(),
  credentials = await roleCredentials();
const admin = createDatabasePool(url),
  target = new URL(url);
target.pathname = '/' + database;
await admin.query(`CREATE DATABASE ${database}`);
const bootstrap = createDatabasePool(target.toString());
const runtimeUrl = connectionForRole(url, 'cb_runtime', credentials.runtime, database);
let runtime = createDatabasePool(runtimeUrl);
let worker = createDatabasePool(connectionForRole(url, 'cb_worker', credentials.worker, database));
const documentRoot = resolve(workspaceRoot, '.local', database);
const evidence = resolve(workspaceRoot, 'docs/evidence');
const referenceData = resolve(workspaceRoot, 'docs/phase6');
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
const owner: TrustedScope = { businessId: fixtureBusinessId, role: 'owner', subject: 'demo:owner' };
const work: TrustedScope = {
  businessId: fixtureBusinessId,
  role: 'worker',
  subject: 'phase6:worker',
};
const customer = (i: number): TrustedScope => ({
  businessId: fixtureBusinessId,
  customerId: demoCustomers[i]!.id,
  subject: demoCustomers[i]!.subject,
  role: 'customer',
});
const from = Number(process.argv[2] ?? 1);
const results: { name: string; status: string; durationMs: number }[] =
  from > 1
    ? JSON.parse(
        await readFile(resolve(evidence, 'phase6-acceptance.json'), 'utf8'),
      ).results.filter(
        (r: { name: string; status: string }) =>
          r.status === 'passed' && Number(r.name.match(/^P6-S(\d+)/)?.[1]) < from,
      )
    : [];
async function check(name: string, fn: () => Promise<void>) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, status: 'passed', durationMs: Date.now() - started });
    console.log('PASS ' + name);
  } catch (e) {
    results.push({ name, status: 'failed', durationMs: Date.now() - started });
    throw e;
  }
}
async function listen() {
  server = createApp({ ...readConfig(), documentPath: documentRoot }, runtime).listen(
    0,
    '127.0.0.1',
  );
  await new Promise<void>((r) => server!.once('listening', r));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}/api/v1`;
}
async function closeServer() {
  if (server) await new Promise<void>((r, j) => server!.close((e) => (e ? j(e) : r())));
  server = undefined;
}
try {
  await mkdir(referenceData, { recursive: true });
  await mkdir(evidence, { recursive: true });
  await bootstrap.query(`REVOKE CONNECT,TEMPORARY ON DATABASE ${database} FROM PUBLIC`);
  await bootstrap.query(`GRANT CONNECT ON DATABASE ${database} TO cb_runtime,cb_worker`);
  await applyMigrations(bootstrap);
  await seedDemo(bootstrap);
  const fixtures: Record<string, unknown> = {
    provenance:
      'allowlisted rows from freshly seeded isolated synthetic database; no sessions or credentials',
    seedPolicy,
  };
  for (const [table, columns] of Object.entries({
    customers: 'id,display_code,display_name,preferred_language',
    products: 'id,sku',
    catalogue_items: 'product_id,label,unit_price_sen,units_description',
    pickup_slots: 'id,code,start_local,end_local',
    capacity_buckets: 'product_id,pickup_date,max_units,committed_units,held_units',
    orders: 'id,customer_id,display_code,pickup_date,total_sen,deposit_required_sen,state',
    payments: 'order_id,amount_sen,reference,state',
    consent_events: 'customer_id,purpose,granted,event_sequence',
    customer_preferences: 'customer_id,key,value_json',
    demo_settings: 'base_demo_time,paused',
  })) {
    fixtures[table] = (await bootstrap.query(`SELECT ${columns} FROM app.${table}`)).rows;
  }
  await writeFile(
    resolve(referenceData, 'synthetic-fixtures.json'),
    JSON.stringify(fixtures, null, 2) + '\n',
  );
  const commerce = createCommerce(runtime),
    repos = createRepositories(runtime),
    assistant = createScripted(runtime);
  const cases = JSON.parse(await readFile(resolve(referenceData, 'scripted-cases.json'), 'utf8'))
    .cases as { id: string; input: string; intent: string; language: 'bm' | 'en' }[];
  assert.ok(cases.length >= 30);
  const scope = customer(0);
  const baseline = await repos.orders(scope),
    preferences = await repos.preferences(scope);
  const counts = async () =>
    (
      await bootstrap.query(
        'SELECT (SELECT count(*) FROM app.orders)::int AS orders,(SELECT count(*) FROM app.payments)::int AS payments,(SELECT count(*) FROM app.reservations)::int AS reservations',
      )
    ).rows[0];
  const before = await counts();
  for (const scenario of cases.filter((c) => Number(c.id.slice(1)) >= from))
    await check(`P6-${scenario.id} ${scenario.intent}`, async () => {
      await repos.profile(scope, { displayName: 'Farah', preferredLanguage: scenario.language });
      const conv = await commerce.conversation(scope, scenario.language, randomUUID());
      const message = await commerce.message(scope, conv.id, scenario.input, randomUUID());
      const response = await assistant.respond(scope, conv.id, message.id);
      assert.equal(response.intent, scenario.intent);
      assert.equal(response.mode, 'scripted');
      assert.equal(response.error, null);
      assert.deepEqual(
        JSON.parse(JSON.stringify(await assistant.respond(scope, conv.id, message.id))),
        JSON.parse(JSON.stringify(response)),
      );
      assert.equal((await commerce.messages(scope, conv.id)).length, 2);
      if (scenario.intent === 'catalogue') assert.match(response.reply, /78\.00/);
      if (scenario.intent === 'faq') assert.match(response.reply, /50%/);
      if (scenario.intent === 'order_status' || scenario.intent === 'repeat_order')
        assert.match(response.reply, /DEMO-HISTORY-C-001/);
      if (scenario.intent === 'unknown')
        assert.match(response.reply, scenario.language === 'bm' ? /tidak boleh/ : /cannot approve/);
      if (scenario.intent === 'human_handoff') {
        const c = (await commerce.conversations(scope)).find((c) => c.id === conv.id)!;
        assert.equal(c.human_takeover, true);
        const next = await commerce.message(scope, conv.id, 'menu', randomUUID());
        const paused = await assistant.respond(scope, conv.id, next.id);
        assert.match(paused.reply, /Waiting/);
        await commerce.takeover(owner, conv.id, false, randomUUID());
      }
      assert.deepEqual(await counts(), before);
      assert.deepEqual(await repos.preferences(scope), preferences);
    });
  assert.deepEqual(await repos.orders(scope), baseline);
  await check('P6-configuration redaction and storage containment', async () => {
    const secret = 'SYNTHETIC-DO-NOT-LOG';
    for (const patch of [
      { DATABASE_URL: `postgres://cb_runtime:${secret}@remote.invalid/customerbuddy` },
      { API_HOST: '0.0.0.0' },
      { AUTH_ADAPTER: 'cloud' },
      { ASSISTANT_MODE: 'live' },
      { ALLOWED_ORIGINS: 'https://remote.invalid' },
      { LOCAL_DOCUMENT_PATH: '../outside' },
    ]) {
      assert.throws(
        () => readConfig({ ...process.env, ...patch }),
        (e) => !String(e).includes(secret),
      );
    }
    await assert.rejects(() =>
      localStorage(documentRoot).put('../../escape.pdf', new Uint8Array()),
    );
    const permissions = (
      await bootstrap.query(
        "SELECT has_table_privilege('cb_worker','app.payments','INSERT') AS payment,has_table_privilege('cb_worker','app.approvals','UPDATE') AS approval,rolsuper,rolbypassrls FROM pg_roles WHERE rolname='cb_worker'",
      )
    ).rows[0];
    assert.deepEqual(permissions, {
      payment: false,
      approval: false,
      rolsuper: false,
      rolbypassrls: false,
    });
  });
  const hana = customer(8),
    q = await commerce.quote(
      hana,
      {
        items: [{ sku: 'brownie-tray', quantity: 1 }],
        pickupDate: '2026-10-10',
        pickupSlotCode: 'midday',
      },
      randomUUID(),
    );
  const challenge = await commerce.challenge(hana, q.id, q.proposalHash, randomUUID());
  const order = await commerce.confirm(
    hana,
    { quoteId: q.id, proposalHash: q.proposalHash, challengeToken: challenge.challengeToken },
    randomUUID(),
  );
  await commerce.verifyPayment(
    owner,
    { orderId: order.id, amountSen: 3900, reference: 'SYNTHETIC-PHASE6-DEPOSIT' },
    randomUUID(),
  );
  let jobs = createJobs(worker, localStorage(documentRoot));
  await jobs.run(work);
  await jobs.run(work);
  const docs = await withScope(
    runtime,
    hana,
    async (c) =>
      (
        await c.query(
          'SELECT id,kind,storage_key,content_hash FROM app.documents WHERE order_id=$1 OR quote_id=$2',
          [order.id, q.id],
        )
      ).rows,
  );
  const receipt = docs.find((d) => d.kind === 'receipt');
  assert.ok(receipt);
  await mkdir(resolve(referenceData, 'sample-documents'), { recursive: true });
  for (const doc of docs)
    await copyFile(
      resolve(documentRoot, doc.storage_key),
      resolve(referenceData, 'sample-documents', `${doc.kind}.pdf`),
    );
  await check(
    'P6-server and worker restart preserves session records and private files',
    async () => {
      let base = await listen();
      const signed = await fetch(base + '/demo/sessions', {
        method: 'POST',
        headers: { Origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountKey: 'hana' }),
      });
      assert.equal(signed.status, 201);
      const Cookie = signed.headers.get('set-cookie')!.split(';')[0]!;
      const read = async (path: string) => fetch(base + path, { headers: { Cookie } });
      const beforeOrder = await (await read('/orders/' + order.id)).json();
      await closeServer();
      await runtime.end();
      await worker.end();
      runtime = createDatabasePool(runtimeUrl);
      worker = createDatabasePool(
        connectionForRole(url, 'cb_worker', credentials.worker, database),
      );
      base = await listen();
      jobs = createJobs(worker, localStorage(documentRoot));
      assert.equal((await read('/me')).status, 200);
      assert.deepEqual(await (await read('/orders/' + order.id)).json(), beforeOrder);
      const download = await read('/documents/' + receipt.id + '/download');
      assert.equal(download.status, 200);
      const pdf = Buffer.from(await download.arrayBuffer());
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
      assert.equal(createHash('sha256').update(pdf).digest('hex'), receipt.content_hash);
      const digest = await createJobs(runtime, localStorage(documentRoot)).digest(
        owner,
        'phase6-restart',
      );
      assert.equal(digest.snapshot_json.verifiedPaymentSen, 16500);
      await jobs.run(work);
      assert.ok(
        (await createJobs(runtime, localStorage(documentRoot)).status(owner)).jobs.length > 0,
      );
      const c = createCommerce(runtime),
        conv = await c.conversation(hana, 'en', randomUUID()),
        m = await c.message(hana, conv.id, 'order status', randomUUID());
      assert.match((await createScripted(runtime).respond(hana, conv.id, m.id)).reply, /confirmed/);
    },
  );
} finally {
  await closeServer();
  await Promise.all([runtime.end(), worker.end(), bootstrap.end()]);
  await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.end();
  const offset = relative(resolve(workspaceRoot, '.local'), documentRoot);
  assert.ok(offset && !offset.startsWith('..'));
  await rm(documentRoot, { recursive: true, force: true });
  await writeFile(
    resolve(evidence, 'phase6-acceptance.json'),
    JSON.stringify(
      {
        phase: 6,
        recordedAt: new Date().toISOString(),
        mode: 'scripted; not model accuracy',
        disposableDatabaseRemoved: true,
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
console.log(`Phase6 acceptance passed: ${results.length} checks; isolated database removed.`);
