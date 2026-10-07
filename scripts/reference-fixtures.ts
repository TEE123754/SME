import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  demoCustomers,
  fixtureBusinessId,
  createDatabasePool,
  withScope,
} from '../packages/db/src/index.js';
import { seedPolicy } from '../packages/db/src/seed.js';
import { readConfig } from '../apps/api/src/config.js';
const config = readConfig(),
  out = resolve('docs/phase6');
await mkdir(resolve(out, 'sample-documents'), { recursive: true });
await writeFile(
  resolve(out, 'synthetic-fixtures.json'),
  JSON.stringify(
    {
      provenance:
        'synthetic seed inputs, not production customer data; acceptance exports fresh seeded rows separately',
      business: { id: fixtureBusinessId, slug: 'ainas-home-bakery', name: "Aina's Home Bakery" },
      customers: demoCustomers,
      seedPolicy,
      products: [
        { sku: 'brownie-tray', unitPriceSen: 7800, units: '24 pieces', dateCapacity: 10 },
        { sku: 'cupcake-box', unitPriceSen: 4800, units: '12 pieces', dateCapacity: 8 },
      ],
      clock: { paused: true, instant: '2026-10-07T02:00:00Z' },
      consents: 'First2 customers memory/reminders true; all marketing false; remaining8 false',
      historicalOrders: [
        { customer: 'Farah', totalSen: 7800, verifiedPaidSen: 7800, state: 'completed' },
        { customer: 'Jason', totalSen: 4800, verifiedPaidSen: 4800, state: 'completed' },
      ],
      canonicalExpected: {
        totalSen: 7800,
        depositSen: 3900,
        verifiedPaidSen: 3900,
        balanceSen: 3900,
        heldBeforePayment: 1,
        committedAfterPayment: 1,
      },
    },
    null,
    2,
  ) + '\n',
);
const pool = createDatabasePool(config.DATABASE_URL);
try {
  const documents = await withScope(
    pool,
    { businessId: fixtureBusinessId, role: 'owner', subject: 'demo:owner' },
    async (c) =>
      (
        await c.query(
          "SELECT DISTINCT ON (kind) kind,storage_key FROM app.documents WHERE state='available' ORDER BY kind,created_at DESC",
        )
      ).rows,
  );
  for (const d of documents)
    await copyFile(
      resolve(config.documentPath, d.storage_key),
      resolve(out, 'sample-documents', d.kind + '.pdf'),
    );
  console.log(
    'Synthetic fixture inputs and available private sample PDFs prepared; no application test run.',
  );
} finally {
  await pool.end();
}
