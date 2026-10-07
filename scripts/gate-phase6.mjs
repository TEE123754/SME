import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { runNode, tsxCli } from './processes.mjs';

const checks = [
  ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
  [
    'ESLint',
    ['node_modules/eslint/bin/eslint.js', 'apps', 'packages', 'scripts', '--max-warnings', '0'],
  ],
  ['Build', ['scripts/build.mjs']],
  ['Identity/persistence regression', [tsxCli, 'scripts/test-phase2.ts']],
  ['Commerce/concurrency regression', [tsxCli, 'scripts/test-phase3.ts']],
  ['UI API regression', [tsxCli, 'scripts/test-phase4-api.ts']],
  ['Job/document regression', [tsxCli, 'scripts/test-phase5.ts']],
  ['Scripted acceptance/restart/security', [tsxCli, 'scripts/test-phase6.ts']],
  ['Portable pack build', ['scripts/pack-phase6.mjs']],
  ['Portable pack validation', ['scripts/check-phase6-pack.mjs']],
];
if (process.argv[3]) checks[7][1].push(process.argv[3]);
const previousFiles = [
  'phase2-integration.json',
  'phase3-integration.json',
  'phase4-api.json',
  'phase5-integration.json',
];
const previous = new Map();
for (const file of previousFiles) previous.set(file, await readFile('docs/evidence/' + file));
await mkdir('docs/evidence/phase6-regression', { recursive: true });
const from = Number(process.argv[2] ?? 0);
const prior = from ? JSON.parse(await readFile('docs/evidence/phase6-gate.json', 'utf8')) : null;
const results = prior?.results.slice(0, from) ?? [];
async function preserveRegressions() {
  for (const [file, bytes] of previous) {
    const current = await readFile('docs/evidence/' + file);
    if (!current.equals(bytes)) {
      await copyFile('docs/evidence/' + file, 'docs/evidence/phase6-regression/' + file);
      await writeFile('docs/evidence/' + file, bytes);
    }
  }
}
try {
  for (const [check, args] of checks.slice(from)) {
    if (check === 'Portable pack build') await preserveRegressions();
    const started = Date.now();
    console.log('Phase6 gate: ' + check);
    try {
      await runNode(args);
      results.push({ check, status: 'passed', durationMs: Date.now() - started });
    } catch (e) {
      results.push({ check, status: 'failed', message: e.message });
      throw e;
    }
  }
} finally {
  // Keep historical phase evidence intact; current cumulative runs get a separate namespace.
  await preserveRegressions();
  await writeFile(
    'docs/evidence/phase6-gate.json',
    JSON.stringify(
      { ...prior, phase: 6, recordedAt: new Date().toISOString(), node: process.version, results },
      null,
      2,
    ) + '\n',
  );
}
console.log(
  'Automated cumulative acceptance passed; reconcile browser/reference review before completion.',
);
