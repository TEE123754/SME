import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData, useAction } from '../lib/hooks';
import { PageHeading, QueryState, Feedback, Status } from '../components/workflow';
import { Button } from '../components/ui/button';
import { instant, money } from '../lib/api';
import type { Order } from '../lib/types';

type Event = {
  id: string;
  title: string;
  event_date: string;
  start_local: string;
  kind: string;
  note: string;
  done: boolean;
};
type Booking = {
  id: string;
  display_code: string;
  pickup_date: string;
  state: string;
  total_sen: number;
  display_name: string;
  start_local: string;
  end_local: string;
};
export function CalendarPage() {
  const [month, setMonth] = useState('2026-10'),
    [selected, setSelected] = useState('2026-10-10'),
    [title, setTitle] = useState(''),
    [time, setTime] = useState('09:00'),
    [kind, setKind] = useState('task'),
    [note, setNote] = useState(''),
    action = useAction();
  const q = useData<{ events: Event[]; orders: Booking[] }>(
      `/owner/calendar?month=${month}`,
      /^\d{4}-\d{2}$/.test(month),
    ),
    [year, mm] = month.split('-').map(Number),
    first = new Date(Date.UTC(year ?? 2026, (mm ?? 10) - 1, 1)),
    days = new Date(Date.UTC(year ?? 2026, mm ?? 10, 0)).getUTCDate(),
    offset = (first.getUTCDay() + 6) % 7;
  const selectedOrders = q.data?.orders.filter((o) => o.pickup_date === selected) ?? [],
    selectedEvents = q.data?.events.filter((o) => o.event_date === selected) ?? [];
  return (
    <>
      <PageHeading
        title="Calendar overview"
        description="A shared overview of orders, appointments, campaigns and business tasks. Times are Asia/Kuala_Lumpur."
      />
      <label className="date-filter">
        Month
        <input
          type="month"
          required
          value={month}
          onChange={(e) => {
            if (e.target.value) {
              setMonth(e.target.value);
              setSelected(`${e.target.value}-01`);
            }
          }}
        />
      </label>
      <QueryState query={q}>
        <section className="panel">
          <div className="calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <strong className="calendar-weekday" key={d}>
                {d}
              </strong>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, '0')}`,
                bookings = q.data?.orders.filter((o) => o.pickup_date === date) ?? [],
                events = q.data?.events.filter((o) => o.event_date === date) ?? [];
              return (
                <button
                  key={date}
                  aria-label={`${date}: ${bookings.length} orders, ${events.length} tasks`}
                  aria-pressed={date === selected}
                  className={`calendar-day ${date === selected ? 'selected' : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <strong>{i + 1}</strong>
                  {bookings.length ? (
                    <small className="calendar-booking">
                      {bookings.length} order{bookings.length === 1 ? '' : 's'}
                    </small>
                  ) : null}
                  {events.length ? (
                    <small>
                      {events.length} task{events.length === 1 ? '' : 's'}
                    </small>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      </QueryState>
      <div className="two-columns spaced">
        <section className="panel">
          <h2>{selected} · agenda</h2>
          {selectedOrders.map((o) => (
            <article className="record-row" key={o.id}>
              <div>
                <Link className="text-link" to={`/owner/orders/${o.id}`}>
                  {o.display_code} · {o.display_name}
                </Link>
                <p>
                  {o.start_local.slice(0, 5)}–{o.end_local.slice(0, 5)} · {money(o.total_sen)}
                </p>
                <Status state={o.state} />
              </div>
            </article>
          ))}
          {selectedEvents.map((e) => (
            <article className="record-row" key={e.id}>
              <div>
                <strong>
                  {e.start_local.slice(0, 5)} · {e.title}
                </strong>
                <p>
                  {e.kind} · {e.note} · {e.done ? 'Done' : 'Pending'}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={action.pending}
                onClick={() => action.run(`/owner/calendar/${e.id}`, { done: !e.done })}
              >
                {e.done ? 'Reopen' : 'Mark done'}
              </Button>
            </article>
          ))}
          {!selectedOrders.length && !selectedEvents.length ? (
            <p>No scheduled records for this day.</p>
          ) : null}
        </section>
        <section className="panel">
          <h2>Add a calendar task</h2>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action.run('/owner/calendar', { title, date: selected, time, kind, note })
              ) {
                setTitle('');
                setNote('');
                action.setNotice(
                  'Calendar task saved. Tasks do not reserve appointment capacity. Use checkout for a customer booking.',
                );
              }
            }}
          >
            <label>
              Date
              <input
                type="date"
                required
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  if (e.target.value) setMonth(e.target.value.slice(0, 7));
                }}
              />
            </label>
            <label>
              Time
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <label>
              Title
              <input
                required
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="task">Business task</option>
                <option value="campaign">Campaign reminder</option>
                <option value="appointment">Internal appointment reminder</option>
              </select>
            </label>
            <label>
              Notes
              <textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <Button disabled={action.pending}>Save calendar task</Button>
          </form>
          <Feedback action={action} />
        </section>
      </div>
    </>
  );
}
export function OrderTracking({ order, owner = false }: { order: Order; owner?: boolean }) {
  const q = useData<{ events: { state: string; created_at: string }[] }>(
      `/orders/${order.id}/tracking`,
    ),
    action = useAction();
  const steps = ['awaiting_deposit', 'confirmed', 'preparing', 'ready', 'delivering', 'completed'],
    labels: Record<string, string> = {
      awaiting_deposit: 'Payment pending',
      confirmed: 'Successful · booking confirmed',
      preparing: 'Order preparing',
      ready: 'Ready for collection / dispatch',
      delivering: 'Delivering',
      completed: 'Delivered / service completed',
      cancelled: 'Cancelled',
    };
  const index = steps.indexOf(order.state),
    next =
      order.state === 'confirmed'
        ? 'preparing'
        : order.state === 'preparing'
          ? 'ready'
          : order.state === 'ready'
            ? 'delivering'
            : order.state === 'delivering'
              ? 'completed'
              : null;
  return (
    <section className="panel spaced">
      <div className="section-heading">
        <h2>Order tracking</h2>
        <Status state={order.state} />
      </div>
      <p>
        Payment:{' '}
        {order.verified_paid_sen === 0
          ? 'Pending'
          : order.verified_paid_sen < order.total_sen
            ? 'Deposit received — balance pending'
            : 'Successful — fully paid'}
        . Fulfilment progresses separately.
      </p>
      <ol className="tracking-steps">
        {steps.map((s, i) => (
          <li key={s} className={i <= index ? 'reached' : ''}>
            <span>{i < index ? '✓' : i + 1}</span>
            <strong>{labels[s]}</strong>
          </li>
        ))}
      </ol>
      {order.state === 'cancelled' ? (
        <p className="notice">Cancelled. Payment history remains preserved for owner review.</p>
      ) : null}
      <QueryState query={q}>
        {q.data?.events.length ? (
          <details>
            <summary>Saved tracking timeline</summary>
            {q.data.events.map((e, i) => (
              <p key={i}>
                {instant(e.created_at)} · {labels[e.state] ?? e.state}
              </p>
            ))}
          </details>
        ) : (
          <p className="fine-print">
            This order predates detailed tracking. Its current saved status is shown above; future
            transitions will be recorded.
          </p>
        )}
      </QueryState>
      {owner && next ? (
        <div className="action-row spaced">
          <Button
            disabled={action.pending || order.exception_paused}
            onClick={async () => {
              if (
                await action.run(`/owner/orders/${order.id}/status`, {
                  state: next,
                  version: order.version,
                  note: `Owner moved order to ${next}`,
                })
              )
                action.setNotice('Tracking updated from the saved order.');
            }}
          >
            Move to {labels[next]}
          </Button>
          {order.state === 'ready' ? (
            <Button
              variant="secondary"
              disabled={action.pending || order.exception_paused}
              onClick={() =>
                action.run(`/owner/orders/${order.id}/status`, {
                  state: 'completed',
                  version: order.version,
                  note: 'Collected / service completed by customer',
                })
              }
            >
              Complete collection / appointment
            </Button>
          ) : null}
        </div>
      ) : null}
      <Feedback action={action} />
    </section>
  );
}
