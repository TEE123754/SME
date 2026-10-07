import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { runNode, tsxCli } from './processes.mjs';
await mkdir('docs/evidence/expansion/historical', { recursive: true });
const resume = process.argv.includes('--resume');
const previous = resume
  ? JSON.parse(await readFile('docs/evidence/expansion/gate.json', 'utf8')).results
  : [];
if (!resume)
  for (const phase of [3, 5])
    for (const kind of ['integration', 'gate'])
      try {
        await copyFile(
          `docs/evidence/phase${phase}-${kind}.json`,
          `docs/evidence/expansion/historical/phase${phase}-${kind}.json`,
        );
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
const checks = [
    ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
    [
      'ESLint',
      ['node_modules/eslint/bin/eslint.js', 'apps', 'packages', 'scripts', '--max-warnings', '0'],
    ],
    ['Build', ['scripts/build.mjs']],
    ['Expansion integration', [tsxCli, 'scripts/test-expansion.ts']],
    ['Commerce regression', [tsxCli, 'scripts/test-phase3.ts']],
    ['Jobs/documents regression', [tsxCli, 'scripts/test-phase5.ts']],
  ],
  results = [];
try {
  for (const [name, args] of checks) {
    const passed = previous.find((p) => p.check === name && p.status === 'passed');
    if (passed) {
      results.push(passed);
      continue;
    }
    console.log(`Expansion end gate: ${name}`);
    const started = Date.now();
    try {
      await runNode(args);
      results.push({ check: name, status: 'passed', durationMs: Date.now() - started });
    } catch (e) {
      results.push({ check: name, status: 'failed', message: e.message });
      throw e;
    }
  }
} finally {
  await writeFile(
    'docs/evidence/expansion/gate.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        reasonForRegression:
          'Expanded order state machine, inventory reservation checks, migrations and business-branded documents cross existing commerce/jobs boundaries.',
        results,
      },
      null,
      2,
    ),
  );
}
