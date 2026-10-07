import { randomUUID } from 'node:crypto';
import { DataError, withScope } from '@customerbuddy/db';
import type { Pool } from '@customerbuddy/db';
import type { TrustedScope } from '@customerbuddy/contracts';
import { idem } from '../../../packages/db/src/commerce.js';
import {
  profile,
  activeCatalogue,
  recommendation,
  ownerOnly,
} from '../../../packages/db/src/operations.js';
import type { PoolClient } from '@customerbuddy/db';

type CampaignInput = {
  title: string;
  kind: string;
  content: string;
  productId?: string;
  discountPercent: number;
};
async function audience(
  c: PoolClient,
  campaign: CampaignInput | { kind: string; product_id?: string; discount_percent: number },
  lock = false,
) {
  const config = await profile(c),
    rows = (
      await c.query(
        "SELECT id,display_name FROM app.customers WHERE status='active' ORDER BY display_code",
      )
    ).rows;
  const recipients: { id: string; name: string; reason: string }[] = [],
    suppressed: { id: string; name: string; reason: string }[] = [];
  for (const u of rows) {
    if (lock) await c.query('SELECT id FROM app.customers WHERE id=$1 FOR UPDATE', [u.id]);
    const consent = (
      await c.query(
        "SELECT granted FROM app.consent_events WHERE customer_id=$1 AND purpose='marketing' ORDER BY event_sequence DESC LIMIT 1",
        [u.id],
      )
    ).rows[0]?.granted;
    const contacts = Number(
      (
        await c.query(
          "SELECT count(*) AS n FROM app.campaign_deliveries WHERE customer_id=$1 AND (created_at AT TIME ZONE 'Asia/Kuala_Lumpur')::date=(app.business_now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date",
          [u.id],
        )
      ).rows[0].n,
    );
    let reason = '';
    if (!config.ethics.marketingEnabled) reason = 'Business marketing paused';
    else if (!consent) reason = 'Marketing consent absent or withdrawn';
    else if (contacts >= config.ethics.dailyContactLimit) reason = 'Daily contact cap reached';
    else if (
      campaign.kind === 'after_sales' &&
      !(
        await c.query("SELECT 1 FROM app.orders WHERE customer_id=$1 AND state='completed'", [u.id])
      ).rowCount
    )
      reason = 'No completed order for after-sales follow-up';
    else if (
      (campaign.kind === 'recommendation' || campaign.kind === 'promotion') &&
      !config.ethics.personalisation
    )
      reason = 'Personalisation paused';
    if (reason) suppressed.push({ id: u.id, name: u.display_name, reason });
    else {
      const rec = await recommendation(c, u.id);
      recipients.push({
        id: u.id,
        name: u.display_name,
        reason:
          campaign.kind === 'recommendation' || campaign.kind === 'promotion'
            ? (rec?.reason ?? 'Published catalogue fallback')
            : 'Consent-based business update',
      });
    }
  }
  return { recipients, suppressed };
}
export function createGrowth(pool: Pool) {
  const write = <T>(
    s: TrustedScope,
    op: string,
    key: string,
    input: unknown,
    fn: (c: PoolClient) => Promise<T>,
  ) => {
    ownerOnly(s);
    return withScope(pool, s, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [s.businessId]);
      return idem(c, s, `growth:${op}`, key, input, fn.bind(null, c));
    });
  };
  return {
    list(s: TrustedScope) {
      ownerOnly(s);
      return withScope(pool, s, async (c) => ({
        campaigns: (
          await c.query(
            'SELECT m.*,(SELECT count(*)::integer FROM app.campaign_deliveries d WHERE d.campaign_id=m.id) AS delivered FROM app.marketing_campaigns m ORDER BY m.created_at DESC',
          )
        ).rows,
      }));
    },
    draft(s: TrustedScope, input: CampaignInput, key: string) {
      return write(s, 'campaign', key, input, async (c) => {
        const config = await profile(c);
        if (input.discountPercent > config.ethics.maxDiscountPercent)
          throw new DataError('PRICE_LIMIT', 409);
        if (
          input.productId &&
          !(await activeCatalogue(c)).some((i) => i.product_id === input.productId && i.available)
        )
          throw new DataError('NOT_FOUND', 404);
        const id = randomUUID();
        await c.query(
          'INSERT INTO app.marketing_campaigns(id,business_id,title,kind,content,product_id,discount_percent,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,app.business_now())',
          [
            id,
            s.businessId,
            input.title,
            input.kind,
            input.content,
            input.productId ?? null,
            input.discountPercent,
          ],
        );
        return { id };
      });
    },
    preview(s: TrustedScope, id: string) {
      ownerOnly(s);
      return withScope(pool, s, async (c) => {
        const m = (await c.query('SELECT * FROM app.marketing_campaigns WHERE id=$1', [id]))
          .rows[0];
        if (!m) throw new DataError('NOT_FOUND', 404);
        return { ...(await audience(c, m)), campaign: m };
      });
    },
    send(s: TrustedScope, id: string, key: string) {
      return write(s, 'send', key, { id }, async (c) => {
        const m = (
          await c.query('SELECT * FROM app.marketing_campaigns WHERE id=$1 FOR UPDATE', [id])
        ).rows[0];
        if (!m) throw new DataError('NOT_FOUND', 404);
        if (m.state === 'sent') throw new DataError('ALREADY_SENT', 409);
        const config = await profile(c);
        if (m.discount_percent > config.ethics.maxDiscountPercent)
          throw new DataError('PRICE_LIMIT', 409);
        const a = await audience(c, m, true);
        for (const u of a.recipients) {
          const rec = await recommendation(c, u.id),
            product = m.product_id
              ? (await activeCatalogue(c)).find((p) => p.product_id === m.product_id)
              : rec?.product;
          const text = `${u.name}, ${m.content}${(m.kind === 'recommendation' || m.kind === 'promotion') && product ? `\nSuggested: ${product.label} — ${m.product_id ? 'Owner selected catalogue item' : u.reason}.` : ''}${m.discount_percent ? `\nPromotion proposal: ${m.discount_percent}% — request an owner-reviewed offer at checkout. No automatic discount applied.` : ''}\nDemo assistant — scripted responses. Manage marketing consent in Preferences.`;
          await c.query(
            'INSERT INTO app.campaign_deliveries(id,business_id,customer_id,campaign_id,content,reason,created_at) VALUES($1,$2,$3,$4,$5,$6,app.business_now())',
            [randomUUID(), s.businessId, u.id, id, text, u.reason],
          );
        }
        await c.query("UPDATE app.marketing_campaigns SET state='sent' WHERE id=$1", [id]);
        return {
          delivered: a.recipients.length,
          suppressed: a.suppressed.length,
          channel: 'Local customer inbox only',
        };
      });
    },
    inbox(s: TrustedScope) {
      if (s.role !== 'customer') throw new DataError('CUSTOMER_ONLY', 403);
      return withScope(pool, s, async (c) => ({
        messages: (
          await c.query(
            'SELECT id,content,reason,created_at,read_at FROM app.campaign_deliveries ORDER BY created_at DESC',
          )
        ).rows,
      }));
    },
    content(s: TrustedScope) {
      ownerOnly(s);
      return withScope(pool, s, async (c) => ({
        drafts: (await c.query('SELECT * FROM app.content_drafts ORDER BY created_at DESC')).rows,
      }));
    },
    generate(
      s: TrustedScope,
      input: { productId: string; channel: string; language: string; tone: string },
      key: string,
    ) {
      return write(s, 'template_content', key, input, async (c) => {
        const p = (await activeCatalogue(c)).find((p) => p.product_id === input.productId);
        if (!p) throw new DataError('NOT_FOUND', 404);
        const b = await profile(c),
          amount = `RM ${(p.unit_price_sen / 100).toFixed(2)}`;
        const messages: Record<string, { title: string; body: string; cta: string }> = {
          en: {
            title: `${p.label} | ${b.name}`,
            body: `Discover ${p.label} at ${b.name}. ${p.description} ${p.units_description}. Published price: ${amount}.`,
            cta: 'Explore the catalogue and review an exact quote before booking.',
          },
          bm: {
            title: `${p.label} | ${b.name}`,
            body: `Temui ${p.label} di ${b.name}. ${p.description} ${p.units_description}. Harga diterbitkan: ${amount}.`,
            cta: 'Lihat katalog dan semak sebut harga tepat sebelum membuat tempahan.',
          },
          zh: {
            title: `${p.label} | ${b.name}`,
            body: `欢迎了解 ${b.name} 的 ${p.label}。${p.description} ${p.units_description}。公布价格：${amount}。`,
            cta: '浏览商品目录，预订前请确认报价。',
          },
        };
        const m = messages[input.language]!,
          body =
            input.channel === 'email'
              ? `${input.language === 'bm' ? 'Hai' : input.language === 'zh' ? '您好' : 'Hello'} {{customer_name}},\n\n${m.body}\n\n${m.cta}\n\n${b.name}\nManage optional marketing consent in Preferences.`
              : input.channel === 'social'
                ? `${m.body}\n${m.cta}\n#${b.name.replace(/[^\p{L}\p{N}]/gu, '')} #SmallBusiness`
                : input.channel === 'pr'
                  ? `${b.name} shares its current ${p.label} offering.\n${m.body}\n${m.cta}`
                  : `${input.tone === 'professional' ? ({ en: 'Product information', bm: 'Maklumat produk', zh: '产品信息' }[input.language] ?? 'Product information') + ':\n' : ''}${m.body}\n${m.cta}`;
        const id = randomUUID(),
          visual = {
            headline: p.label,
            subheading: b.name,
            price: amount,
            accent: '#28604d',
            layout: 'product-card',
          };
        await c.query(
          'INSERT INTO app.content_drafts(id,business_id,product_id,channel,language,title,body,visual_json,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,app.business_now())',
          [id, s.businessId, p.product_id, input.channel, input.language, m.title, body, visual],
        );
        return {
          id,
          title: m.title,
          body,
          visual,
          mode: 'scripted_template',
          notice:
            'Template simulation; catalogue descriptions are preserved, not automatically translated. Owner review required.',
        };
      });
    },
    editContent(
      s: TrustedScope,
      id: string,
      input: { title: string; body: string; headline: string; accent: string; state: string },
      key: string,
    ) {
      return write(s, 'edit_content', key, { id, ...input }, async (c) => {
        const r = await c.query(
          "UPDATE app.content_drafts SET title=$2,body=$3,visual_json=jsonb_set(jsonb_set(visual_json,'{headline}',$4::jsonb),'{accent}',$5::jsonb),state=$6 WHERE id=$1 RETURNING id",
          [
            id,
            input.title,
            input.body,
            JSON.stringify(input.headline),
            JSON.stringify(input.accent),
            input.state,
          ],
        );
        if (!r.rows[0]) throw new DataError('NOT_FOUND', 404);
        return { id };
      });
    },
  };
}
