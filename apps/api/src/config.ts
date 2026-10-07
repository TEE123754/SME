import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

export const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
loadDotenv({ path: resolve(workspaceRoot, '.env'), quiet: true });

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
const schema = z.object({
  APP_ENV: z.literal('local-demo'),
  API_HOST: z.literal('127.0.0.1').default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  AUTH_ADAPTER: z.literal('demo'),
  ASSISTANT_MODE: z.literal('scripted'),
  DATABASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      loopbackHosts.has(url.hostname) &&
      url.pathname === '/customerbuddy' &&
      url.username === 'cb_runtime' &&
      url.password.length > 0 &&
      !value.includes('GENERATE_WITH_DB_SETUP')
    );
  }, 'Use restricted cb_runtime credentials for the local customerbuddy database'),
  ALLOWED_ORIGINS: z.string().default('http://127.0.0.1:5173'),
  LOCAL_DOCUMENT_PATH: z.string().default('.local/documents'),
});

export function readConfig(environment: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(environment);
  if (!result.success) {
    // Report field names, never credential-bearing values.
    throw new Error(
      `Invalid local configuration: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  }
  const value = result.data;
  const allowedOrigins = value.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  for (const origin of allowedOrigins) {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !loopbackHosts.has(url.hostname) || url.origin !== origin) {
      throw new Error('ALLOWED_ORIGINS must contain exact loopback HTTP origins');
    }
  }
  const documentPath = resolve(workspaceRoot, value.LOCAL_DOCUMENT_PATH);
  const localRoot = resolve(workspaceRoot, '.local');
  const offset = relative(localRoot, documentPath);
  if (!offset || offset.startsWith('..') || isAbsolute(offset)) {
    throw new Error('LOCAL_DOCUMENT_PATH must be inside the workspace .local directory');
  }
  return { ...value, allowedOrigins, documentPath };
}
