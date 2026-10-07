import { randomUUID, randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { TrustedScope } from '@customerbuddy/contracts';
import {
  policySchema,
  quoteRequestSchema,
  confirmRequestSchema,
  paymentRequestSchema,
  exceptionRequestSchema,
  decisionRequestSchema,
  statusRequestSchema,
  publishRequestSchema,
  capacityChangeSchema,
} from '@customerbuddy/contracts';
import type { z } from 'zod';
import { depositSen, proposalHash, pickupInstant } from '@customerbuddy/domain';
import { withScope } from './scope.js';
import { DataError } from './repositories.js';

type QuoteInput = z.infer<typeof quoteRequestSchema>;
type Item = {
  productId: string;
  catalogueItemId: string;
  sku: string;
  label: string;
  quantity: number;
  unitPriceSen: number;
  lineTotalSen: number;
};
type Offer = {
  knowledgeVersionId: string;
  items: Item[];
  pickupDate: string;
  pickupSlotId: string;
  totalSen: number;
  depositSen: number;
};
type Quote = {
  id: string;
  customer_id: string;
  knowledge_version_id: string;
  items_json: Item[];
  pickup_date: string;
  pickup_slot_id: string;
  total_sen: string;
  deposit_sen: string;
  proposal_hash: string;
  approval_id: string | null;
  expires_at: Date;
  state: string;
};
type Order = {
  id: string;
  customer_id: string;
  pickup_date: string;
  state: string;
  version: number;
  total_sen: string;
  deposit_required_sen: string;
  exception_paused: boolean;
};
type Approval = {
  id: string;
  customer_id: string;
  order_id: string | null;
  conversation_id: string | null;
  kind: string;
  proposal_json: {
    offer?: Offer;
    quoteHash?: string;
    orderVersion?: number;
    paidSen?: number;
    note?: string;
  };
  proposal_hash: string;
  policy_version_id: string;
  version: number;
  state: string;
  expires_at: Date;
};
function requireCustomer(s: TrustedScope): string {
  if (s.role !== 'customer' || !s.customerId) throw new DataError('CUSTOMER_ONLY', 403);
  return s.customerId;
}
function requireOwner(s: TrustedScope) {
  if (s.role !== 'owner') throw new DataError('OWNER_ONLY', 403);
}
function notFound<T>(value: T | undefined): T {
  if (!value) throw new DataError('NOT_FOUND', 404);
  return value;
}
const conflict = (code: string): never => {
  throw new DataError(code, 409);
};
async function now(c: PoolClient): Promise<Date> {
  const r = await c.query<{ instant: Date }>('SELECT app.business_now() AS instant');
  if (!r.rows[0]?.instant) throw new DataError('CLOCK_UNAVAILABLE', 503);
  return r.rows[0].instant;
}
async function businessLock(c: PoolClient, s: TrustedScope) {
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [s.businessId]);
}
async function dateLock(c: PoolClient, s: TrustedScope, date: string) {
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3004))', [
    `${s.businessId}:${date}`,
  ]);
}
async function published(c: PoolClient) {
  const row = notFound(
    (
      await c.query(
        "SELECT k.* FROM app.knowledge_versions k JOIN app.businesses b ON b.active_knowledge_version_id=k.id WHERE k.state='published'",
      )
    ).rows[0],
  );
  return { id: row.id as string, policy: policySchema.parse(row.policy_json) };
}
async function audit(
  c: PoolClient,
  s: TrustedScope,
  cid: string | null,
  action: string,
  id: string,
  details: Record<string, unknown> = {},
) {
  await c.query(
    `INSERT INTO app.audit_events(id,business_id,customer_id,actor_type,actor_subject,action,entity_type,entity_id,correlation_id,safe_details_json,occurred_at) VALUES($1,$2,$3,$4,$5,$6,'commerce',$7,$8,$9,app.business_now())`,
    [
      randomUUID(),
      s.businessId,
      cid,
      s.role,
      s.subject,
      action,
      id,
      randomUUID(),
      JSON.stringify(details),
    ],
  );
}
async function outbox(
  c: PoolClient,
  s: TrustedScope,
  cid: string,
  kind: string,
  entity: string,
  payload: Record<string, unknown> = {},
) {
  await c.query(
    `INSERT INTO app.outbox_events(id,business_id,customer_id,kind,entity_id,action_key,payload_json,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,app.business_now())`,
    [
      randomUUID(),
      s.businessId,
      cid,
      kind,
      entity,
      `${kind}:${entity}:v1${kind === 'order_status' ? ':' + proposalHash(payload).slice(0, 16) : ''}`,
      JSON.stringify(payload),
    ],
  );
}
async function idem<T>(
  c: PoolClient,
  s: TrustedScope,
  operation: string,
  key: string,
  input: unknown,
  work: () => Promise<T>,
): Promise<T> {
  const hash = proposalHash(input);
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3002))', [
    `${s.businessId}:${s.subject}:${operation}:${key}`,
  ]);
  const existing = (
    await c.query(
      'SELECT request_hash,result_json FROM app.idempotency_records WHERE business_id=$1 AND actor_subject=$2 AND operation=$3 AND key=$4',
      [s.businessId, s.subject, operation, key],
    )
  ).rows[0];
  if (existing) {
    if (existing.request_hash !== hash) conflict('IDEMPOTENCY_MISMATCH');
    return existing.result_json as T;
  }
  const result = await work();
  await c.query(
    `INSERT INTO app.idempotency_records(id,business_id,actor_subject,operation,key,request_hash,state,result_json) VALUES($1,$2,$3,$4,$5,$6,'completed',$7)`,
    [randomUUID(), s.businessId, s.subject, operation, key, hash, JSON.stringify(result)],
  );
  return result;
}
async function price(c: PoolClient, input: QuoteInput, discount = 0): Promise<Offer> {
  input = quoteRequestSchema.parse(input);
  const knowledge = await published(c),
    instant = await now(c);
  const slot = notFound(
    (
      await c.query('SELECT * FROM app.pickup_slots WHERE code=$1 AND active', [
        input.pickupSlotCode,
      ])
    ).rows[0],
  );
  if (
    pickupInstant(input.pickupDate, slot.start_local).getTime() <
    instant.getTime() + knowledge.policy.leadTimeHours * 3600000
  )
    conflict('LEAD_TIME_REQUIRED');
  const items: Item[] = [];
  for (const requested of [...input.items].sort((a, b) => a.sku.localeCompare(b.sku))) {
    const product = notFound(
      (
        await c.query(
          `SELECT p.id,p.sku,i.id AS catalogue_id,i.label,i.unit_price_sen FROM app.products p JOIN app.catalogue_items i ON i.product_id=p.id AND i.business_id=p.business_id WHERE p.sku=$1 AND p.active AND i.available AND i.knowledge_version_id=$2`,
          [requested.sku, knowledge.id],
        )
      ).rows[0],
    );
    const unit = Math.floor((Number(product.unit_price_sen) * (10000 - discount)) / 10000);
    items.push({
      productId: product.id,
      catalogueItemId: product.catalogue_id,
      sku: product.sku,
      label: product.label,
      quantity: requested.quantity,
      unitPriceSen: unit,
      lineTotalSen: unit * requested.quantity,
    });
  }
  const total = items.reduce((sum, item) => sum + item.lineTotalSen, 0);
  if (total <= 0 || total > 10000000) throw new DataError('INVALID_TOTAL');
  return {
    knowledgeVersionId: knowledge.id,
    items,
    pickupDate: input.pickupDate,
    pickupSlotId: slot.id,
    totalSen: total,
    depositSen: depositSen(total, knowledge.policy.depositBasisPoints),
  };
}
async function insertQuote(
  c: PoolClient,
  s: TrustedScope,
  cid: string,
  offer: Offer,
  approvalId: string | null = null,
) {
  const knowledge = await published(c),
    instant = await now(c),
    id = randomUUID(),
    hash = proposalHash(offer);
  const expiry = new Date(instant.getTime() + knowledge.policy.quoteLifetimeMinutes * 60000);
  await c.query(
    `INSERT INTO app.quotes(id,business_id,customer_id,knowledge_version_id,items_json,pickup_date,pickup_slot_id,total_sen,deposit_sen,proposal_hash,approval_id,expires_at,state,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',$13)`,
    [
      id,
      s.businessId,
      cid,
      offer.knowledgeVersionId,
      JSON.stringify(offer.items),
      offer.pickupDate,
      offer.pickupSlotId,
      offer.totalSen,
      offer.depositSen,
      hash,
      approvalId,
      expiry,
      instant,
    ],
  );
  await audit(c, s, cid, 'quote_created', id, { totalSen: offer.totalSen, approvalId });
  await outbox(c, s, cid, 'quote_document', id);
  return {
    id,
    ...offer,
    proposalHash: hash,
    expiresAt: expiry.toISOString(),
    state: 'active',
    isSynthetic: true,
  };
}
async function getQuote(c: PoolClient, id: string): Promise<Quote> {
  return notFound(
    (await c.query<Quote>(`SELECT *,pickup_date::text FROM app.quotes WHERE id=$1`, [id])).rows[0],
  );
}
async function validQuote(c: PoolClient, q: Quote) {
  if (q.state !== 'active') conflict('QUOTE_NOT_ACTIVE');
  if (q.expires_at.getTime() <= (await now(c)).getTime()) conflict('QUOTE_EXPIRED');
  const knowledge = await published(c);
  if (q.knowledge_version_id !== knowledge.id) conflict('POLICY_CHANGED');
  const slot = notFound(
    (
      await c.query('SELECT start_local FROM app.pickup_slots WHERE id=$1 AND active', [
        q.pickup_slot_id,
      ])
    ).rows[0],
  );
  if (
    pickupInstant(q.pickup_date, slot.start_local).getTime() <
    (await now(c)).getTime() + knowledge.policy.leadTimeHours * 3600000
  )
    conflict('LEAD_TIME_REQUIRED');
  if (q.approval_id) {
    const a = notFound(
      (await c.query<Approval>('SELECT * FROM app.approvals WHERE id=$1', [q.approval_id])).rows[0],
    );
    if (
      a.state !== 'approved' ||
      a.policy_version_id !== knowledge.id ||
      a.proposal_json.quoteHash !== q.proposal_hash
    )
      conflict('APPROVAL_CHANGED');
  }
  return knowledge;
}
async function getOrder(c: PoolClient, id: string): Promise<Order> {
  return notFound(
    (await c.query<Order>('SELECT *,pickup_date::text FROM app.orders WHERE id=$1', [id])).rows[0],
  );
}
async function allocations(c: PoolClient, id: string) {
  return (
    await c.query<{ capacity_bucket_id: string; quantity: number }>(
      'SELECT i.capacity_bucket_id,i.quantity FROM app.reservation_items i JOIN app.reservations r ON r.id=i.reservation_id WHERE r.order_id=$1 ORDER BY i.capacity_bucket_id',
      [id],
    )
  ).rows;
}
async function paymentTotal(c: PoolClient, id: string): Promise<number> {
  return Number(
    (
      await c.query(
        "SELECT COALESCE(sum(amount_sen),0) AS amount FROM app.payments WHERE order_id=$1 AND state='verified'",
        [id],
      )
    ).rows[0].amount,
  );
}
async function reservation(c: PoolClient, id: string) {
  return notFound(
    (
      await c.query<{ id: string; state: string; expires_at: Date }>(
        'SELECT * FROM app.reservations WHERE order_id=$1 FOR UPDATE',
        [id],
      )
    ).rows[0],
  );
}
async function newApproval(
  c: PoolClient,
  s: TrustedScope,
  cid: string,
  kind: string,
  proposal: Approval['proposal_json'],
  orderId: string | null = null,
  conversationId: string | null = null,
) {
  const knowledge = await published(c),
    id = randomUUID(),
    hash = proposalHash(proposal),
    instant = await now(c),
    expiry = new Date(instant.getTime() + 30 * 60000);
  await c.query(
    `INSERT INTO app.approvals(id,business_id,customer_id,order_id,conversation_id,kind,proposal_json,proposal_hash,policy_version_id,expires_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id,
      s.businessId,
      cid,
      orderId,
      conversationId,
      kind,
      JSON.stringify(proposal),
      hash,
      knowledge.id,
      expiry,
      instant,
    ],
  );
  await audit(c, s, cid, 'approval_requested', id, { kind });
  return {
    id,
    kind,
    proposal,
    proposalHash: hash,
    version: 1,
    state: 'pending',
    expiresAt: expiry.toISOString(),
  };
}
export function createCommerce(pool: Pool) {
  // Coarse per-business serialization precedes date locks. This deliberate MVP tradeoff
  // coordinates policy/approval mutations with booking and avoids lock-order cycles.
  const tx = <T>(s: TrustedScope, work: (c: PoolClient) => Promise<T>) =>
    withScope(pool, s, async (c) => {
      await businessLock(c, s);
      return work(c);
    });
  return {
    quote(s: TrustedScope, input: QuoteInput, key: string) {
      requireCustomer(s);
      return tx(s, (c) =>
        idem(c, s, 'quote', key, input, async () =>
          insertQuote(c, s, s.customerId!, await price(c, input)),
        ),
      );
    },
    editQuote(s: TrustedScope, id: string, input: QuoteInput, key: string) {
      requireCustomer(s);
      return tx(s, (c) =>
        idem(c, s, 'edit_quote', key, { id, ...input }, async () => {
          const q = await getQuote(c, id);
          if (q.state !== 'active') conflict('QUOTE_NOT_ACTIVE');
          const quote = await insertQuote(c, s, s.customerId!, await price(c, input));
          await c.query("UPDATE app.quotes SET state='superseded' WHERE id=$1", [id]);
          return quote;
        }),
      );
    },
    readQuote(s: TrustedScope, id: string) {
      return withScope(pool, s, async (c) => {
        const q = await getQuote(c, id);
        return {
          ...q,
          total_sen: Number(q.total_sen),
          deposit_sen: Number(q.deposit_sen),
          state: q.state === 'active' && q.expires_at <= (await now(c)) ? 'expired' : q.state,
        };
      });
    },
    challenge(s: TrustedScope, id: string, hash: string, key: string) {
      requireCustomer(s);
      return tx(s, (c) =>
        idem(c, s, 'challenge', key, { id, hash }, async () => {
          const q = await getQuote(c, id);
          await validQuote(c, q);
          if (q.proposal_hash !== hash) conflict('PROPOSAL_CHANGED');
          const token = randomBytes(32).toString('base64url'),
            instant = await now(c),
            expiry = new Date(Math.min(q.expires_at.getTime(), instant.getTime() + 5 * 60000));
          await c.query(
            'INSERT INTO app.confirmation_challenges(id,business_id,customer_id,quote_id,proposal_hash,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
            [randomUUID(), s.businessId, s.customerId, id, hash, proposalHash(token), expiry],
          );
          return {
            quoteId: id,
            proposalHash: hash,
            challengeToken: token,
            expiresAt: expiry.toISOString(),
          };
        }),
      );
    },
    confirm(s: TrustedScope, input: z.infer<typeof confirmRequestSchema>, key: string) {
      requireCustomer(s);
      return tx(s, (c) =>
        idem(c, s, 'confirm', key, input, async () => {
          const q = await getQuote(c, input.quoteId),
            knowledge = await validQuote(c, q);
          if (q.proposal_hash !== input.proposalHash) conflict('PROPOSAL_CHANGED');
          const challenge = (
            await c.query(
              'SELECT * FROM app.confirmation_challenges WHERE quote_id=$1 AND token_hash=$2 FOR UPDATE',
              [q.id, proposalHash(input.challengeToken)],
            )
          ).rows[0];
          if (
            !challenge ||
            challenge.consumed_at ||
            challenge.proposal_hash !== q.proposal_hash ||
            challenge.expires_at <= (await now(c))
          )
            conflict('INVALID_CONFIRMATION');
          await dateLock(c, s, q.pickup_date);
          await c.query('SELECT app.expire_date($1::date)', [q.pickup_date]);
          const buckets: { id: string; item: Item }[] = [];
          for (const item of q.items_json) {
            const bucket = (
              await c.query(
                'SELECT * FROM app.capacity_buckets WHERE product_id=$1 AND pickup_date=$2 FOR UPDATE',
                [item.productId, q.pickup_date],
              )
            ).rows[0];
            if (
              !bucket ||
              bucket.max_units - bucket.held_units - bucket.committed_units < item.quantity
            )
              conflict('CAPACITY_UNAVAILABLE');
            buckets.push({ id: bucket.id, item });
          }
          const total = q.items_json.reduce((sum, i) => sum + i.lineTotalSen, 0);
          if (
            total !== Number(q.total_sen) ||
            q.items_json.some((i) => i.lineTotalSen !== i.unitPriceSen * i.quantity)
          )
            conflict('INVALID_SNAPSHOT');
          const id = randomUUID(),
            hold = randomUUID(),
            instant = await now(c),
            expires = new Date(instant.getTime() + knowledge.policy.holdLifetimeHours * 3600000);
          await c.query(
            `INSERT INTO app.orders(id,business_id,customer_id,display_code,quote_id,knowledge_version_id,pickup_date,pickup_slot_id,total_sen,deposit_required_sen,state,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'awaiting_deposit',$11,$11)`,
            [
              id,
              s.businessId,
              s.customerId,
              `DEMO-${id.slice(0, 8).toUpperCase()}`,
              q.id,
              q.knowledge_version_id,
              q.pickup_date,
              q.pickup_slot_id,
              total,
              Number(q.deposit_sen),
              instant,
            ],
          );
          await c.query(
            "INSERT INTO app.reservations(id,business_id,customer_id,order_id,state,expires_at) VALUES($1,$2,$3,$4,'held',$5)",
            [hold, s.businessId, s.customerId, id, expires],
          );
          for (const { id: bucket, item } of buckets) {
            await c.query(
              'INSERT INTO app.order_items(id,business_id,customer_id,order_id,product_id,catalogue_item_id,sku_snapshot,label_snapshot,quantity,unit_price_sen,line_total_sen) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
              [
                randomUUID(),
                s.businessId,
                s.customerId,
                id,
                item.productId,
                item.catalogueItemId,
                item.sku,
                item.label,
                item.quantity,
                item.unitPriceSen,
                item.lineTotalSen,
              ],
            );
            await c.query(
              'INSERT INTO app.reservation_items(reservation_id,business_id,customer_id,capacity_bucket_id,quantity) VALUES($1,$2,$3,$4,$5)',
              [hold, s.businessId, s.customerId, bucket, item.quantity],
            );
            await c.query(
              'UPDATE app.capacity_buckets SET held_units=held_units+$2,version=version+1 WHERE id=$1',
              [bucket, item.quantity],
            );
          }
          const state = Number(q.deposit_sen) === 0 ? 'confirmed' : 'awaiting_deposit';
          if (state === 'confirmed') {
            for (const { id: bucket, item } of buckets)
              await c.query(
                'UPDATE app.capacity_buckets SET held_units=held_units-$2,committed_units=committed_units+$2,version=version+1 WHERE id=$1',
                [bucket, item.quantity],
              );
            await c.query(
              "UPDATE app.reservations SET state='committed',committed_at=$2 WHERE id=$1",
              [hold, instant],
            );
            await c.query("UPDATE app.orders SET state='confirmed' WHERE id=$1", [id]);
          }
          await c.query("UPDATE app.quotes SET state='accepted' WHERE id=$1", [q.id]);
          await c.query('UPDATE app.confirmation_challenges SET consumed_at=$2 WHERE id=$1', [
            challenge.id,
            instant,
          ]);
          await audit(c, s, s.customerId!, 'order_reserved', id, {
            totalSen: total,
            depositSen: Number(q.deposit_sen),
          });
          await outbox(c, s, s.customerId!, 'invoice', id);
          await outbox(c, s, s.customerId!, 'summary', id);
          if (state === 'awaiting_deposit')
            await outbox(c, s, s.customerId!, 'deposit_reminder', id, {
              dueAt: new Date(
                instant.getTime() + knowledge.policy.reminderDelayHours * 3600000,
              ).toISOString(),
              holdExpiresAt: expires.toISOString(),
            });
          return {
            id,
            state,
            totalSen: total,
            depositRequiredSen: Number(q.deposit_sen),
            holdExpiresAt: state === 'awaiting_deposit' ? expires.toISOString() : null,
            version: 1,
            isSynthetic: true,
          };
        }),
      );
    },
    verifyPayment(s: TrustedScope, input: z.infer<typeof paymentRequestSchema>, key: string) {
      requireOwner(s);
      return tx(s, (c) =>
        idem(c, s, 'payment', key, input, async () => {
          let order = await getOrder(c, input.orderId);
          await dateLock(c, s, order.pickup_date);
          await c.query('SELECT app.expire_date($1::date)', [order.pickup_date]);
          order = await getOrder(c, order.id);
          const prior = (
            await c.query('SELECT id,order_id,amount_sen FROM app.payments WHERE reference=$1', [
              input.reference,
            ])
          ).rows[0];
          if (prior) {
            if (prior.order_id !== order.id || Number(prior.amount_sen) !== input.amountSen)
              conflict('PAYMENT_REFERENCE_MISMATCH');
            return {
              paymentId: prior.id,
              orderId: order.id,
              state: order.state,
              isSynthetic: true,
              replayed: true,
            };
          }
          const paid = await paymentTotal(c, order.id);
          if (paid + input.amountSen > Number(order.total_sen))
            conflict('OVERPAYMENT_REQUIRES_REVIEW');
          const hold = await reservation(c, order.id),
            late = hold.state === 'released',
            id = randomUUID(),
            instant = await now(c);
          await c.query(
            "INSERT INTO app.payments(id,business_id,customer_id,order_id,amount_sen,reference,verified_by,verified_at,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'verified')",
            [
              id,
              s.businessId,
              order.customer_id,
              order.id,
              input.amountSen,
              input.reference,
              s.subject,
              instant,
            ],
          );
          let state = order.state,
            approval = null;
          if (late) {
            await c.query(
              'UPDATE app.orders SET exception_paused=true,version=version+1,updated_at=$2 WHERE id=$1',
              [order.id, instant],
            );
            order = await getOrder(c, order.id);
            approval = await newApproval(
              c,
              s,
              order.customer_id,
              'late_payment',
              { orderVersion: order.version, paidSen: paid + input.amountSen },
              order.id,
            );
          } else if (
            hold.state === 'held' &&
            paid + input.amountSen >= Number(order.deposit_required_sen)
          ) {
            for (const a of await allocations(c, order.id))
              await c.query(
                'UPDATE app.capacity_buckets SET held_units=held_units-$2,committed_units=committed_units+$2,version=version+1 WHERE id=$1',
                [a.capacity_bucket_id, a.quantity],
              );
            await c.query(
              "UPDATE app.reservations SET state='committed',committed_at=$2 WHERE id=$1",
              [hold.id, instant],
            );
            state = 'confirmed';
            await c.query(
              "UPDATE app.orders SET state='confirmed',version=version+1,updated_at=$2 WHERE id=$1",
              [order.id, instant],
            );
          }
          await outbox(c, s, order.customer_id, 'receipt', id, { orderId: order.id });
          await audit(c, s, order.customer_id, 'payment_verified', id, {
            orderId: order.id,
            amountSen: input.amountSen,
            requiresReview: late,
          });
          return {
            paymentId: id,
            orderId: order.id,
            state,
            paidSen: paid + input.amountSen,
            balanceSen: Number(order.total_sen) - paid - input.amountSen,
            requiresReview: late,
            approval,
            isSynthetic: true,
          };
        }),
      );
    },
    exception(s: TrustedScope, input: z.infer<typeof exceptionRequestSchema>, key: string) {
      const cid = requireCustomer(s);
      return tx(s, (c) =>
        idem(c, s, 'exception', key, input, async () => {
          if (!(await published(c)).policy.allowedExceptionTypes.includes(input.kind))
            conflict('EXCEPTION_NOT_SUPPORTED');
          if (input.kind === 'discount') {
            const q = await getQuote(c, input.quoteId);
            await validQuote(c, q);
            const slot = notFound(
              (await c.query('SELECT code FROM app.pickup_slots WHERE id=$1', [q.pickup_slot_id]))
                .rows[0],
            );
            const offer = await price(
              c,
              {
                items: q.items_json.map((i) => ({ sku: i.sku, quantity: i.quantity })),
                pickupDate: q.pickup_date,
                pickupSlotCode: slot.code,
              },
              input.discountBasisPoints,
            );
            return newApproval(c, s, cid, 'discount', {
              offer,
              quoteHash: proposalHash(offer),
              note: input.note,
            });
          }
          let order: Order | undefined;
          if (input.orderId) {
            order = await getOrder(c, input.orderId);
            await c.query(
              'UPDATE app.orders SET exception_paused=true,version=version+1,updated_at=app.business_now() WHERE id=$1',
              [order.id],
            );
            order = await getOrder(c, order.id);
          }
          if (input.conversationId) {
            notFound(
              (
                await c.query('SELECT id FROM app.conversations WHERE id=$1', [
                  input.conversationId,
                ])
              ).rows[0],
            );
            await c.query(
              "UPDATE app.conversations SET state='waiting_owner',human_takeover=true,updated_at=app.business_now() WHERE id=$1",
              [input.conversationId],
            );
          }
          return newApproval(
            c,
            s,
            cid,
            input.kind,
            { note: input.note, orderVersion: order?.version },
            order?.id ?? null,
            input.conversationId ?? null,
          );
        }),
      );
    },
    approvals(s: TrustedScope) {
      requireOwner(s);
      return withScope(
        pool,
        s,
        async (c) =>
          (
            await c.query(
              `SELECT a.*,CASE WHEN a.state='pending' AND a.expires_at<=app.business_now() THEN 'expired'
              WHEN a.state='pending' AND (a.policy_version_id<>(SELECT active_knowledge_version_id FROM app.businesses WHERE id=a.business_id)
                OR (a.order_id IS NOT NULL AND (SELECT version FROM app.orders WHERE id=a.order_id)<>(a.proposal_json->>'orderVersion')::integer)) THEN 'superseded'
              ELSE a.state END AS effective_state FROM app.approvals a ORDER BY a.created_at DESC LIMIT 100`,
            )
          ).rows,
      );
    },
    decision(
      s: TrustedScope,
      id: string,
      input: z.infer<typeof decisionRequestSchema>,
      key: string,
    ) {
      requireOwner(s);
      return tx(s, (c) =>
        idem(c, s, 'decision', key, { id, ...input }, async () => {
          const a = notFound(
              (await c.query<Approval>('SELECT * FROM app.approvals WHERE id=$1 FOR UPDATE', [id]))
                .rows[0],
            ),
            knowledge = await published(c);
          if (
            a.state !== 'pending' ||
            a.version !== input.version ||
            a.proposal_hash !== input.proposalHash ||
            a.expires_at <= (await now(c)) ||
            a.policy_version_id !== knowledge.id
          )
            conflict('STALE_APPROVAL');
          let order: Order | undefined;
          if (a.order_id) {
            order = await getOrder(c, a.order_id);
            if (order.version !== a.proposal_json.orderVersion) conflict('STALE_APPROVAL');
          }
          let quote = null;
          if (input.decision === 'approve' && a.kind === 'discount') {
            const offer = notFound(a.proposal_json.offer);
            if (proposalHash(offer) !== a.proposal_json.quoteHash) conflict('INVALID_PROPOSAL');
            const slot = notFound(
              (
                await c.query('SELECT start_local FROM app.pickup_slots WHERE id=$1 AND active', [
                  offer.pickupSlotId,
                ])
              ).rows[0],
            );
            if (
              pickupInstant(offer.pickupDate, slot.start_local).getTime() <
              (await now(c)).getTime() + knowledge.policy.leadTimeHours * 3600000
            )
              conflict('LEAD_TIME_REQUIRED');
            quote = await insertQuote(c, s, a.customer_id, offer, a.id);
          }
          if (input.decision === 'approve' && a.kind === 'late_payment' && order) {
            await dateLock(c, s, order.pickup_date);
            await c.query('SELECT app.expire_date($1::date)', [order.pickup_date]);
            const paid = await paymentTotal(c, order.id);
            if (paid !== a.proposal_json.paidSen || paid < Number(order.deposit_required_sen))
              conflict('DEPOSIT_REQUIRED');
            const slot = notFound(
              (
                await c.query(
                  'SELECT start_local FROM app.pickup_slots WHERE id=(SELECT pickup_slot_id FROM app.orders WHERE id=$1)',
                  [order.id],
                )
              ).rows[0],
            );
            if (pickupInstant(order.pickup_date, slot.start_local) <= (await now(c)))
              conflict('PICKUP_PASSED');
            const hold = await reservation(c, order.id);
            if (hold.state !== 'released' || order.state !== 'cancelled')
              conflict('STALE_APPROVAL');
            for (const x of await allocations(c, order.id)) {
              const b = notFound(
                (
                  await c.query('SELECT * FROM app.capacity_buckets WHERE id=$1 FOR UPDATE', [
                    x.capacity_bucket_id,
                  ])
                ).rows[0],
              );
              if (b.max_units - b.held_units - b.committed_units < x.quantity)
                conflict('CAPACITY_UNAVAILABLE');
              await c.query(
                'UPDATE app.capacity_buckets SET committed_units=committed_units+$2,version=version+1 WHERE id=$1',
                [x.capacity_bucket_id, x.quantity],
              );
            }
            await c.query(
              "UPDATE app.reservations SET state='committed',committed_at=app.business_now() WHERE id=$1",
              [hold.id],
            );
            await c.query(
              "UPDATE app.orders SET state='confirmed',exception_paused=false,version=version+1,updated_at=app.business_now() WHERE id=$1",
              [order.id],
            );
          }
          // Complex complaints/custom/refund cases are recorded as reviewed human cases.
          // Approval does not edit paid snapshots, execute refunds or silently resume automation.
          await c.query(
            'UPDATE app.approvals SET state=$2,version=version+1,decided_by=$3,decided_at=app.business_now(),decision_note=$4 WHERE id=$1',
            [a.id, input.decision === 'approve' ? 'approved' : 'rejected', s.subject, input.note],
          );
          await audit(c, s, a.customer_id, 'approval_decided', a.id, {
            decision: input.decision,
            kind: a.kind,
          });
          return {
            id: a.id,
            state: input.decision === 'approve' ? 'approved' : 'rejected',
            version: a.version + 1,
            quote,
            humanCase: ['complaint', 'custom_order', 'refund_request'].includes(a.kind),
          };
        }),
      );
    },
    status(s: TrustedScope, id: string, input: z.infer<typeof statusRequestSchema>, key: string) {
      requireOwner(s);
      return tx(s, (c) =>
        idem(c, s, 'status', key, { id, ...input }, async () => {
          let order = await getOrder(c, id);
          await dateLock(c, s, order.pickup_date);
          await c.query('SELECT app.expire_date($1::date)', [order.pickup_date]);
          order = await getOrder(c, id);
          if (order.version !== input.version) conflict('STALE_ORDER');
          if (input.state === 'cancelled') {
            if (!input.reviewed) conflict('REVIEW_REQUIRED');
            if (order.state === 'completed' || order.state === 'cancelled')
              conflict('INVALID_TRANSITION');
            const hold = await reservation(c, id);
            if (hold.state !== 'released')
              for (const a of await allocations(c, id))
                await c.query(
                  `UPDATE app.capacity_buckets SET ${hold.state === 'held' ? 'held_units' : 'committed_units'}=${hold.state === 'held' ? 'held_units' : 'committed_units'}-$2,version=version+1 WHERE id=$1`,
                  [a.capacity_bucket_id, a.quantity],
                );
            await c.query(
              "UPDATE app.reservations SET state='released',released_at=app.business_now() WHERE id=$1",
              [hold.id],
            );
          } else {
            if (order.exception_paused) conflict('EXCEPTION_PAUSED');
            if (
              (input.state === 'ready' && order.state !== 'confirmed') ||
              (input.state === 'completed' && order.state !== 'ready')
            )
              conflict('INVALID_TRANSITION');
            if (
              input.state === 'completed' &&
              (await paymentTotal(c, id)) < Number(order.total_sen)
            )
              conflict('BALANCE_REQUIRED');
          }
          await c.query(
            'UPDATE app.orders SET state=$2,version=version+1,updated_at=app.business_now() WHERE id=$1',
            [id, input.state],
          );
          if (input.state === 'cancelled') {
            await c.query(
              "UPDATE app.jobs SET state='suppressed' WHERE order_id=$1 AND kind='deposit_reminder' AND state='queued'",
              [id],
            );
            await c.query(
              "UPDATE app.outbox_events SET state='suppressed',updated_at=app.business_now() WHERE entity_id=$1 AND kind='deposit_reminder' AND state='queued'",
              [id],
            );
          }
          await audit(c, s, order.customer_id, 'order_status_changed', id, {
            state: input.state,
            reviewed: input.reviewed ?? false,
            note: input.note,
          });
          await outbox(
            c,
            s,
            order.customer_id,
            input.state === 'cancelled' ? 'suppress_reminder' : 'order_status',
            id,
            { state: input.state },
          );
          return { id, state: input.state, version: order.version + 1, paymentsRetained: true };
        }),
      );
    },
    expire(s: TrustedScope, date: string) {
      requireOwner(s);
      return tx(s, async (c) => ({
        released: Number(
          (await c.query('SELECT app.expire_date($1::date) AS n', [date])).rows[0].n,
        ),
      }));
    },
    dashboard(s: TrustedScope) {
      requireOwner(s);
      return withScope(pool, s, async (c) => {
        const totals = (
          await c.query(
            `SELECT count(*)::integer AS orders,count(*) FILTER(WHERE state='awaiting_deposit')::integer AS awaiting_deposit,count(*) FILTER(WHERE state='confirmed')::integer AS confirmed,count(*) FILTER(WHERE exception_paused)::integer AS paused FROM app.orders`,
          )
        ).rows[0];
        const paid = Number(
          (
            await c.query(
              "SELECT COALESCE(sum(amount_sen),0) AS paid FROM app.payments WHERE state='verified'",
            )
          ).rows[0].paid,
        );
        return {
          ...totals,
          verifiedSyntheticPaymentSen: paid,
          pendingApprovals: Number(
            (
              await c.query(
                `SELECT count(*) AS n FROM app.approvals a WHERE a.state='pending' AND a.expires_at>app.business_now()
                 AND a.policy_version_id=(SELECT active_knowledge_version_id FROM app.businesses WHERE id=a.business_id)
                 AND (a.order_id IS NULL OR (SELECT version FROM app.orders WHERE id=a.order_id)=(a.proposal_json->>'orderVersion')::integer)`,
              )
            ).rows[0].n,
          ),
          demoTime: (await now(c)).toISOString(),
          isSynthetic: true,
        };
      });
    },
    conversations(s: TrustedScope) {
      return withScope(
        pool,
        s,
        async (c) =>
          (await c.query('SELECT * FROM app.conversations ORDER BY created_at DESC LIMIT 100'))
            .rows,
      );
    },
    conversation(s: TrustedScope, language: 'bm' | 'en', key: string) {
      const cid = requireCustomer(s);
      return tx(s, (c) =>
        idem(c, s, 'conversation', key, { language }, async () => {
          const id = randomUUID();
          await c.query(
            'INSERT INTO app.conversations(id,business_id,customer_id,language,created_at,updated_at) VALUES($1,$2,$3,$4,app.business_now(),app.business_now())',
            [id, s.businessId, cid, language],
          );
          return { id, state: 'active', humanTakeover: false, language };
        }),
      );
    },
    messages(s: TrustedScope, id: string) {
      return withScope(pool, s, async (c) => {
        notFound((await c.query('SELECT id FROM app.conversations WHERE id=$1', [id])).rows[0]);
        return (
          await c.query(
            'SELECT * FROM app.messages WHERE conversation_id=$1 ORDER BY created_at,id LIMIT 200',
            [id],
          )
        ).rows;
      });
    },
    message(s: TrustedScope, id: string, content: string, key: string) {
      if (s.role !== 'customer' && s.role !== 'owner') throw new DataError('FORBIDDEN', 403);
      return tx(s, (c) =>
        idem(c, s, 'message', key, { id, content }, async () => {
          const conversation = notFound(
            (await c.query('SELECT * FROM app.conversations WHERE id=$1 FOR UPDATE', [id])).rows[0],
          );
          if (conversation.state === 'closed') conflict('CONVERSATION_CLOSED');
          const messageId = randomUUID();
          await c.query(
            `INSERT INTO app.messages(id,business_id,customer_id,conversation_id,role,content,created_at) VALUES($1,$2,$3,$4,$5,$6,GREATEST(app.business_now(),COALESCE((SELECT MAX(created_at)+interval '1 millisecond' FROM app.messages WHERE conversation_id=$4),app.business_now())))`,
            [messageId, s.businessId, conversation.customer_id, id, s.role, content],
          );
          return {
            id: messageId,
            conversationId: id,
            state: conversation.state,
            humanTakeover: conversation.human_takeover,
            dispatch: 'deferred_phase5',
          };
        }),
      );
    },
    handoff(
      s: TrustedScope,
      id: string,
      note: string,
      conversationId: string | undefined,
      key: string,
    ) {
      requireCustomer(s);
      return this.exception(
        s,
        { kind: 'complaint', orderId: id, note, ...(conversationId ? { conversationId } : {}) },
        key,
      );
    },
    takeover(s: TrustedScope, id: string, takeover: boolean, key: string) {
      requireOwner(s);
      return tx(s, (c) =>
        idem(c, s, 'takeover', key, { id, takeover }, async () => {
          const conversation = notFound(
            (await c.query('SELECT * FROM app.conversations WHERE id=$1', [id])).rows[0],
          );
          if (conversation.state === 'closed') conflict('CONVERSATION_CLOSED');
          await c.query(
            'UPDATE app.conversations SET human_takeover=$2,state=$3,updated_at=app.business_now() WHERE id=$1',
            [id, takeover, takeover ? 'waiting_owner' : 'active'],
          );
          await audit(
            c,
            s,
            conversation.customer_id,
            takeover ? 'human_takeover' : 'human_resume',
            id,
          );
          return { id, humanTakeover: takeover, state: takeover ? 'waiting_owner' : 'active' };
        }),
      );
    },
    resumeOrder(s: TrustedScope, id: string, version: number, key: string) {
      requireOwner(s);
      return tx(s, (c) =>
        idem(c, s, 'resume', key, { id, version }, async () => {
          const order = await getOrder(c, id);
          if (order.version !== version) conflict('STALE_ORDER');
          if (
            (
              await c.query(
                "SELECT id FROM app.approvals WHERE order_id=$1 AND state='pending' AND expires_at>app.business_now()",
                [id],
              )
            ).rowCount
          )
            conflict('PENDING_APPROVAL');
          await c.query(
            'UPDATE app.orders SET exception_paused=false,version=version+1,updated_at=app.business_now() WHERE id=$1',
            [id],
          );
          await audit(c, s, order.customer_id, 'order_resumed', id);
          return { id, version: version + 1, exceptionPaused: false };
        }),
      );
    },
    publish(s: TrustedScope, input: z.infer<typeof publishRequestSchema>, key: string) {
      requireOwner(s);
      return tx(s, (c) =>
        idem(c, s, 'publish', key, input, async () => {
          const current = await published(c);
          if (current.id !== input.expectedKnowledgeVersionId) conflict('POLICY_CHANGED');
          const activeProducts = (
            await c.query<{ id: string; sku: string }>(
              'SELECT id,sku FROM app.products WHERE active',
            )
          ).rows;
          if (
            input.catalogue.length !== activeProducts.length ||
            input.catalogue.some((i) => !activeProducts.some((p) => p.sku === i.sku))
          )
            throw new DataError('COMPLETE_CATALOGUE_REQUIRED');
          const id = randomUUID(),
            version = Number(
              (await c.query('SELECT max(version_number)+1 AS n FROM app.knowledge_versions'))
                .rows[0].n,
            );
          await c.query(
            "INSERT INTO app.knowledge_versions(id,business_id,version_number,state,policy_json,published_at,created_by,created_at) VALUES($1,$2,$3,'published',$4,app.business_now(),$5,app.business_now())",
            [id, s.businessId, version, JSON.stringify(input.policy), s.subject],
          );
          for (const item of input.catalogue) {
            const product = activeProducts.find((p) => p.sku === item.sku)!;
            await c.query(
              'INSERT INTO app.catalogue_items(id,business_id,knowledge_version_id,product_id,label,description,unit_price_sen,units_description,available) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
              [
                randomUUID(),
                s.businessId,
                id,
                product.id,
                item.label,
                item.description,
                item.unitPriceSen,
                item.unitsDescription,
                item.available,
              ],
            );
          }
          await c.query(
            'INSERT INTO app.knowledge_entries(id,business_id,knowledge_version_id,fact_key,category,content_bm,content_en) SELECT gen_random_uuid(),business_id,$1,fact_key,category,content_bm,content_en FROM app.knowledge_entries WHERE knowledge_version_id=$2',
            [id, current.id],
          );
          await c.query(
            'UPDATE app.businesses SET active_knowledge_version_id=$1,version=version+1,updated_at=app.business_now()',
            [id],
          );
          await c.query("UPDATE app.knowledge_versions SET state='retired' WHERE id=$1", [
            current.id,
          ]);
          await audit(c, s, null, 'knowledge_published', id, { version });
          return { id, version };
        }),
      );
    },
    configureCapacity(s: TrustedScope, input: z.infer<typeof capacityChangeSchema>, key: string) {
      requireOwner(s);
      return tx(s, (c) =>
        idem(c, s, 'capacity', key, input, async () => {
          await dateLock(c, s, input.pickupDate);
          await c.query('SELECT app.expire_date($1::date)', [input.pickupDate]);
          const bucket = (
            await c.query(
              'SELECT * FROM app.capacity_buckets WHERE product_id=$1 AND pickup_date=$2 FOR UPDATE',
              [input.productId, input.pickupDate],
            )
          ).rows[0];
          if (bucket) {
            if (bucket.version !== input.version) conflict('STALE_CAPACITY');
            if (input.maxUnits < bucket.held_units + bucket.committed_units)
              conflict('BOOKED_CAPACITY');
            await c.query(
              'UPDATE app.capacity_buckets SET max_units=$2,version=version+1 WHERE id=$1',
              [bucket.id, input.maxUnits],
            );
            return { id: bucket.id, version: bucket.version + 1 };
          }
          if (input.version !== 0) conflict('STALE_CAPACITY');
          notFound(
            (await c.query('SELECT id FROM app.products WHERE id=$1 AND active', [input.productId]))
              .rows[0],
          );
          const id = randomUUID();
          await c.query(
            'INSERT INTO app.capacity_buckets(id,business_id,product_id,pickup_date,max_units) VALUES($1,$2,$3,$4,$5)',
            [id, s.businessId, input.productId, input.pickupDate, input.maxUnits],
          );
          return { id, version: 1 };
        }),
      );
    },
  };
}
