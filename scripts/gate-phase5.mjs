import { mkdir, writeFile } from 'node:fs/promises';
import { runNode, tsxCli } from './processes.mjs';

const checks = [
  ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
  [
    'ESLint',
    ['node_modules/eslint/bin/eslint.js', 'apps', 'packages', 'scripts', '--max-warnings', '0'],
  ],
  ['Build', ['scripts/build.mjs']],
  ['Phase 5 integration', [tsxCli, 'scripts/test-phase5.ts']],
];
const results = [];
try {
  for (const [name, args] of checks) {
    const started = Date.now();
    console.log(`Phase 5 gate: ${name}`);
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
    'docs/evidence/phase5-gate.json',
    JSON.stringify(
      { recordedAt: new Date().toISOString(), phase: 5, node: process.version, results },
      null,
      2,
    ) + '\n',
  );
}
console.log('Phase 5 automated checks passed. Browser/document gate remains pending.');
