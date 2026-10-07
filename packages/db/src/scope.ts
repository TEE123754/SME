import type { Pool, PoolClient } from 'pg';
import type { TrustedScope } from '@customerbuddy/contracts';

export async function withScope<T>(
  pool: Pool,
  scope: TrustedScope,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT set_config('app.business_id',$1,true),set_config('app.customer_id',$2,true),
      set_config('app.actor_role',$3,true),set_config('app.actor_subject',$4,true)`,
      [scope.businessId, scope.customerId ?? '', scope.role, scope.subject],
    );
    const value = await operation(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function assertRestrictedRuntime(pool: Pool): Promise<void> {
  const result = await pool.query<{
    allowed: boolean;
  }>(`SELECT (current_user='cb_runtime' AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb) AS allowed
    FROM pg_roles WHERE rolname=current_user`);
  if (!result.rows[0]?.allowed)
    throw new Error('API requires restricted cb_runtime credentials; run pnpm db:migrate');
}
