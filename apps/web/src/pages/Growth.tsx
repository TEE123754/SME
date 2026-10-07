import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, useAction } from '../lib/hooks';
import { PageHeading, QueryState, Feedback, Status } from '../components/workflow';
import { Button } from '../components/ui/button';
import { instant } from '../lib/api';
import type { Product, Order } from '../lib/types';
import type { Campaign, Draft } from '../lib/operations-types';

export function Campaigns() {
  const q = useData<{ campaigns: Campaign[] }>('/owner/campaigns'),
    products = useData<{ items: Product[] }>('/catalogue'),
    action = useAction();
  const [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [kind, setKind] = useState('announcement'),
    [productId, setProductId] = useState(''),
    [discount, setDiscount] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const preview = useData<{
    recipients: { id: string; name: string; reason: string }[];
    suppressed: { id: string; name: string; reason: string }[];
    campaign: Campaign;
  }>(`/owner/campaigns/${selected}/preview`, !!selected);
  return (
    <>
      <PageHeading
        title="Customer engagement"
        description="Announce updates, recommend products, propose promotions and follow up after sales — with customer consent."
      />
      <div className="two-columns">
        <section className="panel">
          <h2>Create a campaign</h2>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await action.run<{ id: string }>('/owner/campaigns', {
                title,
                kind,
                content,
                ...(productId ? { productId } : {}),
                discountPercent: discount,
              });
              if (r) {
                setSelected(r.id);
                action.setNotice('Draft saved. Review the audience before sending.');
              }
            }}
          >
            <label>
              Campaign title
              <input
                required
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Purpose
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setDiscount(0);
                }}
              >
                <option value="announcement">General announcement / new availability</option>
                <option value="recommendation">Personalised recommendation</option>
                <option value="promotion">Personalised promotion proposal</option>
                <option value="after_sales">After-sales follow-up</option>
              </select>
            </label>
            <label>
              Product or service
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Catalogue fallback / saved favourite</option>
                {products.data?.items.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Message
              <textarea
                required
                maxLength={2000}
                placeholder="A new batch / collection / appointment window is available…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </label>
            {kind === 'promotion' ? (
              <label>
                Proposed discount (%)
                <input
                  type="number"
                  min={0}
                  max={30}
                  required
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </label>
            ) : null}
            <Button disabled={action.pending}>Save draft and preview audience</Button>
          </form>
          <Feedback action={action} />
        </section>
        <section className="panel">
          <h2>Audience preview</h2>
          {selected ? (
            <QueryState query={preview}>
              {preview.data ? (
                <>
                  <h3>{preview.data.campaign.title}</h3>
                  <p>
                    {preview.data.recipients.length} eligible · {preview.data.suppressed.length}{' '}
                    suppressed
                  </p>
                  <div className="audience-list">
                    {preview.data.recipients.map((r) => (
                      <p key={r.id}>
                        <strong>{r.name}</strong> · {r.reason}
                      </p>
                    ))}
                    {preview.data.suppressed.map((r) => (
                      <p className="muted" key={r.id}>
                        {r.name} · {r.reason}
                      </p>
                    ))}
                  </div>
                  <p className="notice">
                    Delivery rechecks consent, business pause and contact caps. Messages appear in
                    the customer's local inbox; no email or social message is sent.
                  </p>
                  <Button
                    disabled={
                      action.pending ||
                      preview.data.campaign.state === 'sent' ||
                      !preview.data.recipients.length
                    }
                    onClick={async () => {
                      const r = await action.run<{ delivered: number; suppressed: number }>(
                        `/owner/campaigns/${selected}/send`,
                        {},
                      );
                      if (r)
                        action.setNotice(
                          `${r.delivered} local messages delivered; ${r.suppressed} suppressed.`,
                        );
                    }}
                  >
                    Approve and deliver locally
                  </Button>
                </>
              ) : null}
            </QueryState>
          ) : (
            <p>Create or select a draft to inspect recipients and suppression reasons.</p>
          )}
        </section>
      </div>
      <section className="panel spaced">
        <h2>Saved campaigns</h2>
        <QueryState query={q}>
          {q.data?.campaigns.map((c) => (
            <div className="record-row" key={c.id}>
              <div>
                <strong>{c.title}</strong>
                <p>
                  {c.kind.replaceAll('_', ' ')} · {c.delivered} delivered
                </p>
                <Status state={c.state} />
              </div>
              <Button variant="secondary" onClick={() => setSelected(c.id)}>
                View audience
              </Button>
            </div>
          ))}
        </QueryState>
      </section>
    </>
  );
}
function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export function ContentStudio() {
  const q = useData<{ drafts: Draft[] }>('/owner/content'),
    products = useData<{ items: Product[] }>('/catalogue'),
    action = useAction(),
    [productId, setProductId] = useState(''),
    [channel, setChannel] = useState('seo'),
    [language, setLanguage] = useState('en'),
    [tone, setTone] = useState('friendly'),
    [selected, setSelected] = useState<string | null>(null);
  const draft = q.data?.drafts.find((d) => d.id === selected);
  return (
    <>
      <PageHeading
        title="Content and visual studio"
        description="Create editable product descriptions, marketing copy, personalised email templates, social posts and press copy."
      />
      <p className="notice">
        Demo content generator — scripted templates. English, Bahasa Melayu and Chinese framing is
        supported; existing product names/descriptions are preserved for human translation review.
        Visuals use editable SVG layouts. No live generative model is connected.
      </p>
      <div className="two-columns">
        <section className="panel">
          <h2>Create a draft</h2>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await action.run<{ id: string }>('/owner/content', {
                productId: productId || products.data?.items[0]?.product_id,
                channel,
                language,
                tone,
              });
              if (r) {
                setSelected(r.id);
                action.setNotice('Template draft created. Edit and approve before exporting.');
              }
            }}
          >
            <label>
              Product / service
              <select
                value={productId || products.data?.items[0]?.product_id || ''}
                required
                onChange={(e) => setProductId(e.target.value)}
              >
                {products.data?.items.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Content type
              <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="seo">SEO-friendly product description</option>
                <option value="marketing">Marketing copy</option>
                <option value="email">Personalised email template</option>
                <option value="social">Social media post</option>
                <option value="pr">Press / PR copy</option>
              </select>
            </label>
            <label>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="bm">Bahasa Melayu</option>
                <option value="zh">中文 / Chinese</option>
              </select>
            </label>
            <label>
              Tone
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
              </select>
            </label>
            <Button disabled={action.pending || !products.data?.items.length}>
              Create template draft
            </Button>
          </form>
          <Feedback action={action} />
          <h3 className="spaced">Saved drafts</h3>
          <QueryState query={q}>
            {q.data?.drafts.map((d) => (
              <div className="record-row" key={d.id}>
                <div>
                  <strong>{d.title}</strong>
                  <p>
                    {d.channel} · {d.language.toUpperCase()} · {d.state}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setSelected(d.id)}>
                  Edit
                </Button>
              </div>
            ))}
          </QueryState>
        </section>
        {draft ? (
          <DraftEditor key={`${draft.id}:${draft.state}:${draft.body}`} draft={draft} />
        ) : (
          <section className="panel">
            <h2>Copy and visual preview</h2>
            <p>
              Choose a saved draft or create one to begin. Templates stay inside this workspace
              until you export them.
            </p>
            <div className="visual-placeholder">Your next story starts here.</div>
          </section>
        )}
      </div>
    </>
  );
}
function DraftEditor({ draft: d }: { draft: Draft }) {
  const [title, setTitle] = useState(d.title),
    [body, setBody] = useState(d.body),
    [headline, setHeadline] = useState(d.visual_json.headline),
    [accent, setAccent] = useState(d.visual_json.accent),
    action = useAction();
  const unchanged =
    title === d.title &&
    body === d.body &&
    headline === d.visual_json.headline &&
    accent === d.visual_json.accent;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#f7f4ef"/><circle cx="920" cy="180" r="320" fill="${accent}" opacity=".12"/><rect x="80" y="80" width="920" height="920" rx="48" fill="white"/><text x="135" y="200" fill="${accent}" font-size="36" font-family="sans-serif">${xml(d.visual_json.subheading.slice(0, 40))}</text><text x="135" y="465" fill="#242d28" font-size="55" font-family="sans-serif">${xml(headline.slice(0, 28))}</text><text x="135" y="620" fill="${accent}" font-size="76" font-family="sans-serif">${xml(d.visual_json.price)}</text><rect x="135" y="735" width="810" height="110" rx="24" fill="${accent}"/><text x="180" y="805" fill="white" font-size="38" font-family="sans-serif">Explore. Choose. Confirm.</text><text x="135" y="945" fill="#56635c" font-size="24" font-family="sans-serif">Synthetic demo · editable visual template</text></svg>`;
  return (
    <section className="panel">
      <h2>Edit, review and export</h2>
      <form className="form-stack" onSubmit={(e) => e.preventDefault()}>
        <label>
          Title / SEO heading
          <input
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Copy
          <textarea
            rows={9}
            required
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <p className="fine-print">
          Email token {'{{customer_name}}'} is an editable placeholder. No emails are sent. Verify
          claims and translations before publishing.
        </p>
        <label>
          Visual headline (preview shows first 28 characters)
          <input
            required
            maxLength={100}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </label>
        <label>
          Brand accent
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </label>
        <div className="visual-preview">
          <svg viewBox="0 0 600 430" role="img" aria-label={`Marketing card for ${headline}`}>
            <rect width="600" height="430" rx="22" fill="#f7f4ef" />
            <circle cx="570" cy="15" r="190" fill={accent} opacity=".12" />
            <text x="35" y="70" fill={accent} fontSize="18">
              {d.visual_json.subheading.slice(0, 35)}
            </text>
            <text x="35" y="170" fill="#242d28" fontSize="28">
              {headline.slice(0, 28)}
            </text>
            <text x="35" y="250" fill={accent} fontSize="44">
              {d.visual_json.price}
            </text>
            <rect x="35" y="295" width="530" height="65" rx="14" fill={accent} />
            <text x="60" y="335" fill="white" fontSize="20">
              Explore. Choose. Confirm.
            </text>
            <text x="35" y="402" fill="#56635c" fontSize="12">
              Synthetic demo · editable visual template
            </text>
          </svg>
        </div>
        <div className="action-row">
          {['draft', 'approved'].map((state) => (
            <Button
              key={state}
              variant={state === 'approved' ? 'primary' : 'secondary'}
              disabled={action.pending || !body.trim() || !title.trim() || !headline.trim()}
              onClick={async () => {
                if (
                  await action.run(`/owner/content/${d.id}`, {
                    title,
                    body,
                    headline,
                    accent,
                    state,
                  })
                )
                  action.setNotice(
                    state === 'approved'
                      ? 'Copy and visual approved. Export is available.'
                      : 'Draft saved.',
                  );
              }}
            >
              {state === 'approved' ? 'Approve copy and visual' : 'Save draft'}
            </Button>
          ))}
        </div>
        <div className="action-row">
          <Button
            variant="secondary"
            disabled={d.state !== 'approved' || !unchanged}
            onClick={() =>
              download(
                `customerbuddy-${d.id}.md`,
                `# ${title}\n\n${body}\n\nDemo template; human reviewed.\n`,
                'text/markdown;charset=utf-8',
              )
            }
          >
            Export copy
          </Button>
          <Button
            variant="secondary"
            disabled={d.state !== 'approved' || !unchanged}
            onClick={() =>
              download(`customerbuddy-${d.id}.svg`, svg, 'image/svg+xml;charset=utf-8')
            }
          >
            Export visual SVG
          </Button>
        </div>
        <Feedback action={action} />
      </form>
    </section>
  );
}
type RiskCase = {
  id: string;
  display_code: string;
  reference: string;
  amount_sen: number;
  reasons: string[];
  state: string;
  decision_note: string | null;
};
export function RiskReview() {
  const q = useData<{ cases: RiskCase[] }>('/owner/risks'),
    orders = useData<{ orders: Order[] }>('/owner/orders'),
    action = useAction(),
    [orderId, setOrderId] = useState(''),
    [amount, setAmount] = useState(1000),
    [reference, setReference] = useState('SYNTHETIC-DEMO-CHECK'),
    [result, setResult] = useState<{ risk: string; reasons: string[] } | null>(null);
  return (
    <>
      <PageHeading
        title="Transaction risk review"
        description="Flag suspicious demo payment patterns, review reasons, and block payment verification when a case remains open."
      />
      <p className="notice">
        Rule screening is a fraud-detection simulation. It cannot authenticate bank transfers or
        guarantee scam prevention. Duplicate references and overpayments are blocked by business
        services; high-value payments require review.
      </p>
      <section className="panel">
        <h2>Screen a proposed payment</h2>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await action.run<{ risk: string; reasons: string[] }>('/owner/risks/screen', {
              orderId: orderId || orders.data?.orders[0]?.id,
              amountSen: amount,
              reference,
            });
            if (r) setResult(r);
          }}
        >
          <div className="field-grid">
            <label>
              Order
              <select
                required
                value={orderId || orders.data?.orders[0]?.id || ''}
                onChange={(e) => setOrderId(e.target.value)}
              >
                {orders.data?.orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.display_code} · {o.state}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount (sen)
              <input
                type="number"
                min={1}
                max={10000000}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
            <label>
              Payment reference
              <input
                required
                maxLength={100}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          </div>
          <Button disabled={action.pending || !orders.data?.orders.length}>
            Screen transaction
          </Button>
        </form>
        {result ? (
          <p className="notice">
            Risk: {result.risk} ·{' '}
            {result.reasons.join('; ') ||
              'No configured rules triggered. Owner verification is still required.'}
          </p>
        ) : null}
        <Feedback action={action} />
      </section>
      <QueryState query={q}>
        <div className="field-grid spaced">
          {q.data?.cases.map((c) => (
            <RiskCard key={`${c.id}:${c.state}`} record={c} />
          ))}
        </div>
      </QueryState>
    </>
  );
}
function RiskCard({ record: c }: { record: RiskCase }) {
  const action = useAction(),
    [note, setNote] = useState('');
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{c.display_code}</h2>
        <Status state={c.state} />
      </div>
      <p>
        {c.reference} · {(c.amount_sen / 100).toFixed(2)} MYR
      </p>
      {c.reasons.map((r) => (
        <p key={r}>• {r}</p>
      ))}
      <form className="form-stack" onSubmit={(e) => e.preventDefault()}>
        <label>
          Owner review note
          <textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="action-row">
          {['cleared', 'blocked'].map((state) => (
            <Button
              key={state}
              variant={state === 'cleared' ? 'primary' : 'secondary'}
              disabled={action.pending || !note.trim()}
              onClick={async () => {
                if (await action.run(`/owner/risks/${c.id}`, { state, note }))
                  action.setNotice(`Case ${state}. Financial constraints still apply.`);
              }}
            >
              {state === 'cleared' ? 'Clear after review' : 'Block payment'}
            </Button>
          ))}
        </div>
      </form>
      <p>{c.decision_note}</p>
      <Feedback action={action} />
    </section>
  );
}
export function CustomerInbox() {
  const q = useData<{
      messages: { id: string; content: string; reason: string; created_at: string }[];
    }>('/me/inbox'),
    recommendation = useData<{ product: Product; reason: string } | null>('/me/recommendation');
  return (
    <>
      <PageHeading
        title="Your updates and recommendations"
        description="Consent-based announcements and follow-ups from your business. All assistant suggestions are scripted demo responses."
      />
      <QueryState query={recommendation}>
        {recommendation.data ? (
          <section className="panel">
            <h2>You may like {recommendation.data.product.label}</h2>
            <p>{recommendation.data.reason}</p>
            <Link className="button button-primary" to="/checkout">
              Review at checkout
            </Link>
          </section>
        ) : null}
      </QueryState>
      <QueryState query={q}>
        {q.data?.messages.length ? (
          q.data.messages.map((m) => (
            <article className="panel spaced" key={m.id}>
              <small>{instant(m.created_at)}</small>
              <p className="pre-wrap">{m.content}</p>
              <Link className="text-link" to="/account/preferences">
                Manage preferences and marketing consent →
              </Link>
            </article>
          ))
        ) : (
          <p className="panel spaced">
            No campaign messages delivered to your account yet. Marketing is optional.
          </p>
        )}
      </QueryState>
    </>
  );
}
