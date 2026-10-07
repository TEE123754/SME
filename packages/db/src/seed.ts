import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { policySchema } from '@customerbuddy/contracts';

export function fixtureId(label: string): string {
  const bytes = createHash('sha256').update(`customerbuddy-synthetic:${label}`).digest();
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const fixtureBusinessId = fixtureId('bakery');
const names = ['Farah', 'Jason', 'Mei', 'Amir', 'Priya', 'Nur', 'Daniel', 'Aisha', 'Hana', 'Ryan'];
export const demoCustomers = names.map((name, index) => ({
  id: fixtureId(`customer-${index + 1}`),
  name,
  code: `C-${String(index + 1).padStart(3, '0')}`,
  key: name.toLowerCase(),
  subject: `demo:customer-${index + 1}`,
  language: index === 0 ? 'bm' : 'en',
}));

export const seedPolicy = {
  leadTimeHours: 48,
  depositBasisPoints: 5000,
  quoteLifetimeMinutes: 30,
  holdLifetimeHours: 24,
  reminderDelayHours: 12,
  quietHoursStart: '09:00',
  quietHoursEnd: '20:00',
  allowedExceptionTypes: ['discount', 'custom_order', 'complaint', 'refund_request'],
};

export async function seedDemo(pool: Pool): Promise<boolean> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock(70202603)');
    if ((await c.query("SELECT 1 FROM app.seed_history WHERE version='demo-v1'")).rowCount) {
      await c.query('COMMIT');
      return false;
    }
    const b = fixtureBusinessId;
    const knowledge = fixtureId('knowledge-v1');
    policySchema.parse(seedPolicy);
    await c.query(
      `INSERT INTO app.businesses(id,slug,name) VALUES($1,'ainas-home-bakery','Aina''s Home Bakery')`,
      [b],
    );
    await c.query(
      "INSERT INTO app.memberships(business_id,auth_provider,provider_subject,role) VALUES($1,'demo','demo:owner','owner')",
      [b],
    );
    await c.query(
      `INSERT INTO app.demo_accounts(account_key,business_id,subject,role,label) VALUES('owner',$1,'demo:owner','owner','Aina · synthetic bakery owner')`,
      [b],
    );
    await c.query(
      `INSERT INTO app.knowledge_versions(id,business_id,version_number,state,policy_json,published_at,created_by)
      VALUES($1,$2,1,'published',$3,'2026-10-01T02:00:00Z','demo:owner')`,
      [knowledge, b, JSON.stringify(seedPolicy)],
    );
    await c.query('UPDATE app.businesses SET active_knowledge_version_id=$1 WHERE id=$2', [
      knowledge,
      b,
    ]);
    const facts = [
      [
        'pickup',
        'pickup',
        'Pengambilan 12–2 petang atau 4–6 petang.',
        'Pickup is 12:00–14:00 or 16:00–18:00.',
      ],
      [
        'deposit',
        'payment',
        'Deposit 50% perlu disahkan dalam 24 jam.',
        'A 50% deposit must be owner-verified within 24 hours.',
      ],
      [
        'lead_time',
        'FAQ',
        'Tempahan perlu dibuat sekurang-kurangnya 48 jam awal.',
        'Order at least 48 hours before pickup.',
      ],
      [
        'human',
        'FAQ',
        'Permintaan khas perlu disemak oleh pemilik.',
        'Custom requests need owner review.',
      ],
    ];
    for (const [key, category, bm, en] of facts)
      await c.query(
        'INSERT INTO app.knowledge_entries(id,business_id,knowledge_version_id,fact_key,category,content_bm,content_en) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [fixtureId(`fact-${key}`), b, knowledge, key, category, bm, en],
      );
    const products = [
      { sku: 'brownie-tray', label: 'Brownie tray', price: 7800, units: '24 pieces', capacity: 10 },
      { sku: 'cupcake-box', label: 'Cupcake box', price: 4800, units: '12 pieces', capacity: 8 },
    ];
    for (const p of products) {
      await c.query('INSERT INTO app.products(id,business_id,sku) VALUES($1,$2,$3)', [
        fixtureId(p.sku),
        b,
        p.sku,
      ]);
      await c.query(
        'INSERT INTO app.catalogue_items(id,business_id,knowledge_version_id,product_id,label,description,unit_price_sen,units_description) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          fixtureId(`catalogue-${p.sku}`),
          b,
          knowledge,
          fixtureId(p.sku),
          p.label,
          `Synthetic demo ${p.units}`,
          p.price,
          p.units,
        ],
      );
      for (const day of [1, 9, 10, 11, 12, 13, 14, 15, 16]) {
        const date = `2026-10-${String(day).padStart(2, '0')}`;
        await c.query(
          'INSERT INTO app.capacity_buckets(id,business_id,product_id,pickup_date,max_units,committed_units) VALUES($1,$2,$3,$4,$5,$6)',
          [
            fixtureId(`capacity-${p.sku}-${date}`),
            b,
            fixtureId(p.sku),
            date,
            p.capacity,
            day === 1 ? 1 : 0,
          ],
        );
      }
    }
    for (const [code, start, end] of [
      ['midday', '12:00', '14:00'],
      ['late', '16:00', '18:00'],
    ])
      await c.query(
        'INSERT INTO app.pickup_slots(id,business_id,code,start_local,end_local) VALUES($1,$2,$3,$4,$5)',
        [fixtureId(`slot-${code}`), b, code, start, end],
      );
    await c.query(
      "INSERT INTO app.demo_settings(business_id,base_demo_time,real_time_anchor) VALUES($1,'2026-10-07T02:00:00Z',clock_timestamp())",
      [b],
    );
    for (const [index, customer] of demoCustomers.entries()) {
      await c.query(
        "INSERT INTO app.customers(id,business_id,auth_provider,provider_subject,display_code,display_name,preferred_language) VALUES($1,$2,'demo',$3,$4,$5,$6)",
        [customer.id, b, customer.subject, customer.code, customer.name, customer.language],
      );
      await c.query(
        "INSERT INTO app.demo_accounts(account_key,business_id,customer_id,subject,role,label) VALUES($1,$2,$3,$4,'customer',$5)",
        [customer.key, b, customer.id, customer.subject, `${customer.name} · synthetic customer`],
      );
      for (const purpose of ['preference_memory', 'operational_reminders', 'marketing'])
        await c.query(
          "INSERT INTO app.consent_events(id,business_id,customer_id,purpose,granted,source,notice_version) VALUES($1,$2,$3,$4,$5,'seed','demo-notice-v1')",
          [
            fixtureId(`consent-${customer.key}-${purpose}`),
            b,
            customer.id,
            purpose,
            index < 2 && purpose !== 'marketing',
          ],
        );
      if (index >= 2) continue;
      const product = products[index];
      if (!product) throw new Error('Missing historical fixture');
      const conversation = fixtureId(`conversation-${customer.key}`);
      await c.query(
        "INSERT INTO app.conversations(id,business_id,customer_id,state,language) VALUES($1,$2,$3,'closed',$4)",
        [conversation, b, customer.id, customer.language],
      );
      await c.query(
        "INSERT INTO app.messages(id,business_id,customer_id,conversation_id,role,content,created_at) VALUES($1,$2,$3,$4,'customer',$5,'2026-09-28T02:00:00Z')",
        [
          fixtureId(`message-${customer.key}`),
          b,
          customer.id,
          conversation,
          `Synthetic prior order: ${product.label}`,
        ],
      );
      await c.query(
        'INSERT INTO app.customer_preferences(id,business_id,customer_id,key,value_json,consent_event_id) VALUES($1,$2,$3,$4,$5,$6)',
        [
          fixtureId(`preference-${customer.key}`),
          b,
          customer.id,
          'favourite_product_sku',
          JSON.stringify(product.sku),
          fixtureId(`consent-${customer.key}-preference_memory`),
        ],
      );
      const quote = fixtureId(`quote-${customer.key}`),
        order = fixtureId(`order-${customer.key}`),
        reservation = fixtureId(`reservation-${customer.key}`);
      const items = [
        {
          productId: fixtureId(product.sku),
          sku: product.sku,
          label: product.label,
          quantity: 1,
          unitPriceSen: product.price,
          lineTotalSen: product.price,
        },
      ];
      await c.query(
        `INSERT INTO app.quotes(id,business_id,customer_id,knowledge_version_id,items_json,pickup_date,pickup_slot_id,total_sen,deposit_sen,proposal_hash,expires_at,state,created_at)
        VALUES($1,$2,$3,$4,$5,'2026-10-01',$6,$7,$8,$9,'2026-09-28T02:30:00Z','accepted','2026-09-28T02:00:00Z')`,
        [
          quote,
          b,
          customer.id,
          knowledge,
          JSON.stringify(items),
          fixtureId('slot-late'),
          product.price,
          product.price / 2,
          `synthetic-prior-${customer.key}`,
        ],
      );
      await c.query(
        `INSERT INTO app.orders(id,business_id,customer_id,display_code,quote_id,knowledge_version_id,pickup_date,pickup_slot_id,total_sen,deposit_required_sen,state,created_at,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,'2026-10-01',$7,$8,$9,'completed','2026-09-28T02:00:00Z','2026-10-01T10:00:00Z')`,
        [
          order,
          b,
          customer.id,
          `DEMO-HISTORY-${customer.code}`,
          quote,
          knowledge,
          fixtureId('slot-late'),
          product.price,
          product.price / 2,
        ],
      );
      await c.query(
        'INSERT INTO app.order_items(id,business_id,customer_id,order_id,product_id,catalogue_item_id,sku_snapshot,label_snapshot,quantity,unit_price_sen,line_total_sen) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$9)',
        [
          fixtureId(`order-item-${customer.key}`),
          b,
          customer.id,
          order,
          fixtureId(product.sku),
          fixtureId(`catalogue-${product.sku}`),
          product.sku,
          product.label,
          product.price,
        ],
      );
      await c.query(
        "INSERT INTO app.reservations(id,business_id,customer_id,order_id,state,expires_at,committed_at) VALUES($1,$2,$3,$4,'committed','2026-09-29T02:00:00Z','2026-09-28T03:00:00Z')",
        [reservation, b, customer.id, order],
      );
      await c.query(
        'INSERT INTO app.reservation_items(reservation_id,business_id,customer_id,capacity_bucket_id,quantity) VALUES($1,$2,$3,$4,1)',
        [reservation, b, customer.id, fixtureId(`capacity-${product.sku}-2026-10-01`)],
      );
      await c.query(
        "INSERT INTO app.payments(id,business_id,customer_id,order_id,amount_sen,reference,verified_by,verified_at,state) VALUES($1,$2,$3,$4,$5,$6,'demo:owner','2026-09-28T03:00:00Z','verified')",
        [
          fixtureId(`payment-${customer.key}`),
          b,
          customer.id,
          order,
          product.price,
          `SYNTHETIC-HISTORY-${customer.code}`,
        ],
      );
    }
    await c.query("INSERT INTO app.seed_history(version) VALUES('demo-v1')");
    await c.query('COMMIT');
    return true;
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
