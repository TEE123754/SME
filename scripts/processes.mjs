import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
export const tsxCli = require.resolve('tsx/cli');
export const viteCli = fileURLToPath(
  new URL('../apps/web/node_modules/vite/bin/vite.js', import.meta.url),
);

export function launchNode(args, options = {}) {
  return spawn(process.execPath, args, {
    cwd: root,
    windowsHide: true,
    stdio: 'inherit',
    ...options,
  });
}

export function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  } else child.kill('SIGTERM');
}

export async function runNode(args) {
  const child = launchNode(args);
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Command failed with exit ${code}: ${args[0]}`)),
    );
  });
}
