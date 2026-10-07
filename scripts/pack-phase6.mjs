import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const root = process.cwd(),
  pack = resolve(root, 'handoff/workbuddy-reference');
const specs = [
  'PRD.md',
  'TRD.md',
  'APP_FLOW.md',
  'DESIGN_BRIEF.md',
  'BACKEND_SCHEMA.md',
  'IMPLEMENTATION_PLAN.md',
  'WORKBUDDY_REBUILD_BRIEF.md',
  'Idea.md',
];
async function put(path, content) {
  const dest = resolve(pack, path);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, content);
}
function portable(content, folder) {
  content = content.replace(
    /\[([^\]]+)\]\(<C:[/\\]Users[/\\]Edison Tee[/\\]Downloads[/\\]W3 AI in E-commerce\.pdf>\)/g,
    '$1 (original course reference; not bundled)',
  );
  let text = content.replace(
    /<C:[/\\]Users[/\\]Edison Tee[/\\]Downloads[/\\]SME[/\\]([^>]+)>/g,
    (_, file) =>
      '<' +
      relative(folder, resolve(pack, 'specifications', file.replaceAll('\\', '/'))).replaceAll(
        '\\',
        '/',
      ) +
      '>',
  );
  text = text
    .replace(/\]\(docs\/evidence\//g, '](../prototype-evidence/')
    .replace(/\]\(docs\/SCRIPTED_INPUTS.md\)/g, '](../scripted-demo/SCRIPTED_INPUTS.md)');
  return text;
}
for (const spec of specs)
  await put(
    'specifications/' + spec,
    portable(await readFile(spec, 'utf8'), resolve(pack, 'specifications')),
  );
await put('scripted-demo/SCRIPTED_INPUTS.md', await readFile('docs/SCRIPTED_INPUTS.md'));
for (const [file, dest] of Object.entries({
  'RUNBOOK.md': 'walkthrough/RUNBOOK.md',
  'WALKTHROUGH.md': 'walkthrough/WALKTHROUGH.md',
  'REVIEW_RUBRIC.md': 'scenarios/REVIEW_RUBRIC.md',
  'scripted-cases.json': 'scenarios/scripted-cases.json',
  'synthetic-fixtures.json': 'fixtures/synthetic-fixtures.json',
  'API_CONTRACTS.md': 'contracts/API_CONTRACTS.md',
  'SECURITY_REVIEW.md': 'contracts/SECURITY_REVIEW.md',
}))
  await put(dest, await readFile('docs/phase6/' + file));
for (const file of await readdir('docs/evidence')) {
  if (file === 'phase6-pack.json') continue; // The validation report is outside the manifest it validates.
  if (!file.match(/^phase[1-6]-.*\.(json|md|png|jpg|pdf)$/)) continue;
  const bytes = await readFile('docs/evidence/' + file);
  let content = bytes;
  if (file.endsWith('.md'))
    content = bytes
      .toString('utf8')
      .replaceAll('../SCRIPTED_INPUTS.md', '../scripted-demo/SCRIPTED_INPUTS.md');
  await put('prototype-evidence/' + file, content);
  if (/\.(png|jpg)$/.test(file)) await put('screenshots/' + file, bytes);
}
for (const file of await readdir('docs/phase6/sample-documents').catch(() => []))
  if (file.endsWith('.pdf'))
    await put('sample-documents/' + file, await readFile('docs/phase6/sample-documents/' + file));
for (const file of await readdir('docs/evidence/phase6-regression').catch(() => []))
  await put(
    'prototype-evidence/phase6-regression/' + file,
    await readFile('docs/evidence/phase6-regression/' + file),
  );
const trd = await readFile('TRD.md', 'utf8');
const start = trd.indexOf('## 15.'),
  end = trd.indexOf('\n## ', start + 1);
