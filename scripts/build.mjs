import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { runNode, viteCli } from './processes.mjs';

await mkdir('apps/api/dist', { recursive: true });
await build({
  entryPoints: ['apps/api/src/server.ts'],
  outfile: 'apps/api/dist/server.mjs',
  platform: 'node',
  target: 'node24',
  format: 'esm',
  bundle: true,
  // Bundle local workspace sources; externalize installed third-party dependencies.
  external: ['express', 'cors', 'dotenv', 'zod', 'pg'],
});
await runNode([viteCli, 'build', 'apps/web']);
