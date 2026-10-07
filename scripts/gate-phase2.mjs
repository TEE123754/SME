import { mkdir, writeFile } from 'node:fs/promises';
import { runNode, tsxCli } from './processes.mjs';

const checks = [
  ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
  [
    'ESLint',
    ['node_modules/eslint/bin/eslint.js', 'apps', 'packages', 'scripts', '--max-warnings', '0'],
  ],
  ['Build', ['scripts/build.mjs']],
  ['Phase 2 integration', [tsxCli, 'scripts/test-phase2.ts']],
];
const results = [];
try {
  for (const [name, args] of checks) {
    const started = Date.now();
    console.log(`Phase 2 gate: ${name}`);
    try {
      await runNode(args);
      results.push({ check: name, status: 'passed', durationMs: Date.now() - started });
    } catch (error) {
      results.push({ check: name, status: 'failed', message: error.message });
      throw error;
    }
  }
} finally {
  await mkdir('docs/evidence', { recursive: true });
  await writeFile(
    'docs/evidence/phase2-gate.json',
    JSON.stringify(
      { recordedAt: new Date().toISOString(), phase: 2, node: process.version, results },
      null,
      2,
    ) + '\n',
  );
}
console.log('Phase 2 gate passed. Phase 3 has not started.');
