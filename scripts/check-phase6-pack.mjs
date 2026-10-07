import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const pack = resolve('handoff/workbuddy-reference');
const manifest = JSON.parse(await readFile(resolve(pack, 'manifest.json'), 'utf8'));
const paths = new Set(manifest.files.map((f) => f.path)),
  errors = [];
const environment = await readFile('.env', 'utf8');
const secrets = [
  ...environment.matchAll(/^(?:DATABASE_URL|WORKER_DATABASE_URL|MIGRATION_DATABASE_URL)=(.+)$/gm),
]
  .map((m) => decodeURIComponent(new URL(m[1].trim()).password))
  .filter((p) => p.length >= 12);
assert.ok(secrets.length >= 2, 'Local credential scan requires generated role configuration');
for (const f of manifest.files) {
  const file = resolve(pack, f.path),
    bytes = await readFile(file);
  if (secrets.some((secret) => bytes.includes(Buffer.from(secret))))
    errors.push('Credential value in ' + f.path);
  if (createHash('sha256').update(bytes).digest('hex') !== f.sha256)
    errors.push('Hash mismatch ' + f.path);
  if (
    /\.(tsx?|m?js|sql|env|exe|zip)$/.test(f.path) ||
    /(^|\/)(node_modules|dist|\.local|\.git)(\/|$)/.test(f.path)
  )
    errors.push('Disallowed artifact ' + f.path);
  if (/\.(md|json)$/.test(f.path)) {
    const text = bytes.toString('utf8');
    if (
      /postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|C:[\\/]Users[\\/]Edison Tee/i.test(
        text,
      )
    )
      errors.push('Nonportable or sensitive text ' + f.path);
    if (f.path.endsWith('.md'))
      for (const match of text.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
        const link = (match[1] ?? match[2]).split('#')[0];
        if (!link || /^(https?:|mailto:)/.test(link)) continue;
        const target = relative(pack, resolve(dirname(file), decodeURI(link))).replaceAll(
          '\\',
          '/',
        );
        if (!paths.has(target)) errors.push('Broken link ' + f.path + ' → ' + target);
      }
  }
}
assert.ok(paths.has('fixtures/synthetic-fixtures.json'));
assert.ok(paths.has('sample-documents/receipt.pdf'));
const scenarios = JSON.parse(
  await readFile(resolve(pack, 'scenarios/scripted-cases.json'), 'utf8'),
);
assert.ok(scenarios.cases.length >= 30);
await writeFile(
  'docs/evidence/phase6-pack.json',
  JSON.stringify(
    {
      phase: 6,
      recordedAt: new Date().toISOString(),
      files: paths.size,
      inputCases: scenarios.cases.length,
      status: errors.length ? 'failed' : 'passed',
      errors,
    },
    null,
    2,
  ) + '\n',
);
assert.equal(errors.length, 0, errors.join('\n'));
console.log('Portable pack hashes, links, artifact boundaries and credential patterns passed.');
