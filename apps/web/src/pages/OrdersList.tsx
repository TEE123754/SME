import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, CalendarDays, Plus, ShoppingBag } from 'lucide-react';
import { useSession } from '../lib/session-context';
import { useData } from '../lib/hooks';
import { money } from '../lib/api';
import type { Order, Pickup } from '../lib/types';
import { PageHeading, QueryState, Status } from '../components/workflow';

export function Orders({ owner = false }: { owner?: boolean }) {
  const { t } = useSession(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState('');
  const query = useData<{ orders: Order[] }>(owner ? '/owner/orders' : '/orders'),
    members = useData<{ members: { id: string; display_name: string }[] }>('/owner/members', owner),
    pickup = useData<Pickup>('/pickup-options');
  const filter = params.get('status') ?? 'all',
    records = query.data?.orders ?? [];
  const names = new Map(members.data?.members.map((m) => [m.id, m.display_name]));
  const filtered = records.filter(
    (o) =>
      (filter === 'all' ||
        (filter === 'active'
          ? ['confirmed', 'preparing', 'ready', 'delivering'].includes(o.state)
          : o.state === filter)) &&
      `${o.display_code} ${names.get(o.customer_id) ?? ''} ${o.items.map((i) => i.label).join(' ')}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={owner ? 'Orders & appointments' : t('My orders', 'Pesanan saya')}
        description={
          owner
            ? 'Track bookings, payments and every fulfilment step.'
            : t(
                'Your bookings, payment progress and next steps.',
                'Tempahan, bayaran dan langkah seterusnya.',
              )
        }
      >
        <Link className="button button-primary" to={owner ? '/owner/calendar' : '/checkout'}>
          {owner ? <CalendarDays size={16} /> : <Plus size={16} />}{' '}
          {owner ? 'View calendar' : t('New order', 'Pesanan baharu')}
        </Link>
      </PageHeading>
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <label className="search-input">
            <Search size={17} />
            <span className="sr-only">Search orders</span>
            <input
              placeholder={owner ? 'Search order, customer or item' : 'Search order or item'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="filter-select">
            <span className="sr-only">Order status</span>
            <select
              value={filter}
              onChange={(e) => {
                const p = new URLSearchParams(params);
                if (e.target.value === 'all') p.delete('status');
                else p.set('status', e.target.value);
                setParams(p);
              }}
            >
              <option value="all">All statuses</option>
              <option value="awaiting_deposit">Awaiting deposit</option>
              <option value="active">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <span className="record-count">
            {query.data ? `${filtered.length} of ${records.length} orders` : 'Loading…'}
          </span>
        </div>
        <QueryState query={query}>
          {filtered.length ? (
            <div className="table-wrap">
              <table className="directory-table orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    {owner ? <th>Customer</th> : null}
                    <th>Schedule</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th className="numeric">Total</th>
                    <th>
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
                    const slot = pickup.data?.slots.find((s) => s.id === o.pickup_slot_id),
                      path = `${owner ? '/owner/orders' : '/account/orders'}/${o.id}`;
                    return (
                      <tr key={o.id}>
                        <td data-label="Order">
                          <Link className="order-code" to={path}>
                            {o.display_code}
                          </Link>
                          <small className="cell-detail">
                            {o.items.map((i) => `${i.quantity} × ${i.label}`).join(', ')}
                          </small>
                        </td>
                        {owner ? (
                          <td data-label="Customer">{names.get(o.customer_id) ?? 'Customer'}</td>
                        ) : null}
                        <td data-label="Schedule">
                          {new Date(`${o.pickup_date}T00:00:00Z`).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Kuala_Lumpur',
                          })}
                          <small className="cell-detail">
                            {slot
                              ? `${slot.start_local.slice(0, 5)}–${slot.end_local.slice(0, 5)}`
                              : 'Scheduled window'}{' '}
                            · MYT
                          </small>
                        </td>
                        <td data-label="Payment">
                          <span
                            className={`payment-label ${o.verified_paid_sen >= o.total_sen ? 'paid' : o.verified_paid_sen ? 'partial' : 'unpaid'}`}
                          >
                            {o.verified_paid_sen >= o.total_sen
                              ? 'Fully paid'
                              : o.verified_paid_sen
                                ? 'Deposit received'
                                : 'Payment pending'}
                          </span>
                          <small className="cell-detail">
                            {money(o.verified_paid_sen)} verified
                          </small>
                        </td>
                        <td data-label="Status">
                          <Status state={o.state} />
                        </td>
                        <td data-label="Total" className="numeric">
                          <strong>{money(o.total_sen)}</strong>
                        </td>
                        <td>
                          <Link
                            className="icon-button"
                            to={path}
                            aria-label={`Open order ${o.display_code}`}
                          >
                            <ArrowRight size={17} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <ShoppingBag size={30} />
              <h2>{records.length ? 'No matching orders' : 'No orders yet'}</h2>
              <p>
                {records.length
                  ? 'Try another search or status.'
                  : 'Customer bookings appear here after quote confirmation.'}
              </p>
              {records.length ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setSearch('');
                    setParams({});
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  className="button button-secondary"
                  to={owner ? '/owner/business' : '/checkout'}
                >
                  {owner ? 'Review your catalogue' : 'Start an order'}
                </Link>
              )}
            </div>
          )}
        </QueryState>
        <div className="directory-footer">
          {owner
            ? 'Payment verification and fulfilment actions are inside each order.'
            : 'Open an order for its documents and tracking timeline.'}
          <span>Synthetic payments only</span>
        </div>
      </section>
    </>
  );
}
