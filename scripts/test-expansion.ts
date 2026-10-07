import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  createDatabasePool,
  applyMigrations,
  seedDemo,
  createCommerce,
  createOperations,
  createRepositories,
  fixtureBusinessId,
  fixtureId,
  demoCustomers,
  withScope,
} from '../packages/db/src/index.js';
import { localAdminUrl, roleCredentials, connectionForRole } from './database.js';
import { createApp } from '../apps/api/src/app.js';
import { readConfig } from '../apps/api/src/config.js';
import { createGrowth } from '../apps/api/src/growth.js';
import { createScripted } from '../apps/api/src/scripted.js';
import type { TrustedScope } from '../packages/contracts/src/index.js';
import type {
  BusinessProfile,
  StockData,
  AgentCard,
} from '../apps/web/src/lib/operations-types.js';

const name = `customerbuddy_expansion_test_${Date.now()}_${randomBytes(4).toString('hex')}`,
  url = await localAdminUrl(),
  admin = createDatabasePool(url),
  creds = await roleCredentials();
await admin.query(`CREATE DATABASE ${name}`);
const u = new URL(url);
u.pathname = '/' + name;
const bootstrap = createDatabasePool(u.toString()),
  runtime = createDatabasePool(connectionForRole(url, 'cb_runtime', creds.runtime, name));
const owner: TrustedScope = { businessId: fixtureBusinessId, role: 'owner', subject: 'demo:owner' },
  farah: TrustedScope = {
    businessId: fixtureBusinessId,
    role: 'customer',
    customerId: demoCustomers[0]!.id,
    subject: demoCustomers[0]!.subject,
  },
  jason: TrustedScope = {
    businessId: fixtureBusinessId,
    role: 'customer',
    customerId: demoCustomers[1]!.id,
    subject: demoCustomers[1]!.subject,
  };
const commerce = createCommerce(runtime),
  ops = createOperations(runtime),
  repos = createRepositories(runtime),
  growth = createGrowth(runtime),
  scripted = createScripted(runtime),
  results: { id: string; status: string; error?: string }[] = [];
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
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
const brownie = fixtureId('brownie-tray'),
  cupcake = fixtureId('cupcake-box');
