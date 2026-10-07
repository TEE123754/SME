import { SetupChecklist } from './Onboarding';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ShoppingBag,
  Wallet,
  CircleAlert,
  Bot,
  Clock3,
  Package,
} from 'lucide-react';
import { useData } from '../lib/hooks';
import { money, instant } from '../lib/api';
import type { Order, Dashboard, Approval, Pickup } from '../lib/types';
import type { AgentCard } from '../lib/operations-types';
import { PageHeading, QueryState, Status } from '../components/workflow';

const stages = [
  { label: 'Awaiting deposit', states: ['awaiting_deposit'], color: '#e9a64b' },
  { label: 'Preparing', states: ['confirmed', 'preparing'], color: '#6868d8' },
  { label: 'Ready', states: ['ready'], color: '#70a7de' },
  { label: 'Delivering', states: ['delivering'], color: '#48a5ac' },
  { label: 'Completed', states: ['completed'], color: '#5d9477' },
  { label: 'Cancelled', states: ['cancelled'], color: '#b6bcc8' },
];
function Pipeline({ orders }: { orders: Order[] }) {
  const counts = stages.map((s) => ({
    ...s,
    count: orders.filter((o) => s.states.includes(o.state)).length,
  }));
  return (
    <div className="pipeline-content">
      <div className="pipeline-ring">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={`Fulfilment stages for ${orders.length} saved orders. Counts listed alongside.`}
        >
          <circle cx="60" cy="60" r="45" fill="none" stroke="#edf0f5" strokeWidth="12" />
          {counts.map((s, index) => {
            const portion = orders.length ? (s.count / orders.length) * 100 : 0;
            const start = orders.length
              ? (counts.slice(0, index).reduce((sum, stage) => sum + stage.count, 0) /
                  orders.length) *
                100
              : 0;
            return portion ? (
              <circle
                key={s.label}
                cx="60"
                cy="60"
                r="45"
                pathLength="100"
                fill="none"
                stroke={s.color}
                strokeWidth="12"
                strokeDasharray={`${Math.max(0, portion - 1)} ${100 - Math.max(0, portion - 1)}`}
                strokeDashoffset={-start}
                transform="rotate(-90 60 60)"
              />
            ) : null;
          })}
        </svg>
        <div>
          <strong>{orders.length}</strong>
          <span>saved orders</span>
        </div>
      </div>
      <ul className="pipeline-legend">
        {counts.map((s) => (
          <li key={s.label}>
            <span>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
            <strong>{s.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OwnerOverview() {
  const dashboard = useData<Dashboard>('/owner/dashboard'),
    reviews = useData<{ approvals: Approval[] }>('/owner/approvals'),
    orders = useData<{ orders: Order[] }>('/owner/orders'),
    agents = useData<{ agents: AgentCard[] }>('/owner/agents'),
    pickup = useData<Pickup>('/pickup-options');
  const records = orders.data?.orders ?? [],
    pending = reviews.data?.approvals.filter((a) => a.effective_state === 'pending') ?? [];
  const names = new Map(agents.data?.agents.map((a) => [a.id, a.display_name]));
  const businessDate = dashboard.data
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(dashboard.data.demoTime))
    : '';
  const upcoming = records
    .filter((o) => !['cancelled', 'completed'].includes(o.state) && o.pickup_date >= businessDate)
    .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
    .slice(0, 3);
  const booked = records
    .filter((o) => o.state !== 'cancelled')
    .reduce((sum, o) => sum + o.total_sen, 0);
  return (
    <>
      <SetupChecklist />
      <PageHeading
        title="Business overview"
        description="Your priorities, customers and upcoming work at a glance."
      >
        <Link className="button button-secondary" to="/owner/calendar">
          <CalendarDays size={16} /> View calendar
        </Link>
      </PageHeading>
      <QueryState query={dashboard}>
        {dashboard.data ? (
          <>
            <div className="overview-stats">
              <Link to="/owner/orders" className="stat-card">
                <span className="stat-label">
                  Active orders <ShoppingBag size={18} />
                </span>
                <strong>
                  {orders.data
                    ? records.filter((o) => !['cancelled', 'completed'].includes(o.state)).length
                    : '—'}
                </strong>
                <small>
                  {dashboard.data.awaiting_deposit} awaiting deposit <ArrowRight size={14} />
                </small>
              </Link>
              <Link to="/owner/sales" className="stat-card">
                <span className="stat-label">
                  Booked value <Package size={18} />
                </span>
                <strong>{orders.data ? money(booked) : '—'}</strong>
                <small>
                  Non-cancelled orders <ArrowRight size={14} />
                </small>
              </Link>
              <Link to="/owner/sales" className="stat-card">
                <span className="stat-label">
                  Verified payments <Wallet size={18} />
                </span>
                <strong>{money(dashboard.data.verifiedSyntheticPaymentSen)}</strong>
                <small>
                  Synthetic payments collected <ArrowRight size={14} />
                </small>
              </Link>
              <Link to="/owner/reviews" className="stat-card">
                <span className="stat-label">
                  Human reviews <CircleAlert size={18} />
                </span>
                <strong>{dashboard.data.pendingApprovals}</strong>
                <small>
                  Waiting for your decision <ArrowRight size={14} />
                </small>
              </Link>
            </div>
            <div className="business-clock">
              <Clock3 size={14} />
              <span>Business time: {instant(dashboard.data.demoTime)}</span>
              <Link to="/owner/automation">
                Demo clock controls <ArrowRight size={13} />
              </Link>
            </div>
          </>
        ) : null}
      </QueryState>
      <div className="overview-grid">
        <section className="panel overview-panel">
          <div className="section-heading">
            <div>
              <h2>Upcoming orders</h2>
              <p>Next scheduled fulfilments</p>
            </div>
            <Link className="inline-link" to="/owner/orders">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <QueryState query={orders}>
            {upcoming.length ? (
              <div className="upcoming-list">
                {upcoming.map((o) => {
                  const s = pickup.data?.slots.find((p) => p.id === o.pickup_slot_id);
                  return (
                    <Link key={o.id} to={`/owner/orders/${o.id}`} className="upcoming-row">
                      <div className="schedule-date">
                        <strong>{o.pickup_date.slice(8)}</strong>
                        <span>
                          {new Date(`${o.pickup_date}T00:00:00Z`).toLocaleDateString('en-GB', {
                            month: 'short',
                            timeZone: 'Asia/Kuala_Lumpur',
                          })}
                        </span>
                      </div>
                      <div className="upcoming-info">
                        <strong>{names.get(o.customer_id) ?? o.display_code}</strong>
                        <span>{o.items.map((i) => `${i.quantity} × ${i.label}`).join(', ')}</span>
                        <small>
                          {s
                            ? `${s.start_local.slice(0, 5)}–${s.end_local.slice(0, 5)}`
                            : 'Scheduled window'}{' '}
                          · {o.display_code}
                        </small>
                      </div>
                      <div className="upcoming-status">
                        <Status state={o.state} />
                        <strong>{money(o.total_sen)}</strong>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <CalendarDays size={30} />
                <h3>No upcoming orders</h3>
                <p>Confirmed customer bookings will appear here.</p>
              </div>
            )}
          </QueryState>
        </section>
        <section className="panel overview-panel">
          <div className="section-heading">
            <div>
              <h2>Order activity</h2>
              <p>All saved orders by fulfilment stage</p>
            </div>
          </div>
          <QueryState query={orders}>
            <Pipeline orders={records} />
          </QueryState>
          <Link className="subtle-action" to="/owner/sales">
            See sales & invoices <ArrowRight size={15} />
          </Link>
        </section>
        <section className="panel overview-panel">
          <div className="section-heading">
            <div>
              <h2>Needs your attention</h2>
              <p>Resolve a request or check a payment</p>
            </div>
            <Link className="inline-link" to="/owner/reviews">
              Reviews <ArrowRight size={14} />
            </Link>
          </div>
          <QueryState query={reviews}>
            {pending.slice(0, 3).map((a) => (
              <Link key={a.id} to="/owner/reviews" className="attention-row">
                <span className="attention-icon">
                  <CircleAlert size={18} />
                </span>
                <div>
                  <strong>
                    {names.get(a.customer_id) ?? 'Customer'} · {a.kind.replaceAll('_', ' ')}
                  </strong>
                  <span>
                    {a.proposal_json.note?.slice(0, 90) ??
                      'A saved request is waiting for your decision.'}
                  </span>
                </div>
                <ChevronForward />
              </Link>
            ))}
            {!pending.length ? (
              <p className="empty-copy">You're all caught up on customer reviews.</p>
            ) : null}
          </QueryState>
          {dashboard.data?.awaiting_deposit ? (
            <Link className="attention-row" to="/owner/orders?status=awaiting_deposit">
              <span className="attention-icon neutral">
                <Wallet size={18} />
              </span>
              <div>
                <strong>{dashboard.data.awaiting_deposit} orders awaiting deposit</strong>
                <span>Check the saved order and payment deadline.</span>
              </div>
              <ChevronForward />
            </Link>
          ) : null}
        </section>
        <section className="assistant-prompt">
          <span className="assistant-prompt-icon">
            <Bot size={24} />
          </span>
          <div>
            <p className="eyebrow">A clearer view of your business</p>
            <h2>
              A question?
              <br />
              Start with your buddy.
            </h2>
            <p>
              Ask about sales, stock or customers.
              <br />
              Replies use your saved business records.
            </p>
            <Link className="button button-primary" to="/owner/assistant">
              Ask your assistant <ArrowRight size={16} />
            </Link>
          </div>
          <small>
            {agents.data
              ? `${agents.data.agents.length} customer buddies · one for every member`
              : 'One dedicated buddy for every customer'}
          </small>
        </section>
      </div>
    </>
  );
}
function ChevronForward() {
  return <ArrowRight size={16} aria-hidden="true" />;
}
