import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

const migrationDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

export async function applyMigrations(pool: Pool): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(70202602)');
    await client.query(`CREATE TABLE IF NOT EXISTS public.cb_migrations (
      name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
    await client.query('REVOKE ALL ON public.cb_migrations FROM PUBLIC,cb_runtime,cb_worker');
    let applied = 0;
    for (const name of (await readdir(migrationDirectory))
      .filter((name) => name.endsWith('.sql'))
      .sort()) {
      const sql = await readFile(`${migrationDirectory}/${name}`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const previous = await client.query<{ checksum: string }>(
        'SELECT checksum FROM public.cb_migrations WHERE name=$1',
        [name],
      );
      if (previous.rows[0]) {
        if (previous.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${name}; add a new migration`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public.cb_migrations(name,checksum) VALUES($1,$2)', [
          name,
          checksum,
        ]);
        await client.query('COMMIT');
        applied++;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock(70202602)');
    client.release();
  }
}
