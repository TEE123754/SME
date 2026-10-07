import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  createDatabasePool,
  applyMigrations,
  seedDemo,
  createCommerce,
  createRepositories,
  createOperations,
  fixtureBusinessId,
  demoCustomers,
  withScope,
} from '../packages/db/src/index.js';
import { createShopping } from '../packages/db/src/shopping.js';
import { localAdminUrl, roleCredentials, connectionForRole } from './database.js';
import type { TrustedScope } from '../packages/contracts/src/index.js';
import { createApp } from '../apps/api/src/app.js';
import { readConfig } from '../apps/api/src/config.js';
const name = `customerbuddy_shopping_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
if (!/^customerbuddy_shopping_test_\d+_[a-f0-9]{8}$/.test(name))
  throw new Error('Unsafe disposable name');
const url = await localAdminUrl(),
  admin = createDatabasePool(url),
  creds = await roleCredentials();
await admin.query(`CREATE DATABASE ${name}`);
const u = new URL(url);
u.pathname = '/' + name;
const bootstrap = createDatabasePool(u.toString()),
  runtime = createDatabasePool(connectionForRole(url, 'cb_runtime', creds.runtime, name));
const shopping = createShopping(runtime),
  commerce = createCommerce(runtime),
  repos = createRepositories(runtime),
  ops = createOperations(runtime);
const owner: TrustedScope = { businessId: fixtureBusinessId, role: 'owner', subject: 'demo:owner' },
  farah: TrustedScope = {
    businessId: fixtureBusinessId,
    role: 'customer',
    customerId: demoCustomers[0]!.id,
    subject: demoCustomers[0]!.subject,
  },
  jason: TrustedScope = {
    ...farah,
    customerId: demoCustomers[1]!.id,
    subject: demoCustomers[1]!.subject,
  };
const results: { id: string; status: string; error?: string }[] = [];
async function check(id: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ id, status: 'passed' });
    console.log('PASS ' + id);
  } catch (e) {
    results.push({ id, status: 'failed', error: (e as Error).message });
    throw e;
  }
}
const code = (expected: string) => (e: unknown) => (e as { code?: string }).code === expected;
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
const input = {
  items: [{ sku: 'brownie-tray', quantity: 1 }],
  pickupDate: '2026-10-10',
  pickupSlotCode: 'midday',
};
try {
  await check('S01 migration replay and fresh seed programme', async () => {
    assert.equal(await applyMigrations(bootstrap), 7);
    assert.equal(await applyMigrations(bootstrap), 0);
    await seedDemo(bootstrap);
    assert.equal((await shopping.membership(farah)).program.basisPoints, 500);
  });
  await check('S02 membership is explicit; default quotes unchanged', async () => {
    assert.equal((await shopping.membership(farah)).membership, null);
    assert.equal((await commerce.quote(farah, input, randomUUID())).totalSen, 7800);
  });
  await check('S03 idempotent join does not change any consent', async () => {
    const before = await repos.me(farah),
      key = randomUUID(),
      a = await shopping.join(farah, true, key),
      b = await shopping.join(farah, true, key);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.deepEqual((await repos.me(farah)).consents, before.consents);
  });
  await check('S04 member quote has exact total/deposit/savings and scoped prices', async () => {
    const q = await commerce.quote(farah, input, randomUUID());
    assert.equal(q.totalSen, 7410);
    assert.equal(q.depositSen, 3705);
    assert.equal(q.memberBenefit?.savingsSen, 390);
    assert.equal((await commerce.quote(jason, input, randomUUID())).totalSen, 7800);
  });
  await check('S05 leaving invalidates member confirmation; orders unchanged', async () => {
    const q = await commerce.quote(farah, input, randomUUID()),
      ch = await commerce.challenge(farah, q.id, q.proposalHash, randomUUID());
    await shopping.join(farah, false, randomUUID());
    await assert.rejects(
      commerce.confirm(
        farah,
        { quoteId: q.id, proposalHash: q.proposalHash, challengeToken: ch.challengeToken },
        randomUUID(),
      ),
      code('MEMBER_BENEFIT_CHANGED'),
    );
    assert.equal((await commerce.quote(farah, input, randomUUID())).totalSen, 7800);
  });
  await check('S06 newsletter opt-in is independent of joining/leaving', async () => {
    await repos.consents(jason, 'marketing', true);
    await shopping.join(jason, true, randomUUID());
    await shopping.join(jason, false, randomUUID());
    assert.equal((await repos.me(jason)).consents?.marketing, true);
    await repos.consents(jason, 'marketing', false);
    assert.equal((await shopping.membership(jason)).membership?.active, false);
  });
  await check('S07 programme authority and bounded pricing', async () => {
    assert.throws(
      () => shopping.program(farah, { enabled: true, basisPoints: 500, version: 1 }, randomUUID()),
      code('OWNER_ONLY'),
    );
    await ops.ethics(
      owner,
      {
        personalisation: true,
        marketingEnabled: true,
        dailyContactLimit: 1,
        maxDiscountPercent: 3,
        maxIncreasePercent: 10,
      },
      randomUUID(),
    );
    await assert.rejects(
      shopping.program(owner, { enabled: true, basisPoints: 500, version: 1 }, randomUUID()),
      code('DISCOUNT_LIMIT'),
    );
    await shopping.join(farah, true, randomUUID());
    assert.equal((await commerce.quote(farah, input, randomUUID())).totalSen, 7566);
    await ops.ethics(
      owner,
      {
        personalisation: true,
        marketingEnabled: true,
        dailyContactLimit: 1,
        maxDiscountPercent: 15,
        maxIncreasePercent: 10,
      },
      randomUUID(),
    );
  });
  await check('S08 programme edits invalidate old member quotes', async () => {
    const q = await commerce.quote(farah, input, randomUUID());
    await shopping.program(owner, { enabled: true, basisPoints: 700, version: 1 }, randomUUID());
    await assert.rejects(
      commerce.challenge(farah, q.id, q.proposalHash, randomUUID()),
      code('MEMBER_BENEFIT_CHANGED'),
    );
    assert.equal((await commerce.quote(farah, input, randomUUID())).totalSen, 7254);
  });
  await check('S09 quote confirmation idempotency and saved discounted order', async () => {
    const q = await commerce.quote(farah, input, randomUUID()),
      ch = await commerce.challenge(farah, q.id, q.proposalHash, randomUUID()),
      i = { quoteId: q.id, proposalHash: q.proposalHash, challengeToken: ch.challengeToken },
      key = randomUUID(),
      a = await commerce.confirm(farah, i, key),
      b = await commerce.confirm(farah, i, key);
    assert.equal(a.id, b.id);
    assert.equal((await repos.orders(farah, a.id)).total_sen, 7254);
  });
  await check('S10 approved promotions replace member pricing without stacking', async () => {
    const q = await commerce.quote(farah, input, randomUUID()),
      a = await commerce.exception(
        farah,
        { kind: 'discount', quoteId: q.id, discountBasisPoints: 1000, note: 'Synthetic promotion' },
        randomUUID(),
      );
    const d = await commerce.decision(
      owner,
      a.id,
      {
        decision: 'approve',
        proposalHash: a.proposalHash,
        version: a.version,
        note: 'Approved synthetic promotion',
      },
      randomUUID(),
    );
    assert.equal(d.quote?.totalSen, 7020);
    assert.equal(d.quote?.memberBenefit, undefined);
  });
  await check('S11 customer cannot select a discount or another member', async () => {
    await assert.rejects(
      commerce.quote(farah, { ...input, discountBasisPoints: 9000 } as typeof input, randomUUID()),
    );
    await withScope(runtime, farah, async (c) => {
      assert.equal(
        (
          await c.query(
            'UPDATE app.customer_loyalty SET active=true WHERE customer_id=$1 RETURNING *',
            [jason.customerId],
          )
        ).rowCount,
        0,
      );
    });
  });
  const config = readConfig();
  server = createApp(config, runtime).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server!.once('listening', r));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('No listener');
  const base = `http://127.0.0.1:${addr.port}/api/v1`,
    origin = config.allowedOrigins[0]!;
  async function post(path: string, body: unknown, extra: Record<string, string> = {}) {
    return fetch(base + path, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', ...extra },
      body: JSON.stringify(body),
    });
  }
  await check('S12 public store exposes only published catalogue fields', async () => {
    const r = await fetch(base + '/stores/ainas-home-bakery');
    assert.equal(r.status, 200);
    const v = await r.json();
    assert.equal(v.items[0].image_key, 'brownie');
    assert.deepEqual(Object.keys(v).sort(), ['business', 'items']);
    assert(!JSON.stringify(v).includes('customer_id'));
    assert.equal((await fetch(base + '/stores/missing-store')).status, 404);
  });
  await check('S13 bootstrap requires synthetic acceptance and valid input', async () => {
    assert.equal((await post('/demo/businesses', { name: 'Real', synthetic: false })).status, 400);
    assert.equal((await post('/membership', { active: true })).status, 401);
  });
  const id = randomUUID(),
    body = {
      requestId: id,
      name: 'S1 Demo Studio',
      slug: 's1-demo-studio',
      sector: 'Services',
      fulfilment: 'appointment',
      synthetic: true,
    };
  let created: { businessId: string; ownerKey: string; customerKey: string };
  await check('S14 isolated bootstrap and exact replay', async () => {
    const r = await post('/demo/businesses', body);
    assert.equal(r.status, 201);
    created = await r.json();
    assert.deepEqual(await (await post('/demo/businesses', body)).json(), created);
    assert.equal((await post('/demo/businesses', { ...body, name: 'Changed' })).status, 409);
    assert.equal(
      (await post('/demo/businesses', { ...body, requestId: randomUUID() })).status,
      409,
    );
  });
  const newOwner: TrustedScope = {
    businessId: id,
    role: 'owner',
    subject: 'demo:' + ('owner-' + id.replaceAll('-', '')),
  };
  await check('S15 new business readiness starts empty; original data isolated', async () => {
    const s = await shopping.setup(newOwner);
    assert.equal(s.ready, false);
    assert.equal(s.productCount, 0);
    assert.equal((await repos.catalogue(newOwner)).length, 0);
    assert.equal((await repos.catalogue(owner)).length, 2);
    assert.equal((await ops.members(newOwner)).members.length, 1);
  });
  await check('S16 saved setup readiness depends on facts and eligible capacity', async () => {
    await ops.setup(
      newOwner,
      {
        name: body.name,
        slug: body.slug,
        sector: body.sector,
        fulfilment: 'appointment',
        version: 1,
        factsEn: 'Appointments at our studio. Synthetic payment only.',
        factsBm: 'Temujanji di studio. Bayaran sintetik sahaja.',
      },
      randomUUID(),
    );
    const k = (await repos.knowledge(newOwner)).policy!.id;
    await ops.product(
      newOwner,
      {
        sku: 'consultation',
        label: 'Consultation',
        description: 'A 60 minute demo appointment.',
        kind: 'service',
        unitPriceSen: 10000,
        unitsDescription: '60 minutes',
        available: true,
        knowledgeVersionId: k,
        imageKey: 'service',
      },
      randomUUID(),
    );
    assert.equal((await shopping.setup(newOwner)).ready, false);
    const p = (await repos.catalogue(newOwner))[0];
    await commerce.configureCapacity(
      newOwner,
      { productId: p.product_id, pickupDate: '2026-10-10', maxUnits: 5, version: 0 },
      randomUUID(),
    );
    assert.equal((await shopping.setup(newOwner)).ready, true);
    assert.equal((await repos.catalogue(newOwner))[0].image_key, 'service');
  });
  await check('S17 store-specific account selection and customer authority', async () => {
    const r = await fetch(base + '/demo/accounts?business=s1-demo-studio'),
      v = await r.json();
    assert.equal(v.accounts.length, 2);
    assert(v.accounts.some((a: { account_key: string }) => a.account_key === created!.customerKey));
    const login = await post('/demo/sessions', { accountKey: created!.customerKey }),
      token = (await login.json()).csrfToken,
      cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    assert.equal(
      (
        await post(
          '/owner/membership-program',
          { enabled: true, basisPoints: 500, version: 1 },
          { Cookie: cookie, 'X-CSRF-Token': token, 'Idempotency-Key': randomUUID() },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await post(
          '/membership',
          { active: true },
          { Cookie: cookie, 'Idempotency-Key': randomUUID() },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await post(
          '/membership',
          { active: true },
          { Cookie: cookie, 'X-CSRF-Token': token, 'Idempotency-Key': randomUUID() },
        )
      ).status,
      200,
    );
    const me = await (await fetch(base + '/me', { headers: { Cookie: cookie } })).json();
    assert.equal(me.consents.marketing, false);
    assert.equal(me.business.id, id);
  });
  await check('S18 programme pause prevents new joins and removes future discount', async () => {
    await shopping.program(owner, { enabled: false, basisPoints: 700, version: 2 }, randomUUID());
    await assert.rejects(shopping.join(jason, true, randomUUID()), code('PROGRAM_DISABLED'));
    assert.equal((await commerce.quote(farah, input, randomUUID())).totalSen, 7800);
  });
  await check('S19 missing scope cannot read loyalty records', async () => {
    assert.equal((await runtime.query('SELECT * FROM app.customer_loyalty')).rowCount, 0);
  });
  await check('S20 saved setup/membership survives a fresh connection', async () => {
    const restarted = createDatabasePool(connectionForRole(url, 'cb_runtime', creds.runtime, name));
    try {
      assert.equal((await createShopping(restarted).setup(newOwner)).ready, true);
      assert.equal((await createShopping(restarted).membership(farah)).membership?.active, true);
    } finally {
      await restarted.end();
    }
  });
} finally {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  await Promise.all([runtime.end(), bootstrap.end()]);
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.end();
  await mkdir('docs/evidence/shopping', { recursive: true });
  await writeFile(
    'docs/evidence/shopping/integration.json',
    JSON.stringify(
      { recordedAt: new Date().toISOString(), disposableDatabaseRemoved: true, results },
      null,
      2,
    ),
  );
}
