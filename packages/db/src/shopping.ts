import type { Pool } from 'pg';
import type { TrustedScope } from '@customerbuddy/contracts';
import { withScope } from './scope.js';
import { idem } from './commerce.js';
import { DataError } from './repositories.js';
import { ownerOnly, activeCatalogue } from './operations.js';
export function createShopping(pool: Pool) {
  const write = <T>(
    s: TrustedScope,
    operation: string,
    key: string,
    input: unknown,
    fn: Parameters<typeof withScope<T>>[2],
  ) =>
    withScope(pool, s, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [s.businessId]);
      return idem(c, s, operation, key, input, () => fn(c));
    });
  return {
    membership(s: TrustedScope) {
      return withScope(pool, s, async (c) => ({
        program: (
          await c.query(
            'SELECT enabled,discount_basis_points AS "basisPoints",version FROM app.loyalty_programs',
          )
        ).rows[0],
        membership: s.customerId
          ? ((
              await c.query(
                'SELECT active,version,joined_at FROM app.customer_loyalty WHERE customer_id=$1',
                [s.customerId],
              )
            ).rows[0] ?? null)
          : null,
        effectiveBasisPoints: Math.min(
          (await c.query('SELECT discount_basis_points FROM app.loyalty_programs')).rows[0]
            ?.discount_basis_points ?? 0,
          Number(
            (await c.query("SELECT ethics->>'maxDiscountPercent' AS n FROM app.business_profiles"))
              .rows[0]?.n ?? 15,
          ) * 100,
        ),
      }));
    },
    join(s: TrustedScope, active: boolean, key: string) {
      if (s.role !== 'customer' || !s.customerId) throw new DataError('CUSTOMER_ONLY', 403);
      return write(s, 'membership', key, { active }, async (c) => {
        if (active && !(await c.query('SELECT enabled FROM app.loyalty_programs')).rows[0]?.enabled)
          throw new DataError('PROGRAM_DISABLED', 409);
        const result = (
          await c.query(
            `INSERT INTO app.customer_loyalty(business_id,customer_id,active,joined_at) VALUES($1,$2,$3,app.business_now()) ON CONFLICT(business_id,customer_id) DO UPDATE SET active=EXCLUDED.active,version=app.customer_loyalty.version+1 RETURNING active,version,joined_at`,
            [s.businessId, s.customerId, active],
          )
        ).rows[0];
        await c.query(
          `INSERT INTO app.audit_events(id,business_id,customer_id,actor_type,actor_subject,action,entity_type,entity_id,correlation_id,safe_details_json,occurred_at) VALUES(gen_random_uuid(),$1,$2,'customer',$3,$4,'membership',$2,gen_random_uuid(),'{}',app.business_now())`,
          [s.businessId, s.customerId, s.subject, active ? 'membership_joined' : 'membership_left'],
        );
        return result;
      });
    },
    program(
      s: TrustedScope,
      input: { enabled: boolean; basisPoints: number; version: number },
      key: string,
    ) {
      ownerOnly(s);
      return write(s, 'loyalty_program', key, input, async (c) => {
        const limit =
          Number(
            (await c.query("SELECT ethics->>'maxDiscountPercent' AS n FROM app.business_profiles"))
              .rows[0]?.n ?? 15,
          ) * 100;
        if (input.basisPoints > limit) throw new DataError('DISCOUNT_LIMIT', 409);
        const r = await c.query(
          'UPDATE app.loyalty_programs SET enabled=$1,discount_basis_points=$2,version=version+1 WHERE version=$3 RETURNING *',
          [input.enabled, input.basisPoints, input.version],
        );
        if (!r.rowCount) throw new DataError('VERSION_CONFLICT', 409);
        return r.rows[0];
      });
    },
    setup(s: TrustedScope) {
      ownerOnly(s);
      return withScope(pool, s, async (c) => {
        const products = (await activeCatalogue(c)).filter((p) => p.available);
        const facts = Number(
          (
            await c.query(
              'SELECT count(*) AS n FROM app.knowledge_entries e JOIN app.businesses b ON b.active_knowledge_version_id=e.knowledge_version_id',
            )
          ).rows[0].n,
        );
        const capacity = Number(
          (
            await c.query(
              `SELECT count(DISTINCT p.id) AS n FROM app.products p JOIN app.catalogue_items i ON i.product_id=p.id JOIN app.businesses b ON b.active_knowledge_version_id=i.knowledge_version_id JOIN app.capacity_buckets cb ON cb.product_id=p.id JOIN app.knowledge_versions k ON k.id=b.active_knowledge_version_id WHERE p.active AND i.available AND cb.max_units>cb.held_units+cb.committed_units AND EXISTS(SELECT 1 FROM app.pickup_slots sl WHERE sl.active AND ((cb.pickup_date+sl.start_local) AT TIME ZONE b.timezone)>=app.business_now()+((k.policy_json->>'leadTimeHours')::integer*interval '1 hour'))`,
            )
          ).rows[0].n,
        );
        const business = (await c.query('SELECT id,name,slug FROM app.businesses')).rows[0];
        return {
          business,
          profileComplete: facts > 0,
          productCount: products.length,
          capacityProductCount: capacity,
          ready: facts > 0 && products.length > 0 && capacity >= products.length,
        };
      });
    },
  };
}
