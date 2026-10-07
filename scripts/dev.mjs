import { launchNode, root, stopChild, tsxCli, viteCli } from './processes.mjs';
import { spawnSync } from 'node:child_process';

if (process.platform === 'win32') {
  const database = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'scripts/postgres.ps1', 'start'],
    { cwd: root, stdio: 'inherit', windowsHide: true },
  );
  if (database.status !== 0) process.exit(database.status ?? 1);
}
const children = [
  launchNode([tsxCli, 'watch', 'apps/api/src/server.ts']),
  launchNode([viteCli, 'apps/web']),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(stopChild);
  process.exit(code);
}
for (const child of children) {
  child.once('error', () => stop(1));
  child.once('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
console.log('Local web + API + bounded job scheduler starting. No tests run on save.');
