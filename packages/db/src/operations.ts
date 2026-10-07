import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { TrustedScope } from '@customerbuddy/contracts';
import { withScope } from './scope.js';
import { DataError } from './repositories.js';
import { idem } from './commerce.js';

export const defaultEthics = {
  personalisation: true,
  marketingEnabled: true,
  dailyContactLimit: 1,
  maxDiscountPercent: 15,
  maxIncreasePercent: 10,
};
export function ownerOnly(s: TrustedScope) {
  if (s.role !== 'owner') throw new DataError('OWNER_ONLY', 403);
}
function found<T>(row: T | undefined): T {
  if (!row) throw new DataError('NOT_FOUND', 404);
  return row;
}
async function audit(c: PoolClient, s: TrustedScope, action: string, id: string) {
  await c.query(
    `INSERT INTO app.audit_events(id,business_id,actor_type,actor_subject,action,entity_type,entity_id,correlation_id,safe_details_json,occurred_at) VALUES($1,$2,$3,$4,$5,'operations',$6,$7,'{}',app.business_now())`,
    [randomUUID(), s.businessId, s.role, s.subject, action, id, randomUUID()],
  );
}
export async function profile(c: PoolClient) {
  const business = found(
    (await c.query('SELECT id,name,slug,version FROM app.businesses')).rows[0],
  );
  const p = (await c.query('SELECT * FROM app.business_profiles')).rows[0];
  return {
    ...business,
    sector: p?.sector ?? 'Retail',
    fulfilment: p?.fulfilment ?? 'pickup',
    ethics: p?.ethics ?? defaultEthics,
    profileVersion: p?.version ?? 0,
  };
}
export async function activeCatalogue(c: PoolClient) {
  return (
    await c.query(
      `SELECT p.id AS product_id,p.sku,p.kind,p.image_key,i.label,i.description,i.unit_price_sen::integer,i.units_description,i.available,i.knowledge_version_id FROM app.products p JOIN app.catalogue_items i ON i.product_id=p.id JOIN app.businesses b ON b.active_knowledge_version_id=i.knowledge_version_id WHERE p.active ORDER BY p.sku`,
    )
  ).rows;
}
async function publishCatalogue(
  c: PoolClient,
  s: TrustedScope,
  items: Awaited<ReturnType<typeof activeCatalogue>>,
  facts?: { en: string; bm: string },
) {
  const old = found(
    (
      await c.query(
        'SELECT k.* FROM app.knowledge_versions k JOIN app.businesses b ON b.active_knowledge_version_id=k.id',
      )
    ).rows[0],
  );
  const id = randomUUID(),
    version = Number(
      (await c.query('SELECT COALESCE(max(version_number),0)+1 AS n FROM app.knowledge_versions'))
        .rows[0].n,
    );
  await c.query(
    `INSERT INTO app.knowledge_versions(id,business_id,version_number,state,policy_json,published_at,created_by) VALUES($1,$2,$3,'published',$4,app.business_now(),$5)`,
    [id, s.businessId, version, old.policy_json, s.subject],
  );
  for (const p of items)
    await c.query(
      'INSERT INTO app.catalogue_items(id,business_id,knowledge_version_id,product_id,label,description,unit_price_sen,units_description,available) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        randomUUID(),
        s.businessId,
        id,
        p.product_id,
        p.label,
        p.description,
        p.unit_price_sen,
        p.units_description,
        p.available,
      ],
    );
  if (facts)
    await c.query(
      `INSERT INTO app.knowledge_entries(id,business_id,knowledge_version_id,fact_key,category,content_en,content_bm) VALUES($1,$2,$3,'business_information','FAQ',$4,$5)`,
      [randomUUID(), s.businessId, id, facts.en, facts.bm],
    );
  else
    await c.query(
      'INSERT INTO app.knowledge_entries(id,business_id,knowledge_version_id,fact_key,category,content_en,content_bm) SELECT gen_random_uuid(),business_id,$1,fact_key,category,content_en,content_bm FROM app.knowledge_entries WHERE knowledge_version_id=$2',
      [id, old.id],
    );
  await c.query(
    'UPDATE app.businesses SET active_knowledge_version_id=$1,version=version+1,updated_at=app.business_now()',
    [id],
  );
  await c.query("UPDATE app.knowledge_versions SET state='retired' WHERE id=$1", [old.id]);
  return { id, version };
}
export async function forecast(c: PoolClient) {
  const items = await activeCatalogue(c);
  const now = (await c.query('SELECT app.business_now() AS instant')).rows[0].instant;
  const stats = (
    await c.query(
      `SELECT i.product_id,COALESCE(sum(i.quantity) FILTER(WHERE o.pickup_date BETWEEN (app.business_now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date-28 AND (app.business_now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date),0)::integer AS sold,count(DISTINCT o.pickup_date) FILTER(WHERE o.pickup_date BETWEEN (app.business_now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date-28 AND (app.business_now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date)::integer AS days,COALESCE(sum(i.quantity) FILTER(WHERE o.pickup_date>(app.business_now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date AND o.state IN ('confirmed','preparing','ready','delivering')),0)::integer AS booked FROM app.order_items i JOIN app.orders o ON o.id=i.order_id WHERE o.state<>'cancelled' AND EXISTS(SELECT 1 FROM app.reservations r WHERE r.order_id=o.id AND (r.state='committed' OR (r.state='held' AND r.expires_at>app.business_now()))) GROUP BY i.product_id`,
    )
  ).rows;
  const stock = (
    await c.query(
      'SELECT product_id,sum(quantity)::integer AS on_hand FROM app.inventory_movements GROUP BY product_id',
    )
  ).rows;
  return {
    asOf: now,
    method:
      '28-day moving average; seven-day horizon. Booked future orders shown separately, not added twice.',
    items: items.map((p) => {
      const st = stats.find((r) => r.product_id === p.product_id),
        inv = stock.find((r) => r.product_id === p.product_id),
        demand = Math.ceil(((st?.sold ?? 0) / 28) * 7),
        onHand = inv?.on_hand ?? null;
      return {
        ...p,
        onHand,
        stockTracked: !!inv,
        sold28: st?.sold ?? 0,
        observedDays: st?.days ?? 0,
        booked: st?.booked ?? 0,
        predicted7: demand,
        low: Math.floor(demand * 0.5),
        high: Math.ceil(demand * 1.5),
        confidence: (st?.days ?? 0) >= 14 ? 'moderate' : 'low — sparse demo history',
        reorder:
          p.kind === 'service' ? 0 : Math.max(0, Math.max(demand, st?.booked ?? 0) - (onHand ?? 0)),
        overflow:
          p.kind === 'product' &&
          onHand !== null &&
          onHand > Math.max(demand * 2, (st?.booked ?? 0) + 5),
        available: null as number | null,
      };
    }),
  };
}
export async function recommendation(c: PoolClient, cid: string) {
  const p = await profile(c),
    items = (await activeCatalogue(c)).filter((i) => i.available);
  const consent = (
    await c.query(
      "SELECT granted FROM app.consent_events WHERE customer_id=$1 AND purpose='preference_memory' ORDER BY event_sequence DESC LIMIT 1",
      [cid],
    )
  ).rows[0]?.granted;
  const favourite =
    p.ethics.personalisation && consent
      ? (
          await c.query(
            "SELECT value_json FROM app.customer_preferences WHERE customer_id=$1 AND key='favourite_product_sku'",
            [cid],
          )
        ).rows[0]?.value_json
      : null;
  const selected = items.find((i) => i.sku === favourite) ?? items[0];
  return selected
    ? {
        product: selected,
        reason:
          favourite === selected.sku
            ? 'Your explicitly saved favourite (optional memory enabled)'
            : 'Published catalogue fallback; no personal tracking used',
      }
    : null;
}
export function createOperations(pool: Pool) {
  function read<T>(s: TrustedScope, fn: (c: PoolClient) => Promise<T>) {
    return withScope(pool, s, fn);
  }
  function write<T>(
    s: TrustedScope,
    op: string,
    key: string,
    input: unknown,
    fn: (c: PoolClient) => Promise<T>,
  ) {
    ownerOnly(s);
    return withScope(pool, s, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [s.businessId]);
      return idem(c, s, `ops:${op}`, key, input, async () => {
        const result = await fn(c);
        await audit(c, s, op, s.businessId);
        return result;
      });
    });
  }
  return {
    profile: (s: TrustedScope) => read(s, profile),
    setup(
      s: TrustedScope,
      input: {
        name: string;
        slug: string;
        sector: string;
        fulfilment: string;
        version: number;
        factsEn: string;
        factsBm: string;
      },
      key: string,
    ) {
      return write(s, 'setup', key, input, async (c) => {
        const p = await profile(c);
        if (p.version !== input.version) throw new DataError('STALE_PROFILE', 409);
        await c.query('UPDATE app.businesses SET name=$1,slug=$2 WHERE id=$3', [
          input.name,
          input.slug,
          s.businessId,
        ]);
        await c.query(
          'INSERT INTO app.business_profiles(business_id,sector,fulfilment) VALUES($1,$2,$3) ON CONFLICT(business_id) DO UPDATE SET sector=$2,fulfilment=$3,version=app.business_profiles.version+1',
          [s.businessId, input.sector, input.fulfilment],
        );
        return publishCatalogue(c, s, await activeCatalogue(c), {
          en: input.factsEn,
          bm: input.factsBm,
        });
      });
    },
    product(
      s: TrustedScope,
      input: {
        sku: string;
        label: string;
        description: string;
        unitPriceSen: number;
        unitsDescription: string;
        kind: string;
        available: boolean;
        knowledgeVersionId: string;
        imageKey?: string;
      },
      key: string,
    ) {
      return write(s, 'catalogue_item', key, input, async (c) => {
        const b = await c.query('SELECT active_knowledge_version_id FROM app.businesses');
        if (b.rows[0].active_knowledge_version_id !== input.knowledgeVersionId)
          throw new DataError('POLICY_CHANGED', 409);
        let p = (await c.query('SELECT id FROM app.products WHERE sku=$1', [input.sku])).rows[0];
        if (!p) {
          p = { id: randomUUID() };
          await c.query('INSERT INTO app.products(id,business_id,sku,kind) VALUES($1,$2,$3,$4)', [
            p.id,
            s.businessId,
            input.sku,
            input.kind,
          ]);
        } else {
          const existing = (await c.query('SELECT kind FROM app.products WHERE id=$1', [p.id]))
            .rows[0];
          if (
            existing.kind !== input.kind &&
            (await c.query('SELECT 1 FROM app.order_items WHERE product_id=$1 LIMIT 1', [p.id]))
              .rowCount
          )
            throw new DataError('ORDERED_PRODUCT_KIND_IMMUTABLE', 409);
          await c.query('UPDATE app.products SET kind=$2 WHERE id=$1', [p.id, input.kind]);
        }
        const items = (await activeCatalogue(c)).filter((i) => i.sku !== input.sku);
        if (input.imageKey)
          await c.query('UPDATE app.products SET image_key=$2 WHERE id=$1', [p.id, input.imageKey]);
        items.push({
          product_id: p.id,
          sku: input.sku,
          kind: input.kind,
          label: input.label,
          description: input.description,
          unit_price_sen: input.unitPriceSen,
          units_description: input.unitsDescription,
          available: input.available,
          knowledge_version_id: input.knowledgeVersionId,
        });
        return publishCatalogue(c, s, items);
      });
    },
    agents(s: TrustedScope) {
      ownerOnly(s);
      return read(s, async (c) => ({
        agents: (
          await c.query(`SELECT u.id,u.display_name,u.display_code,u.preferred_language,
    (SELECT count(*)::integer FROM app.messages m WHERE m.customer_id=u.id) AS interactions,
    (SELECT count(*)::integer FROM app.orders o WHERE o.customer_id=u.id) AS orders,
    (SELECT COALESCE(sum(amount_sen),0)::integer FROM app.payments p WHERE p.customer_id=u.id AND p.state='verified') AS paid_sen,
    (SELECT count(*)::integer FROM app.approvals a WHERE a.customer_id=u.id AND a.state='pending' AND a.expires_at>app.business_now()) AS reviews,
    (SELECT jsonb_build_object('id',v.id,'state',v.state,'takeover',v.human_takeover) FROM app.conversations v WHERE v.customer_id=u.id ORDER BY (v.state='waiting_owner') DESC,(v.state<>'closed') DESC,v.updated_at DESC,v.created_at DESC LIMIT 1) AS conversation,
    (SELECT jsonb_build_object('content',m.content,'role',m.role,'at',m.created_at) FROM app.messages m WHERE m.customer_id=u.id ORDER BY m.created_at DESC LIMIT 1) AS latest,
    (SELECT jsonb_build_object('intent',r.matched_intent,'state',r.state,'at',r.finished_at) FROM app.agent_runs r WHERE r.customer_id=u.id ORDER BY r.started_at DESC LIMIT 1) AS run
    FROM app.customers u ORDER BY u.display_code`)
        ).rows,
      }));
    },
    stock(s: TrustedScope) {
      ownerOnly(s);
      return read(s, async (c) => {
        const f = await forecast(c);
        for (const p of f.items) {
          p.available =
            (await c.query('SELECT app.inventory_available($1) AS n', [p.product_id])).rows[0]?.n ??
            null;
        }
        return {
          ...f,
          movements: (
            await c.query(
              'SELECT m.*,p.sku FROM app.inventory_movements m JOIN app.products p ON p.id=m.product_id ORDER BY m.created_at DESC LIMIT 100',
            )
          ).rows,
          proposals: (
            await c.query(
              'SELECT r.*,p.sku FROM app.price_proposals r JOIN app.products p ON p.id=r.product_id ORDER BY r.created_at DESC',
            )
          ).rows,
        };
      });
    },
    movement(
      s: TrustedScope,
      input: { productId: string; quantity: number; kind: string; note: string },
      key: string,
    ) {
      return write(s, 'stock_movement', key, input, async (c) => {
        const p = found(
          (await c.query('SELECT kind FROM app.products WHERE id=$1', [input.productId])).rows[0],
        );
        if (p.kind === 'service') throw new DataError('SERVICE_USES_CAPACITY', 409);
        const current = Number(
          (
            await c.query(
              'SELECT COALESCE(sum(quantity),0) AS n FROM app.inventory_movements WHERE product_id=$1',
              [input.productId],
            )
          ).rows[0].n,
        );
        const available = (
          await c.query('SELECT app.inventory_available($1) AS n', [input.productId])
        ).rows[0]?.n;
        const reserved = Number(
          (
            await c.query(
              "SELECT COALESCE(sum(i.quantity),0) AS n FROM app.order_items i JOIN app.orders o ON o.id=i.order_id JOIN app.reservations r ON r.order_id=o.id WHERE i.product_id=$1 AND o.state IN ('awaiting_deposit','confirmed','preparing') AND (r.state='committed' OR (r.state='held' AND r.expires_at>app.business_now()))",
              [input.productId],
            )
          ).rows[0].n,
        );
        if (
          current + input.quantity < 0 ||
          (available === null && current + input.quantity < reserved) ||
          (available !== null && available !== undefined && available + input.quantity < 0)
        )
          throw new DataError('STOCK_UNAVAILABLE', 409);
        const id = randomUUID();
        await c.query(
          'INSERT INTO app.inventory_movements(id,business_id,product_id,quantity,kind,note,created_at) VALUES($1,$2,$3,$4,$5,$6,app.business_now())',
          [id, s.businessId, input.productId, input.quantity, input.kind, input.note],
        );
        return { id };
      });
    },
    price(s: TrustedScope, productId: string, key: string) {
      return write(s, 'price_proposal', key, { productId }, async (c) => {
        const f = await forecast(c),
          p = found(f.items.find((p) => p.product_id === productId)),
          config = await profile(c);
        const change = p.overflow
          ? -Math.min(10, config.ethics.maxDiscountPercent)
          : p.predicted7 > 0 && p.stockTracked && p.onHand! < p.predicted7
            ? Math.min(5, config.ethics.maxIncreasePercent)
            : 0;
        const id = randomUUID(),
          price = Math.max(
            1,
            change < 0
              ? Math.ceil(p.unit_price_sen * (1 + change / 100))
              : Math.floor(p.unit_price_sen * (1 + change / 100)),
          ),
          reason =
            change < 0
              ? 'Stock exceeds baseline demand; reduce price for all customers'
              : change > 0
                ? 'Low stock relative to baseline demand; bounded increase for all customers'
                : 'Insufficient evidence for a price change; retain current price';
        await c.query(
          'INSERT INTO app.price_proposals(id,business_id,product_id,knowledge_version_id,old_price_sen,new_price_sen,reason,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,app.business_now())',
          [id, s.businessId, productId, p.knowledge_version_id, p.unit_price_sen, price, reason],
        );
        return { id, price, reason };
      });
    },
    priceDecision(s: TrustedScope, id: string, decision: string, key: string) {
      return write(s, 'price_decision', key, { id, decision }, async (c) => {
        const p = found(
          (await c.query('SELECT * FROM app.price_proposals WHERE id=$1 FOR UPDATE', [id])).rows[0],
        );
        if (p.state !== 'pending') throw new DataError('ALREADY_DECIDED', 409);
        if (decision === 'approved') {
          const items = await activeCatalogue(c),
            target = found(items.find((i) => i.product_id === p.product_id));
          if (target.knowledge_version_id !== p.knowledge_version_id)
            throw new DataError('POLICY_CHANGED', 409);
          const config = await profile(c),
            pct = (p.new_price_sen / p.old_price_sen - 1) * 100;
          if (
            pct < -config.ethics.maxDiscountPercent - 0.01 ||
            pct > config.ethics.maxIncreasePercent + 0.01
          )
            throw new DataError('PRICE_LIMIT', 409);
          target.unit_price_sen = p.new_price_sen;
          await publishCatalogue(c, s, items);
        }
        await c.query('UPDATE app.price_proposals SET state=$2 WHERE id=$1', [id, decision]);
        return { id, state: decision };
      });
    },
    ethics(s: TrustedScope, input: typeof defaultEthics, key: string) {
      return write(s, 'ethics_settings', key, input, async (c) => {
        await c.query(
          'INSERT INTO app.business_profiles(business_id,ethics) VALUES($1,$2) ON CONFLICT(business_id) DO UPDATE SET ethics=$2,version=app.business_profiles.version+1',
          [s.businessId, input],
        );
        return input;
      });
    },
    recommendation: (s: TrustedScope) => read(s, (c) => recommendation(c, found(s.customerId))),
    members(s: TrustedScope) {
      ownerOnly(s);
      return read(s, async (c) => ({
        members: (
          await c.query(`SELECT u.id,u.display_name,u.display_code,u.preferred_language,u.created_at, COALESCE((SELECT active FROM app.customer_loyalty WHERE customer_id=u.id),false) AS club_member,
   (SELECT count(*)::integer FROM app.orders WHERE customer_id=u.id) AS orders,
   (SELECT COALESCE(sum(amount_sen),0)::integer FROM app.payments WHERE customer_id=u.id AND state='verified') AS paid_sen,
   COALESCE((SELECT jsonb_object_agg(purpose,granted) FROM (SELECT DISTINCT ON(purpose) purpose,granted FROM app.consent_events WHERE customer_id=u.id ORDER BY purpose,event_sequence DESC) t),'{}') AS consents FROM app.customers u ORDER BY u.display_code`)
        ).rows,
      }));
    },
    member(s: TrustedScope, input: { name: string; language: string }, key: string) {
      return write(s, 'create_member', key, input, async (c) => ({
        id: (
          await c.query('SELECT app.create_demo_member($1,$2) AS id', [input.name, input.language])
        ).rows[0].id,
      }));
    },
    sales(s: TrustedScope) {
      ownerOnly(s);
      return read(s, async (c) => ({
        totals: (
          await c.query(
            `SELECT count(*)::integer AS orders,COALESCE(sum(total_sen) FILTER(WHERE state<>'cancelled'),0)::integer AS booked_sen,COALESCE(sum(total_sen) FILTER(WHERE state='cancelled'),0)::integer AS cancelled_sen FROM app.orders`,
          )
        ).rows[0],
        paidSen: Number(
          (
            await c.query(
              "SELECT COALESCE(sum(amount_sen),0) AS n FROM app.payments WHERE state='verified'",
            )
          ).rows[0].n,
        ),
        products: (
          await c.query(
            "SELECT sku_snapshot AS sku,label_snapshot AS label,sum(quantity)::integer AS units,sum(line_total_sen)::integer AS sales_sen FROM app.order_items i JOIN app.orders o ON o.id=i.order_id WHERE o.state<>'cancelled' GROUP BY sku_snapshot,label_snapshot ORDER BY sum(line_total_sen) DESC",
          )
        ).rows,
        invoices: (
          await c.query(
            "SELECT d.id,d.state,o.id AS order_id,o.display_code,o.total_sen::integer FROM app.documents d JOIN app.orders o ON o.id=d.order_id WHERE d.kind='invoice' ORDER BY d.created_at DESC",
          )
        ).rows,
      }));
    },
    calendar(s: TrustedScope, month: string) {
      ownerOnly(s);
      return read(s, async (c) => ({
        events: (
          await c.query(
            "SELECT id,title,event_date::text,start_local::text,kind,note,done FROM app.calendar_events WHERE to_char(event_date,'YYYY-MM')=$1 ORDER BY event_date,start_local",
            [month],
          )
        ).rows,
        orders: (
          await c.query(
            "SELECT o.id,o.display_code,o.pickup_date::text,o.state,o.total_sen::integer,u.display_name,s.start_local::text,s.end_local::text FROM app.orders o JOIN app.customers u ON u.id=o.customer_id JOIN app.pickup_slots s ON s.id=o.pickup_slot_id WHERE to_char(o.pickup_date,'YYYY-MM')=$1 ORDER BY o.pickup_date,s.start_local",
            [month],
          )
        ).rows,
      }));
    },
    event(
      s: TrustedScope,
      input: { title: string; date: string; time: string; kind: string; note: string },
      key: string,
    ) {
      return write(s, 'calendar_event', key, input, async (c) => {
        const id = randomUUID();
        await c.query(
          'INSERT INTO app.calendar_events(id,business_id,title,event_date,start_local,kind,note) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [id, s.businessId, input.title, input.date, input.time, input.kind, input.note],
        );
        return { id };
      });
    },
    eventDone(s: TrustedScope, id: string, done: boolean, key: string) {
      return write(s, 'calendar_done', key, { id, done }, async (c) =>
        found(
          (
            await c.query('UPDATE app.calendar_events SET done=$2 WHERE id=$1 RETURNING id,done', [
              id,
              done,
            ])
          ).rows[0],
        ),
      );
    },
    risk(
      s: TrustedScope,
      input: { orderId: string; amountSen: number; reference: string },
      key: string,
    ) {
      return write(s, 'risk_screen', key, input, async (c) => {
        const o = found(
          (await c.query('SELECT * FROM app.orders WHERE id=$1', [input.orderId])).rows[0],
        );
        const paid = Number(
            (
              await c.query(
                "SELECT COALESCE(sum(amount_sen),0) AS n FROM app.payments WHERE order_id=$1 AND state='verified'",
                [o.id],
              )
            ).rows[0].n,
          ),
          reasons: string[] = [];
        if (input.amountSen > Number(o.total_sen) - paid)
          reasons.push('Amount exceeds outstanding balance');
        if (
          (await c.query('SELECT 1 FROM app.payments WHERE reference=$1', [input.reference]))
            .rowCount
        )
          reasons.push('Reference already recorded');
        if (!input.reference.startsWith('SYNTHETIC-'))
          reasons.push('Unrecognised demo payment reference');
        if (o.state === 'cancelled') reasons.push('Payment on cancelled order');
        if (input.amountSen >= 100000) reasons.push('High-value payment requires review');
        if (!reasons.length)
          return {
            risk: 'low',
            reasons: [],
            notice: 'Rule screening only; owner still verifies payment. Not proof of authenticity.',
          };
        const id = randomUUID();
        const r = await c.query(
          "INSERT INTO app.risk_cases(id,business_id,order_id,reference,amount_sen,reasons,created_at) VALUES($1,$2,$3,$4,$5,$6,app.business_now()) ON CONFLICT(business_id,order_id,reference) DO UPDATE SET amount_sen=$5,reasons=$6,state='open',decision_note=NULL RETURNING id",
          [id, s.businessId, o.id, input.reference, input.amountSen, JSON.stringify(reasons)],
        );
        return { id: r.rows[0].id, risk: 'review', reasons };
      });
    },
    risks(s: TrustedScope) {
      ownerOnly(s);
      return read(s, async (c) => ({
        cases: (
          await c.query(
            'SELECT r.*,o.display_code FROM app.risk_cases r JOIN app.orders o ON o.id=r.order_id ORDER BY r.created_at DESC',
          )
        ).rows,
      }));
    },
    riskDecision(s: TrustedScope, id: string, input: { state: string; note: string }, key: string) {
      return write(s, 'risk_decision', key, { id, ...input }, async (c) =>
        found(
          (
            await c.query(
              'UPDATE app.risk_cases SET state=$2,decision_note=$3 WHERE id=$1 RETURNING id,state',
              [id, input.state, input.note],
            )
          ).rows[0],
        ),
      );
    },
    async ownerQuery(s: TrustedScope, text: string) {
      ownerOnly(s);
      const value = text.toLowerCase();
      return read(s, async (c) => {
        if (/forecast|stock|inventory|demand|stok/.test(value)) {
          const f = await forecast(c);
          return {
            intent: 'stock_forecast',
            reply: f.items
              .map(
                (i) =>
                  `${i.label}: stock ${i.onHand ?? 'untracked'}, seven-day baseline ${i.predicted7}, booked ${i.booked}, suggested replenishment ${i.reorder}. Confidence ${i.confidence}.`,
              )
              .join('\n'),
          };
        }
        if (/member|customer|agent|review|pelanggan/.test(value)) {
          const n = (await c.query('SELECT count(*)::integer AS n FROM app.customers')).rows[0].n;
          const r = (
            await c.query(
              "SELECT count(*)::integer AS n FROM app.approvals WHERE state='pending' AND expires_at>app.business_now()",
            )
          ).rows[0].n;
          return {
            intent: 'customers',
            reply: `${n} synthetic members; ${r} pending owner reviews. Open Agents for saved interactions.`,
          };
        }
        if (/sale|revenue|invoice|payment|order|jualan/.test(value)) {
          const n = (
            await c.query(
              "SELECT count(*)::integer AS n,COALESCE(sum(total_sen),0)::integer AS total FROM app.orders WHERE state<>'cancelled'",
            )
          ).rows[0];
          const paid = (
            await c.query(
              "SELECT COALESCE(sum(amount_sen),0)::integer AS n FROM app.payments WHERE state='verified'",
            )
          ).rows[0].n;
          return {
            intent: 'sales',
            reply: `${n.n} non-cancelled orders, RM ${(n.total / 100).toFixed(2)} booked sales, RM ${(paid / 100).toFixed(2)} verified synthetic payments. These measures differ; inspect Sales and invoices.`,
          };
        }
        if (/calendar|appointment|schedule/.test(value))
          return {
            intent: 'calendar',
            reply:
              'Open Calendar for saved fulfilment dates, appointments and tasks. Service bookings use the checkout date/slot and capacity controls.',
          };
        return {
          intent: 'unknown',
          reply:
            'Supported demo queries: sales/invoices, stock/forecast, customers/agents/reviews and calendar/appointments. Complex or ambiguous requests need owner interpretation. No money, stock or approvals changed.',
        };
      });
    },
  };
}
