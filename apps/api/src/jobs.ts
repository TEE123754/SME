import { randomUUID, createHash } from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { withScope, DataError } from '@customerbuddy/db';
import type { Pool } from '@customerbuddy/db';
import type { TrustedScope, PrivateDocumentStorage } from '@customerbuddy/contracts';
const money = (n: number) => `RM ${(Number(n) / 100).toFixed(2)}`;
function authority(s: TrustedScope) {
  if (!['owner', 'worker'].includes(s.role)) throw new DataError('OWNER_ONLY', 403);
}
export function createJobs(pool: Pool, storage: PrivateDocumentStorage) {
  async function locked<T>(s: TrustedScope, fn: Parameters<typeof withScope<T>>[2]) {
    authority(s);
    return withScope(pool, s, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [s.businessId]);
      return fn(c);
    });
  }
  async function enqueue(s: TrustedScope) {
    return locked(s, async (c) => {
      const events = (
        await c.query(
          "SELECT * FROM app.outbox_events WHERE state='queued' ORDER BY created_at,id LIMIT 50 FOR UPDATE SKIP LOCKED",
        )
      ).rows;
      for (const e of events) {
        const document = ['quote_document', 'invoice', 'summary', 'receipt'].includes(e.kind),
          reminder = e.kind === 'deposit_reminder';
        if (!document && !reminder) {
          await c.query(
            "UPDATE app.outbox_events SET state='delivered',updated_at=app.business_now() WHERE id=$1",
            [e.id],
          );
          continue;
        }
        const orderId =
          e.kind === 'quote_document'
            ? null
            : e.kind === 'receipt'
              ? e.payload_json.orderId
              : e.entity_id;
        await c.query(
          `INSERT INTO app.jobs(id,business_id,customer_id,order_id,kind,payload_json,action_key,due_at) VALUES($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz,app.business_now())) ON CONFLICT(business_id,action_key) DO NOTHING`,
          [
            randomUUID(),
            s.businessId,
            e.customer_id,
            orderId,
            e.kind,
            JSON.stringify({ entityId: e.entity_id, eventId: e.id }),
            e.action_key,
            e.payload_json.dueAt ?? null,
          ],
        );
        await c.query(
          "UPDATE app.outbox_events SET state='delivered',updated_at=app.business_now() WHERE id=$1",
          [e.id],
        );
      }
      return events.length;
    });
  }
  async function claim(s: TrustedScope, owner: string) {
    return locked(s, async (c) => {
      await c.query(
        "UPDATE app.jobs SET state=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,lease_owner=NULL,lease_until=NULL,last_error='LEASE_EXPIRED' WHERE state='running' AND lease_until<clock_timestamp()",
      );
      const rows = (
        await c.query(
          "SELECT id FROM app.jobs WHERE state='queued' AND due_at<=app.business_now() AND attempts<3 ORDER BY due_at,id LIMIT 10 FOR UPDATE SKIP LOCKED",
        )
      ).rows;
      if (!rows.length) return [];
      return (
        await c.query(
          "UPDATE app.jobs SET state='running',attempts=attempts+1,lease_owner=$2,lease_until=clock_timestamp()+interval '30 seconds' WHERE id=ANY($1::uuid[]) RETURNING *",
          [rows.map((r) => r.id), owner],
        )
      ).rows;
    });
  }
  async function execute(s: TrustedScope, id: string, leaseOwner: string) {
    return locked(s, async (c) => {
      const j = (
        await c.query(
          "SELECT * FROM app.jobs WHERE id=$1 AND state='running' AND lease_owner=$2 AND lease_until>clock_timestamp() FOR UPDATE",
          [id, leaseOwner],
        )
      ).rows[0];
      if (!j) throw new DataError('LEASE_LOST', 409);
      let state = 'completed';
      if (j.kind === 'deposit_reminder') {
        const o = (
          await c.query(
            `SELECT o.*,app.business_now() AS instant,b.automation_paused,k.policy_json,
    COALESCE((SELECT sum(amount_sen) FROM app.payments p WHERE p.order_id=o.id AND p.state='verified'),0)::integer AS paid,
    (SELECT granted FROM app.consent_events e WHERE e.customer_id=o.customer_id AND e.purpose='operational_reminders' ORDER BY event_sequence DESC LIMIT 1) AS consent,
    (SELECT expires_at FROM app.reservations r WHERE r.order_id=o.id AND state='held') AS hold_until,
    EXISTS(SELECT 1 FROM app.conversations cv WHERE cv.customer_id=o.customer_id AND cv.human_takeover) AS takeover,
    EXISTS(SELECT 1 FROM app.approvals a WHERE a.order_id=o.id AND a.state='pending' AND a.expires_at>app.business_now()) AS review
    FROM app.orders o JOIN app.businesses b ON b.id=o.business_id JOIN app.knowledge_versions k ON k.id=b.active_knowledge_version_id WHERE o.id=$1`,
            [j.order_id],
          )
        ).rows[0];
        if (
          !o ||
          !o.consent ||
          o.automation_paused ||
          o.takeover ||
          o.review ||
          o.exception_paused ||
          o.state !== 'awaiting_deposit' ||
          o.paid >= o.deposit_required_sen ||
          !o.hold_until ||
          new Date(o.hold_until) <= new Date(o.instant)
        )
          state = 'suppressed';
        else {
          const local = new Date(new Date(o.instant).getTime() + 8 * 3600000),
            minute = local.getUTCHours() * 60 + local.getUTCMinutes();
          const [startH, startM] = o.policy_json.quietHoursStart.split(':').map(Number),
            [endH, endM] = o.policy_json.quietHoursEnd.split(':').map(Number),
            start = startH * 60 + startM,
            end = endH * 60 + endM;
          const allowed =
            start < end ? minute >= start && minute < end : minute >= start || minute < end;
          if (!allowed) {
            let delay = (start - minute + 1440) % 1440;
            if (delay === 0) delay = 1440;
            await c.query(
              "UPDATE app.jobs SET state='queued',due_at=$2,attempts=attempts-1,lease_owner=NULL,lease_until=NULL WHERE id=$1",
              [id, new Date(new Date(o.instant).getTime() + delay * 60000)],
            );
            return 'deferred_quiet_hours';
          }
          await c.query(
            'INSERT INTO app.notifications(id,business_id,customer_id,order_id,action_key,content,created_at) VALUES($1,$2,$3,$4,$5,$6,app.business_now()) ON CONFLICT(business_id,action_key) DO NOTHING',
            [
              randomUUID(),
              s.businessId,
              o.customer_id,
              o.id,
              j.action_key,
              `Synthetic deposit reminder: ${o.display_code}, ${money(o.deposit_required_sen - o.paid)} remaining deposit. / Peringatan deposit sintetik.`,
            ],
          );
        }
      } else if (['quote_document', 'invoice', 'summary', 'receipt'].includes(j.kind)) {
        const kind = j.kind === 'quote_document' ? 'quote' : j.kind;
        const q =
          kind === 'quote'
            ? (
                await c.query(
                  'SELECT *,pickup_date::text AS pickup_date FROM app.quotes WHERE id=$1',
                  [j.payload_json.entityId],
                )
              ).rows[0]
            : null;
        const o =
          kind !== 'quote'
            ? (
                await c.query(
                  'SELECT *,pickup_date::text AS pickup_date FROM app.orders WHERE id=$1',
                  [j.order_id],
                )
              ).rows[0]
            : null;
        const payment =
          kind === 'receipt'
            ? (
                await c.query(
                  "SELECT * FROM app.payments WHERE id=$1 AND order_id=$2 AND state='verified'",
                  [j.payload_json.entityId, j.order_id],
                )
              ).rows[0]
            : null;
        if (
          (kind === 'quote' && !q) ||
          (kind !== 'quote' && !o) ||
          (kind === 'receipt' && !payment)
        )
          throw new DataError('DOCUMENT_SOURCE_MISSING', 409);
        const old = (
          await c.query('SELECT * FROM app.documents WHERE action_key=$1', [j.action_key])
        ).rows[0];
        if (old?.state !== 'available') {
          const docId = old?.id ?? randomUUID();
          const paid = o
            ? (
                await c.query(
                  "SELECT COALESCE(sum(amount_sen),0)::integer AS paid FROM app.payments WHERE order_id=$1 AND state='verified'",
                  [o.id],
                )
              ).rows[0].paid
            : 0;
          const items = q
            ? q.items_json
            : (
                await c.query(
                  'SELECT label_snapshot AS label,quantity,unit_price_sen AS "unitPriceSen" FROM app.order_items WHERE order_id=$1',
                  [o.id],
                )
              ).rows;
          const slot = (
            await c.query(
              'SELECT code,start_local::text,end_local::text FROM app.pickup_slots WHERE id=$1',
              [(o ?? q).pickup_slot_id],
            )
          ).rows[0];
          const lines = [
            `BizBuddy - ${(await c.query('SELECT name FROM app.businesses WHERE id=$1', [s.businessId])).rows[0]?.name ?? 'Small business'}`,
            `SYNTHETIC DEMO ${kind.toUpperCase()} / DOKUMEN SINTETIK`,
            o ? `Order: ${o.display_code}` : `Quote: ${q.id}`,
            `Pickup: ${(o ?? q).pickup_date} ${slot.code} ${slot.start_local.slice(0, 5)}-${slot.end_local.slice(0, 5)} MYT`,
            ...items.map(
              (i: { label: string; quantity: number; unitPriceSen: number }) =>
                `${i.quantity} x ${i.label}: ${money(i.unitPriceSen * i.quantity)}`,
            ),
            `Total: ${money((o ?? q).total_sen)}`,
            `Required deposit: ${money(o?.deposit_required_sen ?? q.deposit_sen)}`,
            `Verified paid at generation: ${money(paid)}`,
            `Remaining balance: ${money(Number((o ?? q).total_sen) - paid)}`,
            ...(payment
              ? [
                  `This verified payment: ${money(payment.amount_sen)}`,
                  `Reference: ${payment.reference}`,
                ]
              : []),
            'Synthetic local prototype. No real payment or tax invoice.',
          ];
          const pdf = await PDFDocument.create(),
            font = await pdf.embedFont(StandardFonts.Helvetica);
          let page = pdf.addPage([595, 842]),
            y = 790;
          for (const line of lines) {
            const safe = line.replace(/[^\x20-\x7e]/g, '?');
            for (let offset = 0; offset < safe.length; offset += 82) {
              if (y < 55) {
                page = pdf.addPage([595, 842]);
                y = 790;
              }
              page.drawText(safe.slice(offset, offset + 82), { x: 45, y, size: 11, font });
              y -= 20;
            }
          }
          const bytes = await pdf.save(),
            key = `${s.businessId}/${docId}.pdf`,
            hash = createHash('sha256').update(bytes).digest('hex');
          await storage.put(key, bytes);
          await c.query(
            `INSERT INTO app.documents(id,business_id,customer_id,order_id,quote_id,payment_id,kind,state,storage_key,content_hash,action_key,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,'available',$8,$9,$10,app.business_now()) ON CONFLICT(business_id,action_key) WHERE action_key IS NOT NULL DO UPDATE SET state='available',storage_key=EXCLUDED.storage_key,content_hash=EXCLUDED.content_hash`,
            [
              docId,
              s.businessId,
              j.customer_id,
              o?.id ?? null,
              q?.id ?? null,
              payment?.id ?? null,
              kind,
              key,
              hash,
              j.action_key,
            ],
          );
        }
      } else throw new DataError('UNKNOWN_JOB', 400);
      await c.query(
        'UPDATE app.jobs SET state=$2,lease_owner=NULL,lease_until=NULL,last_error=NULL WHERE id=$1',
        [id, state],
      );
      return state;
    });
  }
  async function run(s: TrustedScope) {
    await enqueue(s);
    const owner = randomUUID(),
      batch = await claim(s, owner),
      results = [];
    for (const j of batch) {
      try {
        results.push({ id: j.id, state: await execute(s, j.id, owner) });
      } catch (e) {
        await locked(s, async (c) => {
          await c.query(
            "UPDATE app.jobs SET state=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,last_error=$3,due_at=app.business_now()+interval '1 minute',lease_owner=NULL,lease_until=NULL WHERE id=$1 AND lease_owner=$2",
            [j.id, owner, e instanceof DataError ? e.code : 'JOB_FAILED'],
          );
        });
        results.push({ id: j.id, state: 'retry_or_failed' });
      }
    }
    return { processed: results.length, results };
  }
  async function status(s: TrustedScope) {
    return locked(s, async (c) => ({
      clock: (await c.query('SELECT app.business_now() AS instant,paused FROM app.demo_settings'))
        .rows[0],
      jobs: (
        await c.query(
          'SELECT id,kind,state,attempts,due_at,lease_until,last_error FROM app.jobs ORDER BY created_at DESC LIMIT 100',
        )
      ).rows,
      digests: (await c.query('SELECT * FROM app.digests ORDER BY created_at DESC LIMIT 10')).rows,
      automationPaused: (
        await c.query('SELECT automation_paused FROM app.businesses WHERE id=$1', [s.businessId])
      ).rows[0].automation_paused,
    }));
  }
  async function clock(
    s: TrustedScope,
    mode: 'pause' | 'resume' | 'advance',
    hours: number,
    key: string = randomUUID(),
  ) {
    if (s.role !== 'owner') throw new DataError('OWNER_ONLY', 403);
    return locked(s, async (c) => {
      const hash = createHash('sha256').update(JSON.stringify({ mode, hours })).digest('hex');
      const existing = (
        await c.query(
          "SELECT request_hash,result_json FROM app.idempotency_records WHERE actor_subject=$1 AND operation='demo_clock' AND key=$2",
          [s.subject, key],
        )
      ).rows[0];
      if (existing) {
        if (existing.request_hash !== hash) throw new DataError('IDEMPOTENCY_CONFLICT', 409);
        return existing.result_json as { instant: string; paused: boolean };
      }
      await c.query(
        "UPDATE app.demo_settings SET base_demo_time=app.business_now()+($2*interval '1 hour'),real_time_anchor=clock_timestamp(),paused=$3 WHERE business_id=$1",
        [s.businessId, mode === 'advance' ? hours : 0, mode !== 'resume'],
      );
      const result = {
        instant: new Date(
          (await c.query('SELECT app.business_now() AS instant')).rows[0].instant,
        ).toISOString(),
        paused: mode !== 'resume',
      };
      await c.query(
        "INSERT INTO app.idempotency_records(id,business_id,actor_subject,operation,key,request_hash,state,result_json) VALUES($1,$2,$3,'demo_clock',$4,$5,'completed',$6)",
        [randomUUID(), s.businessId, s.subject, key, hash, JSON.stringify(result)],
      );
      return result;
    });
  }
  async function digest(s: TrustedScope, key: string) {
    return locked(s, async (c) => {
      const snapshot = (
        await c.query(
          `SELECT app.business_now() AS cutoff,(SELECT count(*)::integer FROM app.orders) AS orders,(SELECT COALESCE(sum(amount_sen),0)::integer FROM app.payments WHERE state='verified') AS "verifiedPaymentSen",(SELECT count(*)::integer FROM app.orders WHERE state='awaiting_deposit') AS "awaitingDeposit",(SELECT count(*)::integer FROM app.jobs WHERE state='failed') AS "failedJobs",(SELECT count(*)::integer FROM app.notifications) AS "remindersDelivered"`,
        )
      ).rows[0];
      await c.query(
        'INSERT INTO app.digests(id,business_id,action_key,snapshot_json,created_at) VALUES($1,$2,$3,$4,app.business_now()) ON CONFLICT(business_id,action_key) DO NOTHING',
        [randomUUID(), s.businessId, key, JSON.stringify(snapshot)],
      );
      return (await c.query('SELECT * FROM app.digests WHERE action_key=$1', [key])).rows[0];
    });
  }
  return { enqueue, claim, execute, run, status, clock, digest };
}
