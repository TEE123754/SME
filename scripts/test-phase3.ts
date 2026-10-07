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
  fixtureId,
  demoCustomers,
  withScope,
} from '../packages/db/src/index.js';
import type { Pool } from '../packages/db/src/index.js';
import type { TrustedScope } from '../packages/contracts/src/index.js';
import { depositSen } from '../packages/domain/src/index.js';
import { policySchema } from '../packages/contracts/src/index.js';
import { createApp } from '../apps/api/src/app.js';
import { readConfig } from '../apps/api/src/config.js';
import { localAdminUrl, roleCredentials, connectionForRole, rootDirectory } from './database.js';
const database = `customerbuddy_phase3_test_${Date.now()}_${randomBytes(4).toString('hex')}`;
if (!/^customerbuddy_phase3_test_\d+_[a-f0-9]{8}$/.test(database))
  throw new Error('Unsafe disposable database name');
const adminUrl = await localAdminUrl(),
  admin = createDatabasePool(adminUrl),
  credentials = await roleCredentials();
let bootstrap: Pool | undefined, runtime: Pool | undefined, worker: Pool | undefined;
let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
const results: { name: string; status: string; error?: string }[] = [];
const code = (expected: string) => (error: unknown) =>
  (error as { code?: string }).code === expected;
async function check(name: string, work: () => Promise<void>) {
  try {
    await work();
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
const farah: TrustedScope = {
  businessId: fixtureBusinessId,
  customerId: demoCustomers[0]!.id,
  subject: demoCustomers[0]!.subject,
  role: 'customer',
};
const jason: TrustedScope = {
  businessId: fixtureBusinessId,
  customerId: demoCustomers[1]!.id,
  subject: demoCustomers[1]!.subject,
  role: 'customer',
};
const owner: TrustedScope = { businessId: fixtureBusinessId, subject: 'demo:owner', role: 'owner' };
const base = '2026-10-07T02:00:00Z';
const request = (sku = 'brownie-tray', date = '2026-10-10', quantity = 1) => ({
  items: [{ sku, quantity }],
  pickupDate: date,
  pickupSlotCode: 'midday',
});
try {
  await admin.query(`CREATE DATABASE ${database}`);
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  bootstrap = createDatabasePool(url.toString());
  await bootstrap.query(`REVOKE CONNECT,TEMPORARY ON DATABASE ${database} FROM PUBLIC`);
  await bootstrap.query(`GRANT CONNECT ON DATABASE ${database} TO cb_runtime,cb_worker`);
  await check('P3-01 fresh migration and checksummed replay', async () => {
    assert.equal(await applyMigrations(bootstrap!), 3);
    assert.equal(await applyMigrations(bootstrap!), 0);
    await seedDemo(bootstrap!);
  });
  runtime = createDatabasePool(
    connectionForRole(adminUrl, 'cb_runtime', credentials.runtime, database),
  );
  worker = createDatabasePool(
    connectionForRole(adminUrl, 'cb_worker', credentials.worker, database),
  );
  const pool = runtime,
    service = createCommerce(pool),
    repos = createRepositories(pool);
  const clock = async (instant: string) => {
    await bootstrap!.query('UPDATE app.demo_settings SET base_demo_time=$1,paused=true', [instant]);
  };
  const order = async (id: string) =>
    withScope(
      pool,
      owner,
      async (c) =>
        (await c.query('SELECT *,pickup_date::text FROM app.orders WHERE id=$1', [id])).rows[0],
    );
  const bucket = async (sku: string, date: string) =>
    withScope(
      pool,
      owner,
      async (c) =>
        (
          await c.query(
            'SELECT * FROM app.capacity_buckets WHERE product_id=$1 AND pickup_date=$2',
            [fixtureId(sku), date],
          )
        ).rows[0],
    );
  async function prepared(scope: TrustedScope, input = request()) {
    const quote = await service.quote(scope, input, randomUUID());
    const token = await service.challenge(scope, quote.id, quote.proposalHash, randomUUID());
    return {
      quote,
      input: {
        quoteId: quote.id,
        proposalHash: quote.proposalHash,
        challengeToken: token.challengeToken,
      },
    };
  }
  async function booked(scope: TrustedScope, input = request()) {
    const p = await prepared(scope, input);
    return service.confirm(scope, p.input, randomUUID());
  }
  await check('P3-02 RM78/RM39 and RM48/RM24 use integer server pricing', async () => {
    const a = await service.quote(farah, request(), randomUUID()),
      b = await service.quote(jason, request('cupcake-box'), randomUUID());
    assert.equal(a.totalSen, 7800);
    assert.equal(a.depositSen, 3900);
    assert.equal(b.totalSen, 4800);
    assert.equal(b.depositSen, 2400);
    assert.equal(depositSen(101, 5000), 51);
    assert.equal((await bucket('brownie-tray', '2026-10-10')).held_units, 0);
  });
  await check(
    'P3-03 exact pickup lead time, unknown products and duplicate lines denied',
    async () => {
      await assert.rejects(
        service.quote(farah, request('brownie-tray', '2026-10-08'), randomUUID()),
        code('LEAD_TIME_REQUIRED'),
      );
      await assert.rejects(
        service.quote(farah, request('unknown'), randomUUID()),
        code('NOT_FOUND'),
      );
      await assert.rejects(
        service.quote(
          farah,
          {
            ...request(),
            items: [
              { sku: 'brownie-tray', quantity: 1 },
              { sku: 'brownie-tray', quantity: 1 },
            ],
          },
          randomUUID(),
        ),
      );
    },
  );
  await check('P3-04 forged confirmation, wrong customer and changed hash denied', async () => {
    const p = await prepared(farah);
    await assert.rejects(
      service.confirm(
        farah,
        { ...p.input, challengeToken: randomBytes(32).toString('base64url') },
        randomUUID(),
      ),
      code('INVALID_CONFIRMATION'),
    );
    await assert.rejects(service.confirm(jason, p.input, randomUUID()), code('NOT_FOUND'));
    await assert.rejects(
      service.confirm(farah, { ...p.input, proposalHash: 'a'.repeat(64) }, randomUUID()),
      code('PROPOSAL_CHANGED'),
    );
  });
  await check(
    'P3-05 quote expiry, challenge expiry and edit invalidate old acceptance',
    async () => {
      const p = await prepared(farah);
      await clock('2026-10-07T02:06:00Z');
      await assert.rejects(
        service.confirm(farah, p.input, randomUUID()),
        code('INVALID_CONFIRMATION'),
      );
      await clock('2026-10-07T02:31:00Z');
      await assert.rejects(
        service.challenge(farah, p.quote.id, p.quote.proposalHash, randomUUID()),
        code('QUOTE_EXPIRED'),
      );
      assert.equal((await service.readQuote(farah, p.quote.id)).state, 'expired');
      await clock(base);
      const edited = await prepared(farah);
      const replacement = await service.editQuote(
        farah,
        edited.quote.id,
        request('cupcake-box'),
        randomUUID(),
      );
      assert.equal(replacement.totalSen, 4800);
      await assert.rejects(
        service.confirm(farah, edited.input, randomUUID()),
        code('QUOTE_NOT_ACTIVE'),
      );
    },
  );
  let mainOrder: string;
  await check('P3-06 parallel duplicate confirmation is atomic and idempotent', async () => {
    const p = await prepared(farah),
      key = randomUUID();
    const [a, b] = await Promise.all([
      service.confirm(farah, p.input, key),
      service.confirm(farah, p.input, key),
    ]);
    assert.deepEqual(a, b);
    mainOrder = a.id;
    assert.equal((await bucket('brownie-tray', '2026-10-10')).held_units, 1);
    await assert.rejects(
      service.confirm(farah, { ...p.input, proposalHash: 'b'.repeat(64) }, key),
      code('IDEMPOTENCY_MISMATCH'),
    );
    await assert.rejects(service.confirm(farah, p.input, randomUUID()), code('QUOTE_NOT_ACTIVE'));
  });
  await check(
    'P3-07 last-unit contention produces one order and no partial allocation',
    async () => {
      await bootstrap!.query(
        "UPDATE app.capacity_buckets SET max_units=1 WHERE product_id=$1 AND pickup_date='2026-10-11'",
        [fixtureId('brownie-tray')],
      );
      const a = await prepared(farah, request('brownie-tray', '2026-10-11')),
        b = await prepared(jason, request('brownie-tray', '2026-10-11'));
      const result = await Promise.allSettled([
        service.confirm(farah, a.input, randomUUID()),
        service.confirm(jason, b.input, randomUUID()),
      ]);
      assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal((await bucket('brownie-tray', '2026-10-11')).held_units, 1);
      assert.equal(
        (
          await bootstrap!.query(
            "SELECT count(*)::int AS n FROM app.orders WHERE pickup_date='2026-10-11'",
          )
        ).rows[0].n,
        1,
      );
    },
  );
  await check(
    'P3-08 duplicate payment commits capacity once and reference mismatch is denied',
    async () => {
      const input = { orderId: mainOrder!, amountSen: 3900, reference: 'SYNTHETIC-DEPOSIT-MAIN' },
        key = randomUUID();
      const [a, b] = await Promise.all([
        service.verifyPayment(owner, input, key),
        service.verifyPayment(owner, input, key),
      ]);
      assert.deepEqual(a, b);
      assert.equal(a.state, 'confirmed');
      assert.equal((await bucket('brownie-tray', '2026-10-10')).held_units, 0);
      assert.equal((await bucket('brownie-tray', '2026-10-10')).committed_units, 1);
      await service.verifyPayment(owner, input, randomUUID());
      assert.equal(
        (
          await bootstrap!.query('SELECT count(*)::int AS n FROM app.payments WHERE reference=$1', [
            input.reference,
          ])
        ).rows[0].n,
        1,
      );
      await assert.rejects(
        async () => service.verifyPayment(owner, { ...input, amountSen: 3901 }, randomUUID()),
        code('PAYMENT_REFERENCE_MISMATCH'),
      );
      await assert.rejects(
        async () =>
          service.verifyPayment(
            owner,
            { ...input, reference: 'SYNTHETIC-TOO-MUCH', amountSen: 3901 },
            randomUUID(),
          ),
        code('OVERPAYMENT_REQUIRES_REVIEW'),
      );
    },
  );
  await check(
    'P3-09 partial deposit holds until threshold and queues distinct receipts',
    async () => {
      const o = await booked(jason, request('cupcake-box', '2026-10-12'));
      assert.equal(
        (
          await service.verifyPayment(
            owner,
            { orderId: o.id, amountSen: 1000, reference: 'SYNTHETIC-PART-1' },
            randomUUID(),
          )
        ).state,
        'awaiting_deposit',
      );
      assert.equal(
        (
          await service.verifyPayment(
            owner,
            { orderId: o.id, amountSen: 1400, reference: 'SYNTHETIC-PART-2' },
            randomUUID(),
          )
        ).state,
        'confirmed',
      );
      assert.equal((await bucket('cupcake-box', '2026-10-12')).committed_units, 1);
    },
  );
  await check(
    'P3-10 unpaid hold expiry is idempotent and competing booking lazily releases other customer',
    async () => {
      const prior = await booked(farah, request('cupcake-box', '2026-10-13'));
      await clock('2026-10-08T03:00:00Z');
      const fresh = await booked(jason, request('cupcake-box', '2026-10-13'));
      assert.equal((await order(prior.id)).state, 'cancelled');
      assert.equal((await order(fresh.id)).state, 'awaiting_deposit');
      assert.equal((await bucket('cupcake-box', '2026-10-13')).held_units, 1);
      await service.expire(owner, '2026-10-13');
      assert.equal((await bucket('cupcake-box', '2026-10-13')).held_units, 1);
      await clock(base);
    },
  );
  let lateOrder: string, lateApproval: { id: string; proposalHash: string; version: number };
  await check('P3-11 expiry/payment race records late payment without overbooking', async () => {
    const o = await booked(farah, request('brownie-tray', '2026-10-14'));
    lateOrder = o.id;
    await clock('2026-10-08T02:00:00Z');
    const [payment] = await Promise.all([
      service.verifyPayment(
        owner,
        { orderId: o.id, amountSen: 3900, reference: 'SYNTHETIC-LATE' },
        randomUUID(),
      ),
      service.expire(owner, '2026-10-14'),
    ]);
    assert.equal(payment.requiresReview, true);
    assert.equal(payment.state, 'cancelled');
    lateApproval = payment.approval!;
    assert.equal((await bucket('brownie-tray', '2026-10-14')).held_units, 0);
    assert.equal((await bucket('brownie-tray', '2026-10-14')).committed_units, 0);
  });
  await check(
    'P3-12 late-payment approval needs fresh capacity and exact current proposal',
    async () => {
      const b = await bucket('brownie-tray', '2026-10-14');
      await service.configureCapacity(
        owner,
        { productId: b.product_id, pickupDate: '2026-10-14', version: b.version, maxUnits: 0 },
        randomUUID(),
      );
      const input = {
        decision: 'approve' as const,
        proposalHash: lateApproval!.proposalHash,
        version: 1,
        note: 'Reviewed synthetic late payment',
      };
      await assert.rejects(
        service.decision(
          owner,
          lateApproval!.id,
          { ...input, proposalHash: 'c'.repeat(64) },
          randomUUID(),
        ),
        code('STALE_APPROVAL'),
      );
      await assert.rejects(
        service.decision(owner, lateApproval!.id, input, randomUUID()),
        code('CAPACITY_UNAVAILABLE'),
      );
      const next = await bucket('brownie-tray', '2026-10-14');
      await service.configureCapacity(
        owner,
        {
          productId: next.product_id,
          pickupDate: '2026-10-14',
          version: next.version,
          maxUnits: 10,
        },
        randomUUID(),
      );
      await service.decision(owner, lateApproval!.id, input, randomUUID());
      assert.equal((await order(lateOrder!)).state, 'confirmed');
      assert.equal((await bucket('brownie-tray', '2026-10-14')).committed_units, 1);
      await clock(base);
    },
  );
  await check(
    'P3-13 approved discount creates new quote requiring customer acceptance',
    async () => {
      const q = await service.quote(farah, request('brownie-tray', '2026-10-15'), randomUUID());
      const a = await service.exception(
        farah,
        {
          kind: 'discount',
          quoteId: q.id,
          discountBasisPoints: 1000,
          note: 'Synthetic loyalty request',
        },
        randomUUID(),
      );
      const input = {
          decision: 'approve' as const,
          version: a.version,
          proposalHash: a.proposalHash,
          note: 'Approve exact offer',
        },
        key = randomUUID();
      const accepted = await service.decision(owner, a.id, input, key);
      assert.equal(accepted.quote!.totalSen, 7020);
      assert.equal(accepted.quote!.depositSen, 3510);
      assert.deepEqual(await service.decision(owner, a.id, input, key), accepted);
      const token = await service.challenge(
        farah,
        accepted.quote!.id,
        accepted.quote!.proposalHash,
        randomUUID(),
      );
      const o = await service.confirm(
        farah,
        {
          quoteId: token.quoteId,
          proposalHash: token.proposalHash,
          challengeToken: token.challengeToken,
        },
        randomUUID(),
      );
      assert.equal(o.totalSen, 7020);
    },
  );
  await check('P3-14 rejected and expired approvals cannot authorize discounts', async () => {
    const q = await service.quote(jason, request('cupcake-box', '2026-10-16'), randomUUID());
    const a = await service.exception(
      jason,
      { kind: 'discount', quoteId: q.id, discountBasisPoints: 2000, note: 'Request' },
      randomUUID(),
    );
    const input = {
      decision: 'reject' as const,
      proposalHash: a.proposalHash,
      version: 1,
      note: 'Declined',
    };
    assert.equal((await service.decision(owner, a.id, input, randomUUID())).quote, null);
    await assert.rejects(
      service.decision(owner, a.id, { ...input, decision: 'approve' }, randomUUID()),
      code('STALE_APPROVAL'),
    );
    const b = await service.exception(
      jason,
      { kind: 'discount', quoteId: q.id, discountBasisPoints: 1000, note: 'New exact proposal' },
      randomUUID(),
    );
    await clock('2026-10-07T02:31:00Z');
    await assert.rejects(
      service.decision(
        owner,
        b.id,
        { ...input, decision: 'approve', proposalHash: b.proposalHash },
        randomUUID(),
      ),
      code('STALE_APPROVAL'),
    );
    await clock(base);
  });
  await check('P3-15 takeover persists messages and requires explicit owner resume', async () => {
    const convo = await service.conversation(farah, 'bm', randomUUID());
    await service.takeover(owner, convo.id, true, randomUUID());
    const message = await service.message(farah, convo.id, 'Owner please help', randomUUID());
    assert.equal(message.humanTakeover, true);
    assert.equal(message.dispatch, 'deferred_phase5');
    assert.equal((await service.messages(farah, convo.id)).length, 1);
    await assert.rejects(service.messages(jason, convo.id), code('NOT_FOUND'));
    await assert.rejects(
      async () => service.takeover(farah, convo.id, false, randomUUID()),
      code('OWNER_ONLY'),
    );
    assert.equal((await service.takeover(owner, convo.id, false, randomUUID())).state, 'active');
  });
  await check(
    'P3-16 order handoff rejects stale decisions and preserves financial snapshots',
    async () => {
      const a = await service.handoff(
        farah,
        mainOrder!,
        'Complaint for owner',
        undefined,
        randomUUID(),
      );
      const before = await order(mainOrder!);
      assert.equal(before.exception_paused, true);
      await assert.rejects(
        service.resumeOrder(owner, mainOrder!, before.version, randomUUID()),
        code('PENDING_APPROVAL'),
      );
      await service.decision(
        owner,
        a.id,
        {
          decision: 'reject',
          proposalHash: a.proposalHash,
          version: 1,
          note: 'Reviewed; no amendment',
        },
        randomUUID(),
      );
      await service.resumeOrder(owner, mainOrder!, before.version, randomUUID());
      assert.equal((await order(mainOrder!)).total_sen, '7800');
      const stale = await service.handoff(
        farah,
        mainOrder!,
        'Another case',
        undefined,
        randomUUID(),
      );
      await bootstrap!.query('UPDATE app.orders SET version=version+1 WHERE id=$1', [mainOrder!]);
      await assert.rejects(
        service.decision(
          owner,
          stale.id,
          {
            decision: 'approve',
            proposalHash: stale.proposalHash,
            version: 1,
            note: 'Stale review',
          },
          randomUUID(),
        ),
        code('STALE_APPROVAL'),
      );
    },
  );
  await check(
    'P3-17 reviewed cancellation releases committed allocation once and retains payments',
    async () => {
      const before = await order(lateOrder!);
      await assert.rejects(
        service.status(
          owner,
          lateOrder!,
          { state: 'cancelled', version: before.version, note: 'Cancel' },
          randomUUID(),
        ),
        code('REVIEW_REQUIRED'),
      );
      const input = {
          state: 'cancelled' as const,
          version: before.version,
          reviewed: true,
          note: 'Reviewed cancellation; refund handled by owner',
        },
        key = randomUUID();
      const a = await service.status(owner, lateOrder!, input, key);
      assert.deepEqual(await service.status(owner, lateOrder!, input, key), a);
      assert.equal((await bucket('brownie-tray', '2026-10-14')).committed_units, 0);
      assert.equal(
        (
          await bootstrap!.query('SELECT amount_sen FROM app.payments WHERE order_id=$1', [
            lateOrder!,
          ])
        ).rows[0].amount_sen,
        '3900',
      );
    },
  );
  await check(
    'P3-18 fulfilment needs full balance and retains completed production capacity',
    async () => {
      const o = await booked(jason, request('cupcake-box', '2026-10-15'));
      await service.verifyPayment(
        owner,
        { orderId: o.id, amountSen: 2400, reference: 'SYNTHETIC-FULFIL-DEPOSIT' },
        randomUUID(),
      );
      let current = await order(o.id);
      await service.status(
        owner,
        o.id,
        { state: 'ready', version: current.version, note: 'Ready' },
        randomUUID(),
      );
      current = await order(o.id);
      await assert.rejects(
        service.status(
          owner,
          o.id,
          { state: 'completed', version: current.version, note: 'Collected' },
          randomUUID(),
        ),
        code('BALANCE_REQUIRED'),
      );
      await service.verifyPayment(
        owner,
        { orderId: o.id, amountSen: 2400, reference: 'SYNTHETIC-FULFIL-BALANCE' },
        randomUUID(),
      );
      current = await order(o.id);
      await service.status(
        owner,
        o.id,
        { state: 'completed', version: current.version, note: 'Collected' },
        randomUUID(),
      );
      assert.equal((await bucket('cupcake-box', '2026-10-15')).committed_units, 1);
    },
  );
  await check(
    'P3-19 owner capacity cannot fall below booked units or accept stale versions',
    async () => {
      const b = await bucket('cupcake-box', '2026-10-15'),
        input = {
          productId: b.product_id,
          pickupDate: '2026-10-15',
          version: b.version,
          maxUnits: 0,
        };
      await assert.rejects(
        async () => service.configureCapacity(owner, input, randomUUID()),
        code('BOOKED_CAPACITY'),
      );
      await assert.rejects(
        async () =>
          service.configureCapacity(owner, { ...input, version: 0, maxUnits: 10 }, randomUUID()),
        code('STALE_CAPACITY'),
      );
      await assert.rejects(
        async () => service.configureCapacity(farah, { ...input, maxUnits: 10 }, randomUUID()),
        code('OWNER_ONLY'),
      );
    },
  );
  await check(
    'P3-20 publishing changes invalidate quotes and approvals without editing old prices',
    async () => {
      const q = await prepared(farah, request('brownie-tray', '2026-10-16'));
      const a = await service.exception(
        farah,
        { kind: 'discount', quoteId: q.quote.id, discountBasisPoints: 1000, note: 'Request' },
        randomUUID(),
      );
      const knowledge = await repos.knowledge(owner),
        catalogue = await repos.catalogue(owner);
      const publication = {
        expectedKnowledgeVersionId: q.quote.knowledgeVersionId,
        policy: policySchema.parse(knowledge.policy.policy_json),
        catalogue: catalogue.map((i) => ({
          sku: i.sku,
          label: i.label,
          description: i.description,
          unitPriceSen: Number(i.unit_price_sen) + 100,
          unitsDescription: i.units_description,
          available: true,
        })),
      };
      await service.publish(owner, publication, randomUUID());
      await assert.rejects(service.confirm(farah, q.input, randomUUID()), code('POLICY_CHANGED'));
      await assert.rejects(
        service.decision(
          owner,
          a.id,
          { decision: 'approve', proposalHash: a.proposalHash, version: 1, note: 'Old policy' },
          randomUUID(),
        ),
        code('STALE_APPROVAL'),
      );
      assert.equal((await service.readQuote(farah, q.quote.id)).total_sen, 7800);
      assert.equal(
        (await service.quote(farah, request('brownie-tray', '2026-10-16'), randomUUID())).totalSen,
        7900,
      );
    },
  );
  await check(
    'P3-21 commercial snapshots, audit and owner authority remain protected',
    async () => {
      await assert.rejects(
        withScope(pool, owner, (c) =>
          c.query('UPDATE app.quotes SET total_sen=1 WHERE id=$1', [fixtureId('quote-farah')]),
        ),
        code('23514'),
      );
      await assert.rejects(
        withScope(pool, owner, (c) =>
          c.query('UPDATE app.orders SET total_sen=1 WHERE id=$1', [mainOrder!]),
        ),
        code('23514'),
      );
      await assert.rejects(
        withScope(pool, farah, (c) =>
          c.query('UPDATE app.capacity_buckets SET max_units=max_units+1'),
        ),
        code('42501'),
      );
      await assert.rejects(
        async () =>
          service.verifyPayment(
            farah,
            { orderId: mainOrder!, amountSen: 1, reference: 'SYNTHETIC-FORGED' },
            randomUUID(),
          ),
        code('OWNER_ONLY'),
      );
      await assert.rejects(async () => service.dashboard(farah), code('OWNER_ONLY'));
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM app.orders')).rows[0].n, 0);
      assert.equal(
        (
          await withScope(pool, jason, (c) =>
            c.query('SELECT * FROM app.orders WHERE id=$1', [mainOrder!]),
          )
        ).rowCount,
        0,
      );
      assert.ok((await service.dashboard(owner)).verifiedSyntheticPaymentSen > 0);
    },
  );
  await check(
    'P3-22 transaction outbox records real documents/reminders without fabricating files',
    async () => {
      const rows = (
        await bootstrap!.query('SELECT kind,state FROM app.outbox_events WHERE entity_id=$1', [
          mainOrder!,
        ])
      ).rows;
      assert.ok(rows.some((r) => r.kind === 'invoice' && r.state === 'queued'));
      assert.ok(rows.some((r) => r.kind === 'deposit_reminder'));
      assert.equal(
        (await bootstrap!.query('SELECT count(*)::int AS n FROM app.documents')).rows[0].n,
        0,
      );
      assert.equal(
        (
          await bootstrap!.query(
            "SELECT count(*)::int AS n FROM app.outbox_events WHERE kind='receipt'",
          )
        ).rows[0].n,
        (
          await bootstrap!.query(
            "SELECT count(*)::int AS n FROM app.payments WHERE reference NOT LIKE 'SYNTHETIC-HISTORY-%'",
          )
        ).rows[0].n,
      );
    },
  );
  server = createApp(readConfig(), pool).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server!.once('listening', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing address');
  const api = `http://127.0.0.1:${address.port}/api/v1`;
  const origin = readConfig().allowedOrigins[0]!;
  const login = async (accountKey: string) => {
    const response = await fetch(`${api}/demo/sessions`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountKey }),
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as { csrfToken: string };
    return {
      Cookie: response.headers.get('set-cookie')!.split(';')[0]!,
      Origin: origin,
      'Content-Type': 'application/json',
      'X-CSRF-Token': body.csrfToken,
      'Idempotency-Key': randomUUID(),
    };
  };
  await check(
    'P3-23 HTTP commerce validates scope, CSRF, keys and rejects fabricated totals',
    async () => {
      const headers = await login('farah');
      let response = await fetch(`${api}/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...request(), totalSen: 1, customerId: jason.customerId }),
      });
      assert.equal(response.status, 400);
      response = await fetch(`${api}/quotes`, {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': '' },
        body: JSON.stringify(request()),
      });
      assert.equal(response.status, 400);
      response = await fetch(`${api}/quotes`, {
        method: 'POST',
        headers: { ...headers, 'X-CSRF-Token': '' },
        body: JSON.stringify(request()),
      });
      assert.equal(response.status, 403);
      response = await fetch(`${api}/owner/payments/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: mainOrder!,
          amountSen: 1,
          reference: 'SYNTHETIC-HTTP-FORGE',
        }),
      });
      assert.equal(response.status, 403);
      response = await fetch(`${api}/orders/${mainOrder!}`, { headers: await login('jason') });
      assert.equal(response.status, 404);
      response = await fetch(`${api}/owner/dashboard`, { headers: await login('owner') });
      assert.equal(response.status, 200);
    },
  );
  await check(
    'P3-24 HTTP quote to challenge to order persists across new service instance',
    async () => {
      const headers = await login('farah');
      const q = (await (
        await fetch(`${api}/quotes`, {
          method: 'POST',
          headers,
          body: JSON.stringify(request('brownie-tray', '2026-10-16')),
        })
      ).json()) as { id: string; proposalHash: string };
      const t = (await (
        await fetch(`${api}/quotes/${q.id}/confirmation-challenge`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ proposalHash: q.proposalHash }),
        })
      ).json()) as { challengeToken: string };
      const response = await fetch(`${api}/orders/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          quoteId: q.id,
          proposalHash: q.proposalHash,
          challengeToken: t.challengeToken,
        }),
      });
      assert.equal(response.status, 201);
      const o = (await response.json()) as { id: string };
      assert.equal(
        ((await createRepositories(pool).orders(farah, o.id)) as { state: string }).state,
        'awaiting_deposit',
      );
    },
  );
  await check(
    'P3-25 multi-product capacity failure leaves no order and zero-deposit policy commits directly',
    async () => {
      const before = Number(
        (await bootstrap!.query('SELECT count(*) AS n FROM app.orders')).rows[0].n,
      );
      await bootstrap!.query(
        "UPDATE app.capacity_buckets SET max_units=0 WHERE product_id=$1 AND pickup_date='2026-10-16'",
        [fixtureId('cupcake-box')],
      );
      const p = await prepared(jason, {
        ...request('brownie-tray', '2026-10-16'),
        items: [
          { sku: 'brownie-tray', quantity: 1 },
          { sku: 'cupcake-box', quantity: 1 },
        ],
      });
      await assert.rejects(
        service.confirm(jason, p.input, randomUUID()),
        code('CAPACITY_UNAVAILABLE'),
      );
      assert.equal(
        Number((await bootstrap!.query('SELECT count(*) AS n FROM app.orders')).rows[0].n),
        before,
      );
      const knowledge = await repos.knowledge(owner),
        cat = await repos.catalogue(owner);
      await service.publish(
        owner,
        {
          expectedKnowledgeVersionId: knowledge.policy.id,
          policy: {
            ...policySchema.parse(knowledge.policy.policy_json),
            depositBasisPoints: 0,
            allowedExceptionTypes: [],
          },
          catalogue: cat.map((i) => ({
            sku: i.sku,
            label: i.label,
            description: i.description,
            unitPriceSen: i.unit_price_sen,
            unitsDescription: i.units_description,
            available: true,
          })),
        },
        randomUUID(),
      );
      const o = await booked(jason, request('brownie-tray', '2026-10-16'));
      assert.equal(o.state, 'confirmed');
      assert.equal(o.holdExpiresAt, null);
      assert.equal(
        (
          await bootstrap!.query(
            "SELECT count(*)::int AS n FROM app.outbox_events WHERE entity_id=$1 AND kind='deposit_reminder'",
            [o.id],
          )
        ).rows[0].n,
        0,
      );
      const q = await service.quote(jason, request('brownie-tray', '2026-10-16'), randomUUID());
      await assert.rejects(
        service.exception(
          jason,
          {
            kind: 'discount',
            quoteId: q.id,
            discountBasisPoints: 1000,
            note: 'Not supported by policy',
          },
          randomUUID(),
        ),
        code('EXCEPTION_NOT_SUPPORTED'),
      );
    },
  );
} finally {
  if (server)
    await new Promise<void>((resolve, reject) => server!.close((e) => (e ? reject(e) : resolve())));
  await Promise.all([runtime?.end(), worker?.end(), bootstrap?.end()]);
  await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.end();
  await mkdir(resolve(rootDirectory, 'docs/evidence'), { recursive: true });
  await writeFile(
    resolve(rootDirectory, 'docs/evidence/phase3-integration.json'),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        phase: 3,
        implementation: 'Codex local synthetic reference',
        disposableDatabaseRemoved: true,
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
console.log(`Phase 3 integration passed: ${results.length} cases; disposable database removed.`);
