import { createDatabasePool, assertRestrictedRuntime } from '@customerbuddy/db';
import { createApp } from './app.js';
import { localRuntime } from './local-runtime.js';
import { readConfig } from './config.js';

const config = readConfig();
const pool = createDatabasePool(config.DATABASE_URL);
try {
  await assertRestrictedRuntime(pool);
} catch {
  console.error(
    'API requires initialized data and restricted credentials. Run pnpm db:migrate and pnpm db:seed.',
  );
  await pool.end();
  process.exit(1);
}
pool.on('error', () =>
  console.error('Database connection interrupted; health will report unavailable.'),
);
const local = localRuntime(config.documentPath);
const server = createApp(config, pool, local.reset).listen(config.API_PORT, config.API_HOST, () => {
  console.log(
    `BizBuddy API http://${config.API_HOST}:${config.API_PORT} (local scripted demo)`,
  );
});

function shutdown() {
  server.close(() => {
    void Promise.all([pool.end(), local.close()]).then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 5_000).unref();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
