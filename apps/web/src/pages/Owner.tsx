import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { policySchema, publishRequestSchema } from '@customerbuddy/contracts';
import type { Product, Approval, Conversation, Message, Capacity, Dashboard } from '../lib/types';
import { money, instant } from '../lib/api';
import { PageHeading, QueryState, Status, Feedback } from '../components/workflow';
import { Button } from '../components/ui/button';
import { useData, useAction } from '../lib/hooks';

export { OwnerOverview } from './Overview';
export function OwnerReviews() {
  const query = useData<{ approvals: Approval[] }>('/owner/approvals');
  return (
    <>
      <PageHeading
        title="Owner reviews"
        description="Review the exact proposal, its policy version and expiry. Commercial decisions stay with you."
      />
      <QueryState query={query}>
        {query.data?.approvals.length ? (
          <div className="review-list">
            {query.data.approvals.map((a) => (
              <ReviewCard key={a.id} approval={a} />
            ))}
          </div>
        ) : (
          <section className="panel">
            No reviews yet. Customer exception requests will appear here.
          </section>
        )}
      </QueryState>
    </>
  );
}
function ReviewCard({ approval: a }: { approval: Approval }) {
  const [note, setNote] = useState(''),
    action = useAction();
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{a.kind.replaceAll('_', ' ')}</h2>
        <Status state={a.effective_state} />
      </div>
      <p>
        Customer {a.customer_id.slice(0, 8)} · proposal v{a.version} · expires{' '}
        {instant(a.expires_at)}
      </p>
      <p className="fine-print">
        Policy {a.policy_version_id.slice(0, 8)} · exact proposal {a.proposal_hash.slice(0, 12)}
      </p>
      {a.proposal_json.note ? <blockquote>{a.proposal_json.note}</blockquote> : null}
      {a.proposal_json.offer ? (
        <>
          <p>
            {a.proposal_json.offer.items.map((i) => `${i.quantity} × ${i.label}`).join(' · ')} ·{' '}
            {a.proposal_json.offer.pickupDate}
          </p>
          <p>
            Proposed total <strong>{money(a.proposal_json.offer.totalSen)}</strong> · deposit{' '}
            {money(a.proposal_json.offer.depositSen)}
          </p>
          <p className="muted">Approval issues a new quote. The customer must still confirm it.</p>
        </>
      ) : null}
      {a.proposal_json.paidSen !== undefined ? (
        <p>
          Verified synthetic payment: {money(a.proposal_json.paidSen)}. Approval rechecks fresh
          capacity.
        </p>
      ) : null}
      {a.order_id ? (
        <Link className="text-link" to={`/owner/orders/${a.order_id}`}>
          Open related order →
        </Link>
      ) : null}
      {a.conversation_id ? (
        <Link className="text-link" to={`/owner/customers?conversation=${a.conversation_id}`}>
          Open related conversation →
        </Link>
      ) : null}
      {a.effective_state === 'pending' ? (
        <form className="form-stack spaced" onSubmit={(e) => e.preventDefault()}>
          <label>
            Review decision note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              maxLength={500}
            />
          </label>
          <div className="action-row">
            {(['approve', 'reject'] as const).map((decision) => (
              <Button
                key={decision}
                variant={decision === 'approve' ? 'primary' : 'secondary'}
                disabled={action.pending || !note.trim()}
                onClick={async () => {
                  if (
                    await action.run(`/owner/approvals/${a.id}/decision`, {
                      decision,
                      proposalHash: a.proposal_hash,
                      version: a.version,
                      note: note.trim(),
                    })
                  )
                    action.setNotice(
                      decision === 'approve' ? 'Exact proposal approved.' : 'Proposal rejected.',
                    );
                }}
              >
                {decision === 'approve' ? 'Approve exact proposal' : 'Reject proposal'}
              </Button>
            ))}
          </div>
          <p className="fine-print">
            Changing this proposal needs a new customer request and fresh review. Complex
            complaints, custom orders and refund cases remain human cases; approval does not issue a
            refund or change paid snapshots.
          </p>
        </form>
      ) : (
        <p>{a.decision_note ?? 'This review is no longer actionable.'}</p>
      )}
      <Feedback action={action} />
    </section>
  );
}
type Customer = {
  id: string;
  display_name: string;
  display_code: string;
  preferred_language: string;
};
export function OwnerCustomers() {
  const customers = useData<{ customers: Customer[] }>('/owner/customers'),
    conversations = useData<{ conversations: Conversation[] }>('/conversations');
  const [selected, setSelected] = useState<string | null>(() =>
    new URLSearchParams(location.search).get('conversation'),
  );
  const active = conversations.data?.conversations.find((c) => c.id === selected);
  return (
    <>
      <PageHeading
        title="Customers and conversations"
        description="Synthetic customer context and explicit human takeover controls."
      />
      <QueryState query={customers}>
        <div className="customer-list">
          {customers.data?.customers.map((c) => (
            <article className="panel" key={c.id}>
              <h2>{c.display_name}</h2>
              <p>
                {c.display_code} · {c.preferred_language === 'bm' ? 'Bahasa Melayu' : 'English'}
              </p>
              {conversations.data?.conversations
                .filter((v) => v.customer_id === c.id)
                .map((v) => (
                  <Button key={v.id} variant="secondary" onClick={() => setSelected(v.id)}>
                    {instant(v.created_at)} · {v.state.replaceAll('_', ' ')}
                  </Button>
                ))}
            </article>
          ))}
        </div>
      </QueryState>
      <QueryState query={conversations}>
        {active ? (
          <ConversationReview key={active.id} conversation={active} />
        ) : (
          <p className="muted">Choose a customer's saved conversation to review messages.</p>
        )}
      </QueryState>
    </>
  );
}
export function ConversationReview({ conversation: c }: { conversation: Conversation }) {
  const messages = useData<{ messages: Message[] }>(`/conversations/${c.id}/messages`),
    action = useAction(),
    [reply, setReply] = useState('');
  return (
    <section className="panel spaced">
      <div className="section-heading">
        <h2>Conversation review</h2>
        <Status state={c.state} />
      </div>
      <p>{c.human_takeover ? 'Human takeover is active.' : 'Customer conversation is active.'}</p>
      <div className="message-list">
        <QueryState query={messages}>
          {messages.data?.messages.length ? (
            messages.data.messages.map((m) => (
              <article className={`message message-${m.role}`} key={m.id}>
                <strong>{m.role}</strong>
                <p>{m.content}</p>
                <small>{instant(m.created_at)}</small>
              </article>
            ))
          ) : (
            <p>No messages yet.</p>
          )}
        </QueryState>
      </div>
      <div className="action-row">
        <Button
          disabled={action.pending || c.human_takeover || c.state === 'closed'}
          onClick={async () => {
            if (await action.run(`/owner/conversations/${c.id}/takeover`, { takeover: true }))
              action.setNotice('Human takeover is active.');
          }}
        >
          Take over conversation
        </Button>
        <Button
          variant="secondary"
          disabled={action.pending || !c.human_takeover || c.state === 'closed'}
          onClick={async () => {
            if (await action.run(`/owner/conversations/${c.id}/takeover`, { takeover: false }))
              action.setNotice('Conversation explicitly resumed.');
          }}
        >
          Resume conversation
        </Button>
      </div>
      <form
        className="form-stack spaced"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await action.run(`/conversations/${c.id}/messages`, { content: reply.trim() })) {
            setReply('');
            action.setNotice('Owner reply saved.');
          }
        }}
      >
        <label>
          Owner reply
          <textarea
            required
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={4000}
          />
        </label>
        <Button disabled={action.pending || c.state === 'closed'}>Save owner reply</Button>
      </form>
      <Feedback action={action} />
    </section>
  );
}
type Knowledge = {
  policy: { id: string; version_number: number; policy_json: z.infer<typeof policySchema> };
  entries: { fact_key: string; content_en: string; content_bm: string }[];
};
export function OwnerKnowledge() {
  const knowledge = useData<Knowledge>('/knowledge'),
    catalogue = useData<{ items: Product[] }>('/catalogue');
  return (
    <>
      <PageHeading
        title="Knowledge and catalogue"
        description="Preview a new version before publishing. Existing orders keep their original prices."
      />
      <QueryState query={knowledge}>
        <QueryState query={catalogue}>
          {knowledge.data && catalogue.data ? (
            <KnowledgeEditor
              key={knowledge.data.policy.id}
              knowledge={knowledge.data}
              products={catalogue.data.items}
            />
          ) : null}
        </QueryState>
      </QueryState>
    </>
  );
}
function KnowledgeEditor({ knowledge, products }: { knowledge: Knowledge; products: Product[] }) {
  const action = useAction(),
    [preview, setPreview] = useState<z.infer<typeof publishRequestSchema> | null>(null);
  const form = useForm<z.infer<typeof publishRequestSchema>>({
    resolver: zodResolver(publishRequestSchema),
    defaultValues: {
      expectedKnowledgeVersionId: knowledge.policy.id,
      policy: knowledge.policy.policy_json,
      catalogue: products.map((p) => ({
        sku: p.sku,
        label: p.label,
        description: p.description,
        unitPriceSen: p.unit_price_sen,
        unitsDescription: p.units_description,
        available: true,
      })),
    },
  });
  return (
    <div className="two-columns">
      <section className="panel">
        <h2>Published version {knowledge.policy.version_number}</h2>
        <form className="form-stack" onSubmit={form.handleSubmit((v) => setPreview(v))}>
          {products.map((p, index) => (
            <fieldset key={p.sku}>
              <legend>{p.sku}</legend>
              <label>
                Product name
                <input {...form.register(`catalogue.${index}.label`)} required maxLength={100} />
              </label>
              <label>
                Price (sen)
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  {...form.register(`catalogue.${index}.unitPriceSen`, { valueAsNumber: true })}
                />
              </label>
              <label>
                Description
                <textarea {...form.register(`catalogue.${index}.description`)} maxLength={500} />
              </label>
              <label>
                Units description
                <input {...form.register(`catalogue.${index}.unitsDescription`)} required />
              </label>
            </fieldset>
          ))}
          <label>
            Lead time (hours)
            <input
              type="number"
              min={1}
              {...form.register('policy.leadTimeHours', { valueAsNumber: true })}
            />
          </label>
          <label>
            Deposit (basis points; 5000 = 50%)
            <input
              type="number"
              min={0}
              max={10000}
              {...form.register('policy.depositBasisPoints', { valueAsNumber: true })}
            />
          </label>
          <label>
            Quote lifetime (minutes)
            <input
              type="number"
              min={1}
              {...form.register('policy.quoteLifetimeMinutes', { valueAsNumber: true })}
            />
          </label>
          <label>
            Unpaid hold (hours)
            <input
              type="number"
              min={1}
              {...form.register('policy.holdLifetimeHours', { valueAsNumber: true })}
            />
          </label>
          {Object.keys(form.formState.errors).length ? (
            <p className="error-banner" role="alert">
              Review the required catalogue and policy values.
            </p>
          ) : null}
          <Button variant="secondary" disabled={action.pending}>
            Preview new version
          </Button>
        </form>
      </section>
      <section className="panel">
        <h2>Preview before publishing</h2>
        {preview ? (
          <>
            <p>
              New prices and policy apply to future quotes. Existing active quotes require a fresh
              quote after publication.
            </p>
            {preview.catalogue.map((p) => (
              <p key={p.sku}>
                {p.label}: <strong>{money(p.unitPriceSen)}</strong>
              </p>
            ))}
            <p>
              {preview.policy.leadTimeHours} hours lead time · deposit{' '}
              {preview.policy.depositBasisPoints / 100}%
            </p>
            <Button
              disabled={action.pending}
              onClick={async () => {
                if (await action.run('/owner/knowledge/publish', preview))
                  action.setNotice('New knowledge version published.');
              }}
            >
              Publish previewed version
            </Button>
          </>
        ) : (
          <p>Edit values and preview the exact version before publishing.</p>
        )}
        <h3 className="spaced">Published business facts</h3>
        {knowledge.entries.map((e) => (
          <details key={e.fact_key}>
            <summary>{e.fact_key.replaceAll('_', ' ')}</summary>
            <p>{e.content_en}</p>
            <p>{e.content_bm}</p>
          </details>
        ))}
        <p className="fine-print">
          Fact entries are preserved when publishing. Edit business facts and add new items in
          Business & catalogue.
        </p>
        <Feedback action={action} />
      </section>
    </div>
  );
}
export function OwnerCapacity() {
  const [date, setDate] = useState('2026-10-10'),
    query = useData<{ capacity: Capacity[] }>(`/capacity?date=${date}`),
    catalogue = useData<{ items: Product[] }>('/catalogue');
  return (
    <>
      <PageHeading
        title="Order & booking capacity"
        description="Held and committed units are authoritative saved allocations. Maximums cannot drop below booked units."
      />
      <label className="date-filter">
        Fulfilment date
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <QueryState query={query}>
        <QueryState query={catalogue}>
          <div className="field-grid">
            {catalogue.data?.items.map((p) => (
              <CapacityEditor
                key={`${date}:${p.sku}:${query.data?.capacity.find((c) => c.sku === p.sku)?.version ?? 0}`}
                product={p}
                date={date}
                capacity={query.data?.capacity.find((c) => c.sku === p.sku)}
              />
            ))}
          </div>
        </QueryState>
      </QueryState>
    </>
  );
}
function CapacityEditor({
  product,
  date,
  capacity: c,
}: {
  product: Product;
  date: string;
  capacity?: Capacity;
}) {
  const [max, setMax] = useState(c?.max_units ?? 10),
    action = useAction();
  return (
    <section className="panel">
      <h2>{product.label}</h2>
      <dl className="money-summary">
        <div>
          <dt>Held</dt>
          <dd>{c?.held_units ?? 0}</dd>
        </div>
        <div>
          <dt>Committed</dt>
          <dd>{c?.committed_units ?? 0}</dd>
        </div>
        <div>
          <dt>Available</dt>
          <dd>{c?.available_units ?? 0}</dd>
        </div>
      </dl>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await action.run('/owner/capacity', {
              productId: product.product_id,
              pickupDate: date,
              maxUnits: max,
              version: c?.version ?? 0,
            })
          )
            action.setNotice('Capacity saved.');
        }}
      >
        <label>
          Maximum units
          <input
            type="number"
            required
            min={(c?.held_units ?? 0) + (c?.committed_units ?? 0)}
            max={10000}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </label>
        <Button disabled={action.pending}>Save capacity</Button>
      </form>
      <Feedback action={action} />
    </section>
  );
}
export function OwnerEvidence({ automation = false }: { automation?: boolean }) {
  const dashboard = useData<Dashboard>('/owner/dashboard'),
    orders = useData<{ orders: import('../lib/types').Order[] }>('/owner/orders'),
    reviews = useData<{ approvals: Approval[] }>('/owner/approvals');
  return (
    <>
      <PageHeading
        title={automation ? 'Local automation' : 'Demo evidence'}
        description="Synthetic records only. Counts and payment totals come from the database."
      />
      <QueryState query={dashboard}>
        {dashboard.data ? (
          <section className="panel">
            <dl className="money-summary">
              <div>
                <dt>Business time</dt>
                <dd>{instant(dashboard.data.demoTime)}</dd>
              </div>
              <div>
                <dt>Saved orders</dt>
                <dd>{dashboard.data.orders}</dd>
              </div>
              <div>
                <dt>Verified synthetic payments</dt>
                <dd>{money(dashboard.data.verifiedSyntheticPaymentSen)}</dd>
              </div>
              <div>
                <dt>Pending owner reviews</dt>
                <dd>{dashboard.data.pendingApprovals}</dd>
              </div>
            </dl>
            <p className="notice">
              Scripted responses and local leased jobs are active. Inspect Local automation for
              actual job states, clock controls and saved digests; files are available only after
              generation.
            </p>
            <div className="action-row">
              <Link className="button button-secondary" to="/owner/orders">
                Inspect payment records
              </Link>
              <Link className="button button-secondary" to="/owner/reviews">
                Inspect review records
              </Link>
            </div>
          </section>
        ) : null}
      </QueryState>
      {!automation ? (
        <section className="panel spaced">
          <h2>Record reconciliation</h2>
          <QueryState query={orders}>
            {orders.data ? (
              <p>
                {orders.data.orders.length} displayed orders · verified paid from those records:{' '}
                <strong>
                  {money(orders.data.orders.reduce((sum, o) => sum + o.verified_paid_sen, 0))}
                </strong>{' '}
                (latest 100 records).
              </p>
            ) : null}
          </QueryState>
          <QueryState query={reviews}>
            {reviews.data ? (
              <p>
                {reviews.data.approvals.length} displayed review records (latest 100). Full business
                counts appear above.
              </p>
            ) : null}
          </QueryState>
          <p>
            Assistant mode: scripted reference. Model/token metrics: not applicable. WorkBuddy and
            managed AI remain a separate future rebuild.
          </p>
        </section>
      ) : null}
    </>
  );
}
