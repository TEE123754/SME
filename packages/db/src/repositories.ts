import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { TrustedScope } from '@customerbuddy/contracts';
import { withScope } from './scope.js';

export class DataError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

function customerScope(scope: TrustedScope): string {
  if (scope.role !== 'customer' || !scope.customerId) throw new DataError('CUSTOMER_ONLY', 403);
  return scope.customerId;
}

async function audit(
  client: PoolClient,
  scope: TrustedScope,
  action: string,
  entityId: string,
  details: Record<string, unknown> = {},
) {
  await client.query(
    `INSERT INTO app.audit_events(id,business_id,customer_id,actor_type,actor_subject,action,entity_type,entity_id,correlation_id,safe_details_json)
    VALUES($1,$2,$3,$4,$5,$6,'customer',$7,$8,$9)`,
    [
      randomUUID(),
      scope.businessId,
      scope.customerId ?? null,
      scope.role,
      scope.subject,
      action,
      entityId,
      randomUUID(),
      JSON.stringify(details),
    ],
  );
}

async function consentSummary(client: PoolClient, customerId: string) {
  const result = await client.query<{ purpose: string; granted: boolean }>(
    `SELECT DISTINCT ON(purpose) purpose,granted FROM app.consent_events
    WHERE customer_id=$1 ORDER BY purpose,event_sequence DESC`,
    [customerId],
  );
  return Object.fromEntries(
    ['preference_memory', 'operational_reminders', 'marketing'].map((purpose) => [
      purpose,
      result.rows.find((row) => row.purpose === purpose)?.granted ?? false,
    ]),
  );
}

