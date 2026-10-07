import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Bot, CircleAlert, MessageSquare, X } from 'lucide-react';
import { useData, useAction } from '../lib/hooks';
import type { AgentCard } from '../lib/operations-types';
import { PageHeading, QueryState, Feedback } from '../components/workflow';
import { Button } from '../components/ui/button';
import { money, instant } from '../lib/api';
import { ConversationReview } from './Owner';
import { containDialogFocus } from '../components/dialog-focus';

const active = (a: AgentCard) => a.conversation?.state === 'active' && !a.conversation.takeover;
const review = (a: AgentCard) =>
  a.reviews > 0 || a.conversation?.state === 'waiting_owner' || a.conversation?.takeover;
export function Agents() {
  const [params, setParams] = useSearchParams();
  const drawer = useRef<HTMLDialogElement>(null);
  const q = useData<{ agents: AgentCard[] }>('/owner/agents'),
    [filter, setFilter] = useState(params.get('filter') ?? 'all'),
    [search, setSearch] = useState('');
  const selected = params.get('customer');
  function selectCustomer(id: string | null) {
    const p = new URLSearchParams(params);
    if (id) p.set('customer', id);
    else p.delete('customer');
    setParams(p, { replace: true });
  }
  const agents = q.data?.agents ?? [],
    shown = agents
      .filter(
        (a) =>
          (filter === 'all' ||
            (filter === 'active' ? active(a) : filter === 'review' ? review(a) : !active(a))) &&
          `${a.display_name} ${a.display_code}`.toLowerCase().includes(search.toLowerCase()),
      )
      .sort(
        (a, b) =>
          Number(!!review(b)) - Number(!!review(a)) ||
          Number(!!active(b)) - Number(!!active(a)) ||
          a.display_name.localeCompare(b.display_name),
      );
  const chosen = agents.find((a) => a.id === selected);
  useEffect(() => {
    if (chosen && !drawer.current?.open) drawer.current?.showModal();
  }, [chosen]);
  return (
    <>
      <PageHeading
        title="Customer agents"
        description="One customer. One dedicated buddy. See every saved interaction and step in when it matters."
      >
        <Link className="button button-secondary" to="/owner/assistant">
          <Bot size={16} /> Ask your business assistant
        </Link>
      </PageHeading>
      <div className="metric-grid agent-metrics">
        {[
          ['Customer agents', agents.length],
          ['Active', agents.filter(active).length],
          ['Need human review', agents.filter(review).length],
          ['Inactive', agents.filter((a) => !active(a)).length],
        ].map(([label, n]) => (
          <article className="panel metric" key={label}>
            <p>{label}</p>
            <strong>{q.data ? n : '—'}</strong>
          </article>
        ))}
      </div>
      <div className="board-toolbar">
        <div className="segmented" aria-label="Filter agents">
          {['all', 'active', 'inactive', 'review'].map((f) => (
            <button
              aria-pressed={f === filter}
              className={filter === f ? 'selected' : ''}
              key={f}
              onClick={() => setFilter(f)}
            >
              {f === 'review' ? 'Needs review' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={18} />
          <span className="sr-only">Search customer agents</span>
          <input
            placeholder="Search name or member ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Button variant="secondary" onClick={() => q.refetch()}>
          Refresh activity
        </Button>
      </div>
      <QueryState query={q}>
        <div className="agent-board">
          {shown.map((a, index) => (
            <article
              key={a.id}
              className={`agent-card ${review(a) ? 'agent-review' : ''} ${selected === a.id ? 'agent-selected' : ''}`}
            >
              <div className="agent-top">
                <div className={`agent-avatar avatar-${index % 4}`}>
                  <span>{a.display_name.slice(0, 2).toUpperCase()}</span>
                  <i className={active(a) ? 'online' : 'offline'} />
                </div>
                <span className={`status-badge ${active(a) ? 'status-active' : 'status-closed'}`}>
                  {active(a) ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h2>{a.display_name}'s buddy</h2>
              <p className="muted">
                {a.display_code} · {a.preferred_language.toUpperCase()} · scripted demo
              </p>
              {review(a) ? (
                <p className="review-flag">
                  <CircleAlert size={15} /> Human review · {a.reviews} pending case
                  {a.reviews === 1 ? '' : 's'}
                </p>
              ) : (
                <p className="agent-quiet">
                  <Bot size={15} />{' '}
                  {a.conversation ? 'Following customer activity' : 'Ready for first conversation'}
                </p>
              )}
              <div className="agent-transcript">
                <small>
                  {a.latest ? `${a.latest.role} · ${instant(a.latest.at)}` : 'No interaction yet'}
                </small>
                <p>
                  {a.latest?.content ??
                    'This buddy will show the customer’s saved enquiries, replies and follow-ups here.'}
                </p>
                {a.run ? (
                  <small>
                    Last script: {a.run.intent ?? 'unmatched'} · {a.run.state}
                  </small>
                ) : null}
              </div>
              <div className="agent-stats">
                <div>
                  <strong>{a.interactions}</strong>
                  <small>Messages</small>
                </div>
                <div>
                  <strong>{a.orders}</strong>
                  <small>Orders</small>
                </div>
                <div>
                  <strong>{money(a.paid_sen)}</strong>
                  <small>Synthetic paid</small>
                </div>
              </div>
              <div className="action-row">
                <Button
                  id={`agent-open-${a.id}`}
                  variant="secondary"
                  onClick={() => selectCustomer(a.id)}
                >
                  <MessageSquare size={15} /> Open interaction
                </Button>
              </div>
            </article>
          ))}
        </div>
        {shown.length === 0 ? (
          <section className="panel">No agents match this filter.</section>
        ) : null}
      </QueryState>
      <dialog
        ref={drawer}
        className="interaction-drawer"
        onKeyDown={containDialogFocus}
        aria-labelledby="interaction-title"
        onClose={() => {
          if (selected)
            document.getElementById(`agent-open-${selected}`)?.focus({ preventScroll: true });
          selectCustomer(null);
        }}
      >
        <div className="dialog-heading">
          <div>
            <small>Customer interaction</small>
            <h2 id="interaction-title">{chosen?.display_name ?? 'Saved interaction'}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close interaction"
            onClick={() => drawer.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {chosen ? (
          <div className="interaction-body">
            {chosen.conversation ? (
              <ConversationReview
                key={chosen.conversation.id}
                conversation={{
                  id: chosen.conversation.id,
                  customer_id: chosen.id,
                  state: chosen.conversation.state,
                  human_takeover: chosen.conversation.takeover,
                  language: chosen.preferred_language === 'bm' ? 'bm' : 'en',
                  created_at: chosen.latest?.at ?? new Date().toISOString(),
                }}
              />
            ) : (
              <p className="panel">
                No saved conversation. The customer starts one from Customer chat.
              </p>
            )}
            <Link className="text-link" to="/owner/reviews">
              Open approval cases →
            </Link>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
export function OwnerAssistant() {
  const action = useAction(),
    [text, setText] = useState(''),
    [thread, setThread] = useState<{ role: string; text: string }[]>([]);
  async function ask(query: string) {
    const r = await action.run<{ reply: string; intent: string }>('/owner/query', { text: query });
    if (r) {
      setThread((t) => [
        ...t,
        { role: 'Owner', text: query },
        { role: 'Demo assistant — scripted responses', text: r.reply },
      ]);
      setText('');
    }
  }
  return (
    <>
      <PageHeading
        title="Business assistant"
        description="Read your saved sales, stock, customer and calendar records through supported demo queries."
      />
      <section className="panel narrow">
        <p className="notice">
          Rule-based intent matching. Complex wording can miss a script. Every response reads
          current records; requests here do not approve or change business data.
        </p>
        <div className="action-row">
          {[
            'How are sales and invoices?',
            'Forecast stock demand',
            'Which agents need review?',
            'Show appointments calendar',
          ].map((t) => (
            <Button key={t} variant="secondary" disabled={action.pending} onClick={() => ask(t)}>
              {t}
            </Button>
          ))}
        </div>
        <div className="message-list">
          {thread.map((m, i) => (
            <article className="message" key={i}>
              <strong>{m.role}</strong>
              <p>{m.text}</p>
            </article>
          ))}
        </div>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(text);
          }}
        >
          <label>
            Ask about your business
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              maxLength={4000}
            />
          </label>
          <Button disabled={action.pending || !text.trim()}>Ask assistant</Button>
        </form>
        <Feedback action={action} />
      </section>
    </>
  );
}
export function EthicsControls() {
  const q = useData<import('../lib/operations-types').BusinessProfile>('/business-profile');
  return (
    <>
      <PageHeading
        title="Trust and ethical controls"
        description="Make customer choice visible and keep money, pricing and human decisions deterministic."
      />
      <QueryState query={q}>
        {q.data ? (
          <EthicsEditor key={JSON.stringify(q.data.ethics)} ethics={q.data.ethics} />
        ) : null}
      </QueryState>
    </>
  );
}
function EthicsEditor({ ethics }: { ethics: import('../lib/operations-types').Ethics }) {
  const [values, setValues] = useState(ethics),
    action = useAction();
  return (
    <div className="two-columns">
      <section className="panel">
        <h2>Customer protection settings</h2>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await action.run('/owner/ethics', values))
              action.setNotice('Ethical controls saved. Campaign delivery rechecks them.');
          }}
        >
          <label className="check-label">
            <input
              type="checkbox"
              checked={values.personalisation}
              onChange={(e) => setValues({ ...values, personalisation: e.target.checked })}
            />{' '}
            Allow consent-based personalisation
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={values.marketingEnabled}
              onChange={(e) => setValues({ ...values, marketingEnabled: e.target.checked })}
            />{' '}
            Allow approved marketing delivery
          </label>
          {(
            [
              ['dailyContactLimit', 'Daily marketing contact limit', 3],
              ['maxDiscountPercent', 'Maximum price reduction (%)', 30],
              ['maxIncreasePercent', 'Maximum price increase (%)', 20],
            ] as const
          ).map(([key, label, max]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={0}
                max={max}
                required
                value={values[key]}
                onChange={(e) => setValues({ ...values, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          <Button disabled={action.pending}>Save safeguards</Button>
        </form>
        <Feedback action={action} />
      </section>
      <section className="panel">
        <h2>How this demo earns trust</h2>
        <div className="trust-list">
          <article>
            <h3>Limited data and bias</h3>
            <p>
              Forecasts show sparse-data confidence. Recommendations explain saved favourites or a
              catalogue fallback. No sensitive traits determine ranking or prices.
            </p>
          </article>
          <article>
            <h3>Privacy and consent</h3>
            <p>
              No cross-platform tracking. Optional preference memory and marketing are controlled by
              customers in Preferences. Withdrawal is checked before each delivery.
            </p>
          </article>
          <article>
            <h3>Healthy engagement</h3>
            <p>
              Contact caps and marketing pause apply at send time. No invented scarcity, countdowns
              or automatic personalised price discrimination.
            </p>
          </article>
          <article>
            <h3>Transparency and human control</h3>
            <p>
              Every assistant is labelled “Demo assistant — scripted responses”. Owner approvals
              remain explicit. Risk flags are review signals, never accusations or proof of fraud.
            </p>
          </article>
        </div>
        <Link className="text-link" to="/owner/risks">
          Review transaction risks →
        </Link>
      </section>
    </div>
  );
}
