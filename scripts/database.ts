import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { createDatabasePool, applyMigrations, seedDemo } from '../packages/db/src/index.js';

export const rootDirectory = fileURLToPath(new URL('../', import.meta.url));
loadDotenv({ path: resolve(rootDirectory, '.env'), quiet: true });

export async function localAdminUrl(): Promise<string> {
  const password = (
    await readFile(resolve(rootDirectory, '.local/postgres/password.txt'), 'utf8')
  ).trim();
  return `postgresql://customerbuddy:${encodeURIComponent(password)}@127.0.0.1:54329/customerbuddy`;
}

export async function roleCredentials(): Promise<{ runtime: string; worker: string }> {
  const path = resolve(rootDirectory, '.local/database-roles.json');
  try {
    return JSON.parse(await readFile(path, 'utf8')) as { runtime: string; worker: string };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await mkdir(resolve(rootDirectory, '.local'), { recursive: true });
    const credentials = {
      runtime: randomBytes(32).toString('hex'),
      worker: randomBytes(32).toString('hex'),
    };
    await writeFile(path, JSON.stringify(credentials), 'utf8');
    return credentials;
  }
}

export function connectionForRole(
  adminUrl: string,
  role: 'cb_runtime' | 'cb_worker',
  password: string,
  database = 'customerbuddy',
) {
  const url = new URL(adminUrl);
  url.username = role;
  url.password = password;
  url.pathname = `/${database}`;
  return url.toString();
}

export async function initializeLocalData() {
  const adminUrl = await localAdminUrl();
  const admin = createDatabasePool(adminUrl);
  try {
    const passwords = await roleCredentials();
    for (const [role, password] of [
      ['cb_runtime', passwords.runtime],
      ['cb_worker', passwords.worker],
    ]) {
      if (!role || !password || !/^[a-f0-9]{64}$/.test(password))
        throw new Error('Invalid local role configuration');
      const exists = await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role]);
      // Only constant role identifiers and validated random hex reach these utility statements.
      if (!exists.rowCount)
        await admin.query(
          `CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`,
        );
      else
        await admin.query(
          `ALTER ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`,
        );
    }
    await admin.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await admin.query('REVOKE CONNECT,TEMPORARY ON DATABASE customerbuddy FROM PUBLIC');
    await admin.query('GRANT CONNECT ON DATABASE customerbuddy TO cb_runtime,cb_worker');
    const applied = await applyMigrations(admin);
    const envPath = resolve(rootDirectory, '.env');
    let environment = await readFile(envPath, 'utf8');
    const values = {
      DATABASE_URL: connectionForRole(adminUrl, 'cb_runtime', passwords.runtime),
      MIGRATION_DATABASE_URL: adminUrl,
      WORKER_DATABASE_URL: connectionForRole(adminUrl, 'cb_worker', passwords.worker),
    };
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`^${key}=.*$`, 'm');
      environment = pattern.test(environment)
        ? environment.replace(pattern, `${key}=${value}`)
        : `${environment.trimEnd()}\n${key}=${value}\n`;
    }
    await writeFile(envPath, environment, 'utf8');
    console.log(
      `Local schema ready (${applied} new migration); ignored runtime/worker credentials configured.`,
    );
  } finally {
    await admin.end();
  }
}

export async function initializeSeed() {
  const pool = createDatabasePool(await localAdminUrl());
  try {
    console.log(
      (await seedDemo(pool))
        ? 'Seeded bakery, owner, ten synthetic customers and history.'
        : 'Seed already applied; existing customer changes preserved.',
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === 'migrate') await initializeLocalData();
    else if (process.argv[2] === 'seed') await initializeSeed();
    else throw new Error('Use migrate or seed');
  } catch (error) {
    console.error(
      'Local data setup failed:',
      (error as { code?: string }).code ?? 'configuration/migration error',
    );
    process.exitCode = 1;
  }
}
