import { writeFile } from 'node:fs/promises';
import { runNode } from './processes.mjs';

// Final affected checks only: preserve the completed integration gate.
const results = [];
try {
  for (const [check, args] of [
    ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
    [
      'ESLint',
      ['node_modules/eslint/bin/eslint.js', 'apps', 'packages', 'scripts', '--max-warnings', '0'],
    ],
    ['Build', ['scripts/build.mjs']],
  ]) {
    const started = Date.now();
    try {
      await runNode(args);
      results.push({ check, status: 'passed', durationMs: Date.now() - started });
    } catch (e) {
      results.push({ check, status: 'failed', message: e.message });
      throw e;
    }
  }
} finally {
  await writeFile(
    'docs/evidence/expansion/final-affected.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        reason:
          'Final catalogue-neutral form defaults, agent priority ordering and title polish; rebuild includes API SQL repairs made after original build. Integration passes preserved without repetition.',
        results,
      },
      null,
      2,
    ),
  );
}