async function order(s = farah, sku = 'brownie-tray', qty = 1) {
  const q = await commerce.quote(
      s,
      { items: [{ sku, quantity: qty }], pickupDate: '2026-10-10', pickupSlotCode: 'midday' },
      randomUUID(),
    ),
    ch = await commerce.challenge(s, q.id, q.proposalHash, randomUUID());
  return commerce.confirm(
    s,
    { quoteId: q.id, proposalHash: q.proposalHash, challengeToken: ch.challengeToken },
    randomUUID(),
  );
}
try {
  await check('E01 migrations and RLS cover the expansion', async () => {
    assert.equal(await applyMigrations(bootstrap), 7);
    assert.equal(await applyMigrations(bootstrap), 0);
    await seedDemo(bootstrap);
    const tables = (
      await bootstrap.query(
        "SELECT relname FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='app' AND relkind='r' AND relrowsecurity AND relforcerowsecurity",
      )
    ).rows;
    for (const t of ['inventory_movements', 'risk_cases', 'campaign_deliveries', 'order_tracking'])
      assert(tables.some((r) => r.relname === t));
  });
  const config = readConfig();
  server = createApp(config, runtime).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server!.once('listening', r));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('No listener');
  const base = `http://127.0.0.1:${addr.port}/api/v1`;
  async function login(accountKey: string) {
    const r = await fetch(base + '/demo/sessions', {
      method: 'POST',
      headers: { Origin: config.allowedOrigins[0]!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountKey }),
    });
    assert.equal(r.status, 201);
    return {
      Cookie: r.headers.get('set-cookie')!.split(';')[0]!,
      csrf: ((await r.json()) as { csrfToken: string }).csrfToken,
    };
  }
  const boss = await login('owner'),
    customer = await login('farah');
  async function http<T>(
    path: string,
    body?: unknown,
    identity = boss,
    status = 200,
    idem = randomUUID(),
  ) {
    const r = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Cookie: identity.Cookie,
        Origin: config.allowedOrigins[0]!,
        'X-CSRF-Token': identity.csrf,
        'Idempotency-Key': idem,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const v = await r.json();
    assert.equal(r.status, status, `${path}: ${JSON.stringify(v)}`);
    return v as T;
  }
  await check('E02 owner routes deny customers and missing CSRF', async () => {
    for (const path of [
      '/owner/agents',
      '/owner/stock',
      '/owner/members',
      '/owner/sales',
      '/owner/risks',
      '/owner/content',
      '/owner/campaigns',
      '/owner/calendar?month=2026-10',
      '/owner/catalogue',
    ])
      await http(path, undefined, customer, 403);
    await http(
      '/owner/stock',
      { productId: brownie, quantity: 1, kind: 'receipt', note: 'forged' },
      { Cookie: boss.Cookie, csrf: '' },
      403,
    );
  });
  await check('E03 one unique agent card per customer', async () => {
    const a = await http<{ agents: AgentCard[] }>('/owner/agents');
    assert.equal(a.agents.length, 10);
    assert.equal(new Set(a.agents.map((i) => i.id)).size, 10);
    assert(a.agents.some((i) => i.orders > 0));
  });
  await check('E04 configurable non-bakery business publishes facts', async () => {
    const p = await http<BusinessProfile>('/business-profile');
    await http('/owner/business-profile', {
      name: 'Everyday Studio',
      slug: 'everyday-studio',
      sector: 'Retail and tutoring',
      fulfilment: 'appointment',
      version: p.version,
      factsEn:
        'Tutoring and stationery. Appointment slots use daily capacity; 48-hour booking lead time.',
      factsBm: 'Tutor dan alat tulis. Tempahan 48 jam awal.',
    });
    const current = await http<BusinessProfile>('/business-profile', undefined, customer);
    assert.equal(current.name, 'Everyday Studio');
    assert.equal(current.fulfilment, 'appointment');
    assert.equal((await repos.knowledge(farah)).entries[0].content_en.includes('Tutoring'), true);
  });
  await check('E05 member creation is idempotent and optional consent starts off', async () => {
    const key = randomUUID(),
      a = await http<{ id: string }>(
        '/owner/members',
        { name: 'Synthetic Taylor', language: 'en' },
        boss,
        200,
        key,
      ),
      b = await http<{ id: string }>(
        '/owner/members',
        { name: 'Synthetic Taylor', language: 'en' },
        boss,
        200,
        key,
      );
    assert.equal(a.id, b.id);
    const members = await ops.members(owner);
    assert.equal(members.members.length, 11);
    assert.deepEqual(members.members.find((m) => m.id === a.id).consents, {});
    const accounts = await http<{ accounts: { account_key: string; label: string }[] }>(
      '/demo/accounts',
    );
    const account = accounts.accounts.find((a) => a.label.includes('Taylor'));
    assert(account);
    await login(account.account_key);
  });
  await check('E06 stock receipts retry safely and negative stock is denied', async () => {
    const key = randomUUID(),
      input = {
        productId: brownie,
        quantity: 12,
        kind: 'receipt',
        note: 'Synthetic opening stock',
      };
    const a = await ops.movement(owner, input, key),
      b = await ops.movement(owner, input, key);
    assert.equal(a.id, b.id);
    assert.equal((await ops.stock(owner)).items.find((p) => p.product_id === brownie).onHand, 12);
    await assert.rejects(
      () => ops.movement(owner, { ...input, quantity: -13, kind: 'adjustment' }, randomUUID()),
      /STOCK_UNAVAILABLE/,
    );
  });
  let goods: Awaited<ReturnType<typeof order>>;
  await check('E07 checkout reservation prevents overselling tracked stock', async () => {
    goods = await order();
    const inventory = await ops.stock(owner);
    assert.equal(inventory.items.find((p) => p.product_id === brownie).available, 11);
    const q = await commerce.quote(
        jason,
        {
          items: [{ sku: 'brownie-tray', quantity: 12 }],
          pickupDate: '2026-10-11',
          pickupSlotCode: 'midday',
        },
        randomUUID(),
      ),
      ch = await commerce.challenge(jason, q.id, q.proposalHash, randomUUID());
    await assert.rejects(
      () =>
        commerce.confirm(
          jason,
          { quoteId: q.id, proposalHash: q.proposalHash, challengeToken: ch.challengeToken },
          randomUUID(),
        ),
      /STOCK_UNAVAILABLE/,
    );
  });
  await check(
    'E08 fulfilment requires confirmation, tracks preparation and consumes once',
    async () => {
      await assert.rejects(
        () =>
          commerce.status(
            owner,
            goods.id,
            { state: 'preparing', version: goods.version, note: 'premature' },
            randomUUID(),
          ),
        /INVALID_TRANSITION/,
      );
      await commerce.verifyPayment(
        owner,
        { orderId: goods.id, amountSen: 3900, reference: 'SYNTHETIC-E-DEPOSIT' },
        randomUUID(),
      );
      let o = await repos.orders(owner, goods.id);
      await commerce.status(
        owner,
        goods.id,
        { state: 'preparing', version: o.version, note: 'Preparing' },
        randomUUID(),
      );
      o = await repos.orders(owner, goods.id);
      const k = randomUUID(),
        input = { state: 'ready' as const, version: o.version, note: 'Ready' };
      await commerce.status(owner, goods.id, input, k);
      await commerce.status(owner, goods.id, input, k);
      assert.equal((await ops.stock(owner)).items.find((p) => p.product_id === brownie).onHand, 11);
      o = await repos.orders(owner, goods.id);
      await commerce.status(
        owner,
        goods.id,
        { state: 'delivering', version: o.version, note: 'Dispatched' },
        randomUUID(),
      );
      o = await repos.orders(owner, goods.id);
      await assert.rejects(
        () =>
          commerce.status(
            owner,
            goods.id,
            { state: 'completed', version: o.version, note: 'Delivered' },
            randomUUID(),
          ),
        /BALANCE_REQUIRED/,
      );
      await commerce.verifyPayment(
        owner,
        { orderId: goods.id, amountSen: 3900, reference: 'SYNTHETIC-E-BALANCE' },
        randomUUID(),
      );
      o = await repos.orders(owner, goods.id);
      await commerce.status(
        owner,
        goods.id,
        { state: 'completed', version: o.version, note: 'Delivered' },
        randomUUID(),
      );
      const tracking = await http<{ events: { state: string; created_at: string }[] }>(
        `/orders/${goods.id}/tracking`,
        undefined,
        customer,
      );
      assert.deepEqual(
        tracking.events.map((e) => e.state),
        ['awaiting_deposit', 'confirmed', 'preparing', 'ready', 'delivering', 'completed'],
      );
    },
  );
  await check('E09 cancellation restores dispatched stock and preserves payments', async () => {
    const o = await order();
    await commerce.verifyPayment(
      owner,
      { orderId: o.id, amountSen: 3900, reference: 'SYNTHETIC-E-CANCEL' },
      randomUUID(),
    );
    let row = await repos.orders(owner, o.id);
    await commerce.status(
      owner,
      o.id,
      { state: 'ready', version: row.version, note: 'Ready' },
      randomUUID(),
    );
    assert.equal((await ops.stock(owner)).items.find((p) => p.product_id === brownie).onHand, 10);
    row = await repos.orders(owner, o.id);
    await commerce.status(
      owner,
      o.id,
      {
        state: 'cancelled',
        version: row.version,
        reviewed: true,
        note: 'Owner reviewed cancellation',
      },
      randomUUID(),
    );
    assert.equal((await ops.stock(owner)).items.find((p) => p.product_id === brownie).onHand, 11);
    assert.equal((await repos.orders(owner, o.id)).verified_paid_sen, 3900);
  });
  await check('E10 forecasting reconciles history and labels sparse data', async () => {
    const f = await http<StockData>('/owner/stock');
    const p = f.items.find((i) => i.product_id === brownie)!;
    assert.equal(p.predicted7, Math.ceil((p.sold28 / 28) * 7));
    assert.match(p.confidence, /low/);
    assert.equal(p.onHand, 11);
  });
  await check('E11 pricing approval changes new catalogue but not existing orders', async () => {
    const before = await repos.orders(owner, goods.id),
      proposal = await ops.price(owner, brownie, randomUUID());
    assert(proposal.price < 7800);
    await ops.priceDecision(owner, proposal.id, 'approved', randomUUID());
    assert.equal((await repos.orders(owner, goods.id)).total_sen, before.total_sen);
    assert.equal(
      (await repos.catalogue(farah)).find((p) => p.sku === 'brownie-tray').unit_price_sen,
      proposal.price,
    );
    await assert.rejects(
      () => ops.priceDecision(owner, proposal.id, 'approved', randomUUID()),
      /ALREADY_DECIDED/,
    );
  });
  await check(
    'E12 service products book capacity, have no physical stock and retain snapshots',
    async () => {
      const knowledge = await repos.knowledge(owner);
      await ops.product(
        owner,
        {
          sku: 'tutoring-session',
          label: 'Tutoring session',
          description: 'One-to-one study session',
          unitPriceSen: 6000,
          unitsDescription: '60-minute appointment',
          kind: 'service',
          available: true,
          knowledgeVersionId: knowledge.policy.id,
        },
        randomUUID(),
      );
      const product = (await repos.catalogue(farah)).find((p) => p.sku === 'tutoring-session');
      assert(product);
      await commerce.configureCapacity(
        owner,
        { productId: product.product_id, pickupDate: '2026-10-10', maxUnits: 1, version: 0 },
        randomUUID(),
      );
      await order(farah, 'tutoring-session');
      await assert.rejects(() => order(jason, 'tutoring-session'), /CAPACITY_UNAVAILABLE/);
      await assert.rejects(
        () =>
          ops.movement(
            owner,
            { productId: product.product_id, quantity: 1, kind: 'receipt', note: 'Wrong' },
            randomUUID(),
          ),
        /SERVICE_USES_CAPACITY/,
      );
      await assert.rejects(
        async () =>
          ops.product(
            owner,
            {
              sku: 'tutoring-session',
              label: 'Changed',
              description: 'Changed',
              unitPriceSen: 6000,
              unitsDescription: 'Item',
              kind: 'product',
              available: true,
              knowledgeVersionId: (await repos.knowledge(owner)).policy.id,
            },
            randomUUID(),
          ),
        /ORDERED_PRODUCT_KIND_IMMUTABLE/,
      );
    },
  );
  await check('E13 customer recommendation respects optional memory and owner pause', async () => {
    await repos.consents(farah, 'preference_memory', true);
    await repos.putPreference(farah, 'favourite_product_sku', 'tutoring-session');
    assert.equal((await ops.recommendation(farah))?.product.sku, 'tutoring-session');
    const p = await ops.profile(owner);
    await ops.ethics(owner, { ...p.ethics, personalisation: false }, randomUUID());
    assert.match((await ops.recommendation(farah))!.reason, /fallback/);
    await ops.ethics(owner, p.ethics, randomUUID());
  });
  let campaign: string;
  await check('E14 campaign previews and delivery recheck withdrawn consent', async () => {
    await repos.consents(farah, 'marketing', true);
    const m = await growth.draft(
      owner,
      {
        title: 'New availability',
        kind: 'announcement',
        content: 'Our catalogue has new availability.',
        discountPercent: 0,
      },
      randomUUID(),
    );
    campaign = m.id;
    assert((await growth.preview(owner, m.id)).recipients.some((c) => c.id === farah.customerId));
    await repos.consents(farah, 'marketing', false);
    const sent = await growth.send(owner, m.id, randomUUID());
    assert.equal(sent.delivered, 0);
    assert.equal((await growth.inbox(farah)).messages.length, 0);
  });
  await check('E15 personalised campaigns deliver locally once and obey daily caps', async () => {
    await repos.consents(farah, 'marketing', true);
    const m = await growth.draft(
        owner,
        {
          title: 'Your recommendation',
          kind: 'recommendation',
          content: 'An option you may like.',
          discountPercent: 0,
        },
        randomUUID(),
      ),
      k = randomUUID(),
      a = await growth.send(owner, m.id, k),
      b = await growth.send(owner, m.id, k);
    assert.equal(a.delivered, 1);
    assert.equal(b.delivered, 1);
    const messages = (await growth.inbox(farah)).messages;
    assert.equal(messages.length, 1);
    assert.match(messages[0].content, /Tutoring session/);
    assert.equal((await growth.inbox(jason)).messages.length, 0);
    const another = await growth.draft(
      owner,
      {
        title: 'Second message',
        kind: 'promotion',
        content: 'Promotion proposal.',
        discountPercent: 10,
      },
      randomUUID(),
    );
    assert.equal((await growth.send(owner, another.id, randomUUID())).delivered, 0);
    assert(
      (await growth.preview(owner, another.id)).suppressed.some(
        (r) => r.id === farah.customerId && r.reason.includes('cap'),
      ),
    );
  });
  await check('E16 ethical marketing pause and promotion bounds apply at send time', async () => {
    const p = await ops.profile(owner);
    await ops.ethics(
      owner,
      { ...p.ethics, marketingEnabled: false, dailyContactLimit: 3 },
      randomUUID(),
    );
    assert.equal((await growth.preview(owner, campaign)).recipients.length, 0);
    await assert.rejects(
      () =>
        growth.draft(
          owner,
          { title: 'Too much', kind: 'promotion', content: 'Discount', discountPercent: 30 },
          randomUUID(),
        ),
      /PRICE_LIMIT/,
    );
    await ops.ethics(owner, { ...p.ethics, dailyContactLimit: 3 }, randomUUID());
  });
  await check('E17 after-sales campaigns require completed order', async () => {
    const m = await growth.draft(
        owner,
        {
          title: 'How was your order?',
          kind: 'after_sales',
          content: 'Please contact us if you need support.',
          discountPercent: 0,
        },
        randomUUID(),
      ),
      a = await growth.preview(owner, m.id);
    assert(a.recipients.some((r) => r.id === farah.customerId));
    assert(a.suppressed.some((r) => r.id === jason.customerId));
  });
  await check('E18 multilingual content and editable visual persist through approval', async () => {
    for (const language of ['en', 'bm', 'zh']) {
      const d = await growth.generate(
        owner,
        { productId: cupcake, channel: 'email', language, tone: 'friendly' },
        randomUUID(),
      );
      assert.match(d.body, /\{\{customer_name\}\}/);
      assert.equal(d.mode, 'scripted_template');
      await growth.editContent(
        owner,
        d.id,
        {
          title: d.title,
          body: d.body,
          headline: 'Edited headline',
          accent: '#445566',
          state: 'approved',
        },
        randomUUID(),
      );
      const saved = (await growth.content(owner)).drafts.find((r) => r.id === d.id);
      assert.equal(saved.state, 'approved');
      assert.equal(saved.visual_json.headline, 'Edited headline');
    }
  });
  await check('E19 risk cases block verification until human review', async () => {
    const o = await order(farah, 'cupcake-box');
    const caseInfo = await ops.risk(
      owner,
      { orderId: o.id, amountSen: 999999, reference: 'SYNTHETIC-E-RISK' },
      randomUUID(),
    );
    assert.equal(caseInfo.risk, 'review');
    assert(caseInfo.id);
    await assert.rejects(
      () =>
        commerce.verifyPayment(
          owner,
          { orderId: o.id, amountSen: 2400, reference: 'SYNTHETIC-E-RISK' },
          randomUUID(),
        ),
      /PAYMENT_RISK_REVIEW/,
    );
    await ops.riskDecision(
      owner,
      caseInfo.id,
      { state: 'blocked', note: 'Amount mismatch' },
      randomUUID(),
    );
    await assert.rejects(
      () =>
        commerce.verifyPayment(
          owner,
          { orderId: o.id, amountSen: 2400, reference: 'SYNTHETIC-E-RISK' },
          randomUUID(),
        ),
      /PAYMENT_RISK_REVIEW/,
    );
    await ops.riskDecision(
      owner,
      caseInfo.id,
      { state: 'cleared', note: 'Reviewed corrected synthetic receipt' },
      randomUUID(),
    );
    await commerce.verifyPayment(
      owner,
      { orderId: o.id, amountSen: 2400, reference: 'SYNTHETIC-E-RISK' },
      randomUUID(),
    );
    assert.equal((await repos.orders(owner, o.id)).verified_paid_sen, 2400);
  });
  await check('E20 calendar tasks persist and completed orders appear in the agenda', async () => {
    const e = await ops.event(
      owner,
      {
        title: 'Stock planning',
        date: '2026-10-10',
        time: '09:00',
        kind: 'task',
        note: 'Review forecasts',
      },
      randomUUID(),
    );
    const c = await ops.calendar(owner, '2026-10');
    assert(c.events.some((v) => v.id === e.id));
    assert(c.orders.some((v) => v.id === goods.id));
    await ops.eventDone(owner, e.id, true, randomUUID());
    assert.equal(
      (await ops.calendar(owner, '2026-10')).events.find((v) => v.id === e.id).done,
      true,
    );
    await http('/owner/calendar?month=2026-99', undefined, boss, 400);
  });
  await check('E21 sales totals reconcile against ledger and order snapshots', async () => {
    const sales = await ops.sales(owner),
      payments = Number(
        (
          await bootstrap.query(
            "SELECT COALESCE(sum(amount_sen),0) AS n FROM app.payments WHERE state='verified'",
          )
        ).rows[0].n,
      ),
      booked = Number(
        (
          await bootstrap.query(
            "SELECT sum(total_sen) AS n FROM app.orders WHERE state<>'cancelled'",
          )
        ).rows[0].n,
      );
    assert.equal(sales.paidSen, payments);
    assert.equal(sales.totals.booked_sen, booked);
    assert(sales.totals.cancelled_sen > 0);
    assert(
      (await ops.ownerQuery(owner, 'sales and invoices')).reply.includes(
        (payments / 100).toFixed(2),
      ),
    );
  });
  await check(
    'E22 customer scripted recommendations and after-sales create real owner review',
    async () => {
      const conv = await commerce.conversation(farah, 'en', randomUUID()),
        m = await commerce.message(farah, conv.id, 'Please recommend a service', randomUUID()),
        r = await scripted.respond(farah, conv.id, m.id);
      assert.equal(r.intent, 'recommendation');
      const n = await commerce.message(
          farah,
          conv.id,
          'After sales support for a broken product',
          randomUUID(),
        ),
        reply = await scripted.respond(farah, conv.id, n.id);
      assert.equal(reply.intent, 'after_sales');
      const board = await ops.agents(owner),
        agent = board.agents.find((a) => a.id === farah.customerId);
      assert(agent.reviews > 0);
      assert.equal(agent.conversation.state, 'waiting_owner');
    },
  );
  await check('E23 customer cannot read another inbox, risk ledger or tracking', async () => {
    const own = await withScope(runtime, jason, async (c) => ({
      tracking: (await c.query('SELECT * FROM app.order_tracking WHERE order_id=$1', [goods.id]))
        .rows,
      stock: (await c.query('SELECT * FROM app.inventory_movements')).rows,
      cases: (await c.query('SELECT * FROM app.risk_cases')).rows,
      inbox: (await c.query('SELECT * FROM app.campaign_deliveries')).rows,
    }));
    assert.equal(own.tracking.length, 0);
    assert.equal(own.stock.length, 0);
    assert.equal(own.cases.length, 0);
    assert.equal(own.inbox.length, 0);
    await http('/owner/members', { name: 'Forbidden', language: 'en' }, customer, 403);
  });
  await check('E24 persisted state survives a new application instance and pool', async () => {
    const restarted = createDatabasePool(connectionForRole(url, 'cb_runtime', creds.runtime, name));
    try {
      const again = createOperations(restarted);
      assert.equal((await again.profile(owner)).name, 'Everyday Studio');
      assert.equal(
        (await again.stock(owner)).items.find((p) => p.product_id === brownie).onHand,
        11,
      );
      assert.equal((await createGrowth(restarted).inbox(farah)).messages.length, 1);
    } finally {
      await restarted.end();
    }
  });
} finally {
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  await Promise.all([runtime.end(), bootstrap.end()]);
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.end();
  await mkdir('docs/evidence/expansion', { recursive: true });
  await writeFile(
    'docs/evidence/expansion/integration.json',
    JSON.stringify(
      { recordedAt: new Date().toISOString(), disposableDatabaseRemoved: true, results },
      null,
      2,
    ),
  );
}