await put(
  'dependency-candidates/REGISTER.md',
  '# WorkBuddy dependency candidates — not installed release features\n\n' +
    trd.slice(start, end < 0 ? undefined : end),
);
await put(
  'expansion-specifications/README.md',
  '# Future expansion — NOT IMPLEMENTED\n\nFR-18–FR-27 are requirements only. Read the full PRD, TRD, flow, design and schema in ../specifications/. Implement owner customer-agent cards/history; separate scoped queries; physical stock/reconciled sales; sparse-data forecasts; bounded owner price publication; consented engagement/support; reviewed multilingual content/visuals; advisory risk review and ethical controls. No expansion screenshots, model metrics or release passes are provided. Acceptance/rebuild7A–7E is in ../specifications/IMPLEMENTATION_PLAN.md. Verify conditional Tencent models/region/credits/runtime/channels before enabling them.\n',
);
await put(
  'README.md',
  '# CustomerLane / CustomerBuddy reference pack\n\nStart with [REFERENCE_INDEX](REFERENCE_INDEX.md). This is a Codex-authored synthetic local behaviour/design reference, not a deployable source package or WorkBuddy implementation. Generate the final project independently in Tencent WorkBuddy.\n',
);
await put(
  'REFERENCE_INDEX.md',
  `# Reference index

Provenance: Codex local prototype, packaged7 October2026. All customers/payments synthetic; permanent scripted disclosure. No live AI, external sends, cloud deployment or WorkBuddy provenance is claimed. The original exclusive-tool competition rule is not established as satisfied by these external references. WorkBuddy starts a fresh workspace and authors source/migrations/tools/tests/deployment/docs/slides independently; never import or deploy this prototype.

Reading order:

1. [Product requirements](specifications/PRD.md), [rebuild brief](specifications/WORKBUDDY_REBUILD_BRIEF.md).
2. [Technical requirements](specifications/TRD.md), [flow](specifications/APP_FLOW.md), [design](specifications/DESIGN_BRIEF.md), [schema](specifications/BACKEND_SCHEMA.md).
3. [Fixture data](fixtures/synthetic-fixtures.json), [API/tool contracts](contracts/API_CONTRACTS.md), [scripted inputs](scripted-demo/SCRIPTED_INPUTS.md).
4. [Demo walkthrough](walkthrough/WALKTHROUGH.md), [runbook](walkthrough/RUNBOOK.md), [conversation cases](scenarios/scripted-cases.json), [rubric/baseline](scenarios/REVIEW_RUBRIC.md).
5. [Phase6 acceptance](prototype-evidence/phase6-review.md), [Phase5 evidence](prototype-evidence/phase5-review.md), [current progress and7A–7E tasks](specifications/IMPLEMENTATION_PLAN.md). Screenshots and sample PDFs are in screenshots/ and sample-documents/; actual cumulative acceptance evidence is in prototype-evidence/.
6. [Unbuilt expansion](expansion-specifications/README.md), [candidate register](dependency-candidates/REGISTER.md).

Limits: keyword templates only; owner technical copy English; local API uptime required for scheduler; in-app reminders only; ASCII PDF font; actual200%zoom pending by user choice; exact360px unverified because tool clamps400; client bundle warning. Prototype passes are expectations, never WorkBuddy test results. Manual effort/savings baseline remains unmeasured.

The pack contains no application source, SQL migrations, compiled builds, credentials, sessions or model weights. Synthetic fixture data may be reused as inputs. Specification links are made relative. Check manifest.json for hashes; portable link/secret checks have separate evidence. Final phase status comes from the packaged implementation plan and actual gate results, not the existence of this index.
`,
);
const manifest = [];
async function walk(dir) {
  for (const name of await readdir(dir)) {
    const file = resolve(dir, name);
    if ((await stat(file)).isDirectory()) await walk(file);
    else if (name !== 'manifest.json') {
      const bytes = await readFile(file);
      manifest.push({
        path: relative(pack, file).replaceAll('\\', '/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
}
await walk(pack);
await put(
  'manifest.json',
  JSON.stringify(
    {
      provenance:
        'Codex synthetic behaviour/design references, independent WorkBuddy rebuild required',
      files: manifest,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Reference pack prepared: ' + manifest.length + ' allowlisted artifacts; no source/build bundle.',
);
