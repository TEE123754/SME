import { Pool } from 'pg';
export type { Pool, PoolClient } from 'pg';
export { applyMigrations } from './migrate.js';
export { seedDemo, fixtureId, fixtureBusinessId, demoCustomers } from './seed.js';
export { withScope, assertRestrictedRuntime } from './scope.js';
export { createRepositories, DataError } from './repositories.js';

export function createDatabasePool(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 3_000,
    application_name: 'customerbuddy-local',
  });
}

export async function databaseReady(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query<{ ready: number }>('SELECT 1 AS ready');
    return result.rows[0]?.ready === 1;
  } catch {
    return false;
  }
}
export { createCommerce } from './commerce.js';
export { createOperations } from './operations.js';
