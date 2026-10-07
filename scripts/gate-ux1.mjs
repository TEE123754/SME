import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { runNode } from './processes.mjs';

// UI-only phase: preserve the passing business integration evidence.
const final = process.argv.includes('--final');
const focus = process.argv.includes('--focus');
const path = `docs/evidence/ux1/${focus ? 'focus-affected' : final ? 'final-affected' : 'gate'}.json`;
await mkdir('docs/evidence/ux1', { recursive: true });
let report;
try {
  report = JSON.parse(await readFile(path, 'utf8'));
} catch {
  report = {
    startedAt: new Date().toISOString(),
    scope: focus
      ? 'Affected accessibility repair: shared keyboard focus containment across four native modals and status-colour contrast. Compiler/lint/build cover the shared React helper/imports; business integration evidence preserved.'
      : final
        ? 'Final affected UI gate after browser findings: route focus, mobile labels/controls, drawer focus return, customer chat disclosures, legacy slug navigation and quote review focus. E1 integration passes preserved.'
        : 'UX1 frontend navigation, overview, directories, dialogs and checkout presentation. Existing E1 integration passes preserved.',
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
]) {
  if (report.results.some((result) => result.check === check && result.status === 'passed'))
    continue;
  const started = Date.now();
  try {
    await runNode(args);
    report.results.push({ check, status: 'passed', durationMs: Date.now() - started });
  } catch (error) {
    report.results.push({
      check,
      status: 'failed',
      message: error.message,
      durationMs: Date.now() - started,
    });
    throw error;
  } finally {
    report.recordedAt = new Date().toISOString();
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  }
}
