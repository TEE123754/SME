import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { runNode } from './processes.mjs';

const checks = [
  ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
  [
    'ESLint',
    ['node_modules/eslint/bin/eslint.js', 'apps', 'packages', 'scripts', '--max-warnings', '0'],
  ],
  ['Build', ['scripts/build.mjs']],
  ['Startup smoke', ['scripts/smoke-phase1.mjs']],
];
const results = [];
try {
  for (const [name, args] of checks) {
    console.log(`Phase 1 gate: ${name}`);
    const started = Date.now();
    try {
      await runNode(args);
      results.push({ check: name, status: 'passed', durationMs: Date.now() - started });
    } catch (error) {
      results.push({ check: name, status: 'failed', message: error.message });
      throw error;
    }
  }
} finally {
  const evidence = fileURLToPath(new URL('../docs/evidence/', import.meta.url));
  await mkdir(evidence, { recursive: true });
  await writeFile(
    `${evidence}/phase1-gate.json`,
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        implementation: 'Codex local scripted reference',
        phase: 1,
        node: process.version,
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
console.log('Phase 1 gate passed. Browser rendering review is recorded separately.');
