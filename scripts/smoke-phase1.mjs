import assert from 'node:assert/strict';
import { launchNode, stopChild, tsxCli, viteCli } from './processes.mjs';

const api = launchNode(['apps/api/dist/server.mjs'], {
  env: { ...process.env, API_PORT: '3011', ALLOWED_ORIGINS: 'http://127.0.0.1:5183' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const web = launchNode([viteCli, 'apps/web', '--port', '5183'], {
  env: { ...process.env, API_PORT: '3011' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
for (const child of [api, web]) {
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });
}

async function ready(url) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (api.exitCode !== null || web.exitCode !== null)
      throw new Error(`Startup exited early: ${logs}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return response;
    } catch {
      /* Await startup, not a repeated test suite. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Startup deadline exceeded for ${url}: ${logs}`);
}

try {
  await ready('http://127.0.0.1:3011/api/v1/health');
  const response = await ready('http://127.0.0.1:5183/api/v1/health');
  const health = await response.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.database, 'connected');
  assert.equal(health.assistantMode, 'scripted');
  const page = await ready('http://127.0.0.1:5183/b/ainas-home-bakery');
  assert.match(await page.text(), /src\/main.tsx/);
  const denied = await fetch('http://127.0.0.1:3011/api/v1/health', {
    headers: { Origin: 'https://untrusted.example' },
  });
  assert.equal(denied.status, 403);
  const missing = await fetch('http://127.0.0.1:3011/api/v1/not-implemented');
  assert.equal(missing.status, 404);
  const invalidConfig = launchNode([tsxCli, 'apps/api/src/server.ts'], {
    env: { ...process.env, APP_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let configLogs = '';
  invalidConfig.stderr.on('data', (chunk) => {
    configLogs += chunk.toString();
  });
  const invalidExit = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      stopChild(invalidConfig);
      reject(new Error('Unsafe configuration rejection timed out'));
    }, 8_000);
    invalidConfig.once('error', reject);
    invalidConfig.once('exit', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  assert.notEqual(invalidExit, 0);
  assert.match(configLogs, /Invalid local configuration: APP_ENV/);
  console.log(
    'PASS: built API startup, actual PostgreSQL SELECT, web/proxy startup, denied origin, 404 and unsafe configuration rejection.',
  );
} finally {
  stopChild(web);
  stopChild(api);
}
