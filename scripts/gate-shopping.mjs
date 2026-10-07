import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { runNode, tsxCli } from './processes.mjs';
await mkdir('docs/evidence/shopping', { recursive: true });
const final = process.argv.includes('--final');
const path = `docs/evidence/shopping/${final ? 'final-affected' : 'gate'}.json`;
let report;
try {
  report = JSON.parse(await readFile(path, 'utf8'));
} catch {
  report = {
    startedAt: new Date().toISOString(),
    scope:
      'S1 complete build: storefront, scoped cart, local onboarding, explicit membership/newsletter and deterministic discounts. Expanded commerce regression justified by quote/confirmation changes.',
    results: [],
  };
}
for (const [check, args] of [
  ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
  [
    'ESLint',
    ['node_modules/eslint/bin/eslint.js', 'apps', 'packages', 'scripts', '--max-warnings', '0'],
  ],
  ['Build', ['scripts/build.mjs']],
  ['Shopping integration', [tsxCli, 'scripts/test-shopping.ts']],
  ['Commerce regression', [tsxCli, 'scripts/test-phase3.ts']],
]) {
  if (final && ['Shopping integration', 'Commerce regression'].includes(check)) continue;
  if (report.results.some((r) => r.check === check && r.status === 'passed')) continue;
  const start = Date.now();
  const previous =
    check === 'Commerce regression'
      ? await readFile('docs/evidence/phase3-integration.json')
      : null;
  try {
    await runNode(args);
    report.results.push({ check, status: 'passed', durationMs: Date.now() - start });
  } catch (e) {
    report.results.push({ check, status: 'failed', message: e.message });
    throw e;
  } finally {
    if (previous) {
      await writeFile(
        'docs/evidence/shopping/commerce.json',
        await readFile('docs/evidence/phase3-integration.json'),
      );
      await writeFile('docs/evidence/phase3-integration.json', previous);
    }
    report.recordedAt = new Date().toISOString();
    await writeFile(path, JSON.stringify(report, null, 2) + '\n');
  }
}