export function createRepositories(pool: Pool) {
  return {
    async me(scope: TrustedScope) {
      return withScope(pool, scope, async (client) => {
        const business = (
          await client.query(
            'SELECT id,slug,name,timezone,is_synthetic FROM app.businesses WHERE id=$1',
            [scope.businessId],
          )
        ).rows[0];
        if (!business) throw new DataError('NOT_FOUND', 404);
        const profile = scope.customerId
          ? (
              await client.query(
                'SELECT id,display_code,display_name,preferred_language,version FROM app.customers WHERE id=$1',
                [scope.customerId],
              )
            ).rows[0]
          : null;
        if (scope.role === 'customer' && !profile) throw new DataError('NOT_FOUND', 404);
        return {
          role: scope.role,
          business,
          profile,
          consents: scope.customerId ? await consentSummary(client, scope.customerId) : null,
          assistantMode: 'scripted',
          isSynthetic: true,
        };
      });
    },
    async profile(
      scope: TrustedScope,
      changes: { displayName?: string; preferredLanguage?: 'bm' | 'en' },
    ) {
      const id = customerScope(scope);
      return withScope(pool, scope, async (client) => {
        const result = await client.query(
          'UPDATE app.customers SET display_name=COALESCE($1,display_name),preferred_language=COALESCE($2,preferred_language),version=version+1,updated_at=clock_timestamp() WHERE id=$3 RETURNING id,display_code,display_name,preferred_language,version',
          [changes.displayName ?? null, changes.preferredLanguage ?? null, id],
        );
        if (!result.rows[0]) throw new DataError('NOT_FOUND', 404);
        await audit(client, scope, 'profile_updated', id, { fields: Object.keys(changes) });
        return result.rows[0];
      });
    },
    async consents(scope: TrustedScope, purpose: string, granted: boolean) {
      const id = customerScope(scope);
      return withScope(pool, scope, async (client) => {
        // All optional-memory writes/withdrawals lock the same customer row.
        await client.query('SELECT id FROM app.customers WHERE id=$1 FOR UPDATE', [id]);
        await client.query(
          "INSERT INTO app.consent_events(id,business_id,customer_id,purpose,granted,source,notice_version) VALUES($1,$2,$3,$4,$5,'customer_control','demo-notice-v1')",
          [randomUUID(), scope.businessId, id, purpose, granted],
        );
        if (purpose === 'preference_memory' && !granted)
          await client.query('DELETE FROM app.customer_preferences WHERE customer_id=$1', [id]);
        await audit(client, scope, 'consent_changed', id, { purpose, granted });
        return consentSummary(client, id);
      });
    },
    async preferences(scope: TrustedScope) {
      const id = customerScope(scope);
      return withScope(
        pool,
        scope,
        async (client) =>
          (
            await client.query(
              'SELECT key,value_json AS value,updated_at FROM app.customer_preferences WHERE customer_id=$1 ORDER BY key',
              [id],
            )
          ).rows,
      );
    },
    async putPreference(scope: TrustedScope, key: string, value: string) {
      const id = customerScope(scope);
      return withScope(pool, scope, async (client) => {
        await client.query('SELECT id FROM app.customers WHERE id=$1 FOR UPDATE', [id]);
        const consent = (
          await client.query<{ id: string; granted: boolean }>(
            "SELECT id,granted FROM app.consent_events WHERE customer_id=$1 AND purpose='preference_memory' ORDER BY event_sequence DESC LIMIT 1",
            [id],
          )
        ).rows[0];
        if (!consent?.granted) throw new DataError('MEMORY_CONSENT_REQUIRED', 409);
        await client.query(
          `INSERT INTO app.customer_preferences(id,business_id,customer_id,key,value_json,consent_event_id)
          VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(business_id,customer_id,key) DO UPDATE SET value_json=EXCLUDED.value_json,consent_event_id=EXCLUDED.consent_event_id,updated_at=clock_timestamp()`,
          [randomUUID(), scope.businessId, id, key, JSON.stringify(value), consent.id],
        );
        await audit(client, scope, 'preference_saved', id, { key });
        return { key, value };
      });
    },
    async deletePreference(scope: TrustedScope, key: string) {
      const id = customerScope(scope);
      return withScope(pool, scope, async (client) => {
        await client.query('SELECT id FROM app.customers WHERE id=$1 FOR UPDATE', [id]);
        await client.query('DELETE FROM app.customer_preferences WHERE customer_id=$1 AND key=$2', [
          id,
          key,
        ]);
        await audit(client, scope, 'preference_deleted', id, { key });
      });
    },
    async catalogue(scope: TrustedScope) {
      return withScope(
        pool,
        scope,
        async (client) =>
          (
            await client.query(
              `SELECT p.id AS product_id,p.sku,c.label,c.description,c.units_description,c.unit_price_sen::integer,c.knowledge_version_id
        FROM app.catalogue_items c JOIN app.products p ON p.business_id=c.business_id AND p.id=c.product_id
        JOIN app.businesses b ON b.id=c.business_id AND b.active_knowledge_version_id=c.knowledge_version_id
        WHERE c.business_id=$1 AND c.available AND p.active ORDER BY p.sku`,
              [scope.businessId],
            )
          ).rows,
      );
    },
    async knowledge(scope: TrustedScope) {
      return withScope(pool, scope, async (client) => ({
        policy:
          (
            await client.query(
              'SELECT k.id,k.version_number,k.policy_json FROM app.knowledge_versions k JOIN app.businesses b ON b.id=k.business_id AND b.active_knowledge_version_id=k.id WHERE k.business_id=$1',
              [scope.businessId],
            )
          ).rows[0] ?? null,
        entries: (
          await client.query(
            'SELECT e.fact_key,e.category,e.content_bm,e.content_en FROM app.knowledge_entries e JOIN app.businesses b ON b.id=e.business_id AND b.active_knowledge_version_id=e.knowledge_version_id WHERE e.business_id=$1 ORDER BY e.fact_key',
            [scope.businessId],
          )
        ).rows,
      }));
    },
    async pickupOptions(scope: TrustedScope) {
      return withScope(pool, scope, async (client) => ({
        timezone: 'Asia/Kuala_Lumpur',
        slots: (
          await client.query(
            'SELECT id,code,start_local::text,end_local::text FROM app.pickup_slots WHERE business_id=$1 AND active ORDER BY start_local',
            [scope.businessId],
          )
        ).rows,
      }));
    },
    async capacity(scope: TrustedScope, date: string) {
      return withScope(
        pool,
        scope,
        async (client) =>
          (
            await client.query(
              'SELECT c.product_id,c.version,p.sku,c.pickup_date::text,c.max_units,c.held_units,c.committed_units,c.max_units-c.held_units-c.committed_units AS available_units FROM app.capacity_buckets c JOIN app.products p ON p.business_id=c.business_id AND p.id=c.product_id WHERE c.business_id=$1 AND c.pickup_date=$2 ORDER BY p.sku',
              [scope.businessId, date],
            )
          ).rows,
      );
    },
    async orders(scope: TrustedScope, id?: string) {
      return withScope(pool, scope, async (client) => {
        const result = await client.query(
          `SELECT o.id,o.display_code,o.customer_id,o.state,o.version,o.exception_paused,o.pickup_slot_id,o.pickup_date::text,o.total_sen::integer,o.deposit_required_sen::integer,
          (SELECT jsonb_build_object('state',r.state,'expiresAt',r.expires_at) FROM app.reservations r WHERE r.order_id=o.id AND r.business_id=o.business_id) AS reservation,
          (SELECT jsonb_agg(jsonb_build_object('id',p.id,'amountSen',p.amount_sen::integer,'reference',p.reference,'state',p.state,'verifiedAt',p.verified_at)) FROM app.payments p WHERE p.order_id=o.id AND p.business_id=o.business_id) AS payments,
          (SELECT jsonb_agg(jsonb_build_object('id',d.id,'kind',d.kind,'state',d.state)) FROM app.documents d WHERE d.order_id=o.id AND d.business_id=o.business_id) AS documents,
          COALESCE((SELECT sum(p.amount_sen)::integer FROM app.payments p WHERE p.business_id=o.business_id AND p.order_id=o.id AND p.state='verified'),0) AS verified_paid_sen,
          (SELECT jsonb_agg(jsonb_build_object('sku',i.sku_snapshot,'label',i.label_snapshot,'quantity',i.quantity,'unitPriceSen',i.unit_price_sen::integer)) FROM app.order_items i WHERE i.business_id=o.business_id AND i.order_id=o.id) AS items
          FROM app.orders o WHERE o.business_id=$1 AND ($2::uuid IS NULL OR o.id=$2) ORDER BY o.created_at DESC LIMIT 100`,
          [scope.businessId, id ?? null],
        );
        if (id && !result.rows[0]) throw new DataError('NOT_FOUND', 404);
        return id ? result.rows[0] : result.rows;
      });
    },
    async ownerCustomers(scope: TrustedScope, id?: string) {
      if (scope.role !== 'owner') throw new DataError('OWNER_ONLY', 403);
      return withScope(pool, scope, async (client) => {
        const result = await client.query(
          'SELECT id,display_code,display_name,preferred_language,status FROM app.customers WHERE business_id=$1 AND ($2::uuid IS NULL OR id=$2) ORDER BY display_code LIMIT 100',
          [scope.businessId, id ?? null],
        );
        if (id && !result.rows[0]) throw new DataError('NOT_FOUND', 404);
        return id ? result.rows[0] : result.rows;
      });
    },
  };
}
