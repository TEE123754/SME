import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData, useAction } from '../lib/hooks';
import { PageHeading, QueryState, Feedback } from '../components/workflow';
import { Button } from '../components/ui/button';
import { money, instant } from '../lib/api';
import type { Product, Pickup, Quote, Capacity } from '../lib/types';
import type { BusinessProfile } from '../lib/operations-types';
import { ReceiptText, Check } from 'lucide-react';
import { useSession } from '../lib/session-context';
import { useCart } from '../lib/cart';

export function Checkout() {
  const { me } = useSession(),
    basket = useCart(me!.business.id, me!.profile?.id),
    cart = basket.items;
  const quotePanel = useRef<HTMLElement>(null);
  const catalogue = useData<{ items: Product[] }>('/catalogue'),
    pickup = useData<Pickup>('/pickup-options'),
    profile = useData<BusinessProfile>('/business-profile'),
    clock = useData<{ demoTime: string }>('/business-time');
  const [sku, setSku] = useState(''),
    [quantity, setQuantity] = useState(1),
    [date, setDate] = useState('2026-10-10'),
    [slot, setSlot] = useState('midday'),
    [quote, setQuote] = useState<Quote | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [quotedBasket, setQuotedBasket] = useState(''),
    action = useAction(),
    navigate = useNavigate();
  const capacity = useData<{ capacity: Capacity[] }>(
    `/capacity?date=${date}`,
    /^\d{4}-\d{2}-\d{2}$/.test(date),
  );
  const expired =
    !!quote && !!clock.data && new Date(quote.expiresAt) <= new Date(clock.data.demoTime);
  const basketChanged = !!quote && quotedBasket !== basket.snapshot;
  const products = catalogue.data?.items ?? [];
  const quotedSlot = pickup.data?.slots.find((s) => s.id === quote?.pickupSlotId);
  useEffect(() => {
    if (quote?.id) {
      quotePanel.current?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 1050px)').matches)
        quotePanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [quote?.id]);
  const updateCart = (items: { sku: string; quantity: number }[]) => {
    basket.set(items);
    setQuote(null);
    setConfirmed(false);
  };
  return (
    <>
      <PageHeading
        title={profile.data?.fulfilment === 'appointment' ? 'Book an appointment' : 'Checkout'}
        description="Choose your items and schedule. Review the exact price before confirming."
      />
      <ol className="checkout-progress">
        <li className="reached" aria-current={!quote ? 'step' : undefined}>
          1 · Basket & schedule
        </li>
        <li
          className={quote ? 'reached' : ''}
          aria-current={quote && !confirmed ? 'step' : undefined}
        >
          2 · Review quote
        </li>
        <li className={confirmed ? 'reached' : ''} aria-current={confirmed ? 'step' : undefined}>
          3 · Confirm booking
        </li>
      </ol>
      <div className="two-columns checkout-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>Your basket</h2>
            <span className="record-count">
              {cart.reduce((sum, p) => sum + p.quantity, 0)} items
            </span>
          </div>
          <Link className="text-link" to={`/b/${me!.business.slug}`}>
            ← Keep shopping
          </Link>
          <p className="fine-print spaced">
            Member discounts apply to eligible new quotes.{' '}
            <Link to="/account/membership">Manage membership</Link>
          </p>
          <QueryState query={catalogue}>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const chosen = sku || products[0]?.sku;
                if (!chosen) return;
                const existing = cart.find((p) => p.sku === chosen);
                if (existing) {
                  if (existing.quantity + quantity > 100) return;
                  updateCart(
                    cart.map((p) =>
                      p.sku === chosen ? { ...p, quantity: p.quantity + quantity } : p,
                    ),
                  );
                } else updateCart([...cart, { sku: chosen, quantity }]);
              }}
            >
              <label>
                Product / service
                <select
                  value={sku || products[0]?.sku || ''}
                  onChange={(e) => setSku(e.target.value)}
                  required
                >
                  {products.map((p) => (
                    <option value={p.sku} key={p.sku}>
                      {p.label} · {money(p.unit_price_sen)} · {p.kind ?? 'product'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantity / booking units
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
              <Button
                variant="secondary"
                disabled={
                  !products.length ||
                  cart.length >= 10 ||
                  !Number.isInteger(quantity) ||
                  quantity < 1 ||
                  quantity > 100 ||
                  (cart.find((p) => p.sku === (sku || products[0]?.sku))?.quantity ?? 0) +
                    quantity >
                    100
                }
              >
                Add to basket
              </Button>
            </form>
          </QueryState>
          {cart.map((p) => (
            <div className="record-row" key={p.sku}>
              <div>
                <strong>{products.find((i) => i.sku === p.sku)?.label ?? p.sku}</strong>
                <p>
                  {p.quantity} × {money(products.find((i) => i.sku === p.sku)?.unit_price_sen ?? 0)}
                </p>
              </div>
              <Button
                variant="secondary"
                aria-label={`Remove ${products.find((i) => i.sku === p.sku)?.label ?? p.sku}`}
                onClick={() => updateCart(cart.filter((i) => i.sku !== p.sku))}
              >
                Remove
              </Button>
            </div>
          ))}
          {!cart.length ? (
            <p className="muted spaced">Add your first item to start a booking.</p>
          ) : null}
          <form
            className="form-stack spaced"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await action.run<Quote>('/quotes', {
                items: cart,
                pickupDate: date,
                pickupSlotCode: slot,
              });
              if (r) {
                setQuote(r);
                setQuotedBasket(basket.snapshot);
                setConfirmed(false);
                action.setNotice('Exact quote prepared. Nothing is reserved until confirmation.');
              }
            }}
          >
            <label>
              {profile.data?.fulfilment === 'appointment' ? 'Appointment date' : 'Fulfilment date'}
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setQuote(null);
                  setConfirmed(false);
                }}
              />
            </label>
            <label>
              Time window
              <select
                required
                value={slot}
                onChange={(e) => {
                  setSlot(e.target.value);
                  setQuote(null);
                  setConfirmed(false);
                }}
              >
                {pickup.data?.slots.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.start_local.slice(0, 5)}–{s.end_local.slice(0, 5)} · MYT
                  </option>
                ))}
              </select>
            </label>
            <p className="fine-print">
              All times are Malaysia time. Availability is checked again when you confirm.
            </p>
            <QueryState query={capacity}>
              {cart.map((i) => {
                const c = capacity.data?.capacity.find((p) => p.sku === i.sku);
                return (
                  <p className="fine-print" key={i.sku}>
                    {products.find((p) => p.sku === i.sku)?.label ?? i.sku}:{' '}
                    {c
                      ? `${c.available_units} date units available`
                      : 'Unavailable on this date — choose another date or ask the owner'}
                  </p>
                );
              })}
            </QueryState>
            <Button disabled={action.pending || !cart.length || !pickup.data}>
              Review exact quote
            </Button>
          </form>
          <Feedback action={action} />
        </section>
        <section
          ref={quotePanel}
          tabIndex={-1}
          className="panel quote-review-panel"
          aria-labelledby="quote-review-title"
        >
          <h2 id="quote-review-title">{quote ? 'Your exact quote' : 'Review your booking'}</h2>
          {quote ? (
            <>
              <p className="muted">Quote expires {instant(quote.expiresAt)}</p>
              {quote.items.map((i) => (
                <div className="record-row" key={i.sku}>
                  <span>
                    {i.quantity} × {i.label}
                  </span>
                  <strong>{money(i.lineTotalSen)}</strong>
                </div>
              ))}
              <dl className="money-summary">
                {quote.memberBenefit ? (
                  <div>
                    <dt>Member savings ({quote.memberBenefit.basisPoints / 100}%)</dt>
                    <dd>{money(quote.memberBenefit.savingsSen)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Total</dt>
                  <dd>{money(quote.totalSen)}</dd>
                </div>
                <div>
                  <dt>Required deposit</dt>
                  <dd>{money(quote.depositSen)}</dd>
                </div>
                <div>
                  <dt>Balance after deposit</dt>
                  <dd>{money(quote.totalSen - quote.depositSen)}</dd>
                </div>
                <div>
                  <dt>Date / window</dt>
                  <dd>
                    {quote.pickupDate} ·{' '}
                    {quotedSlot
                      ? `${quotedSlot.start_local.slice(0, 5)}–${quotedSlot.end_local.slice(0, 5)} · MYT`
                      : 'Scheduled window'}
                  </dd>
                </div>
              </dl>
              <p className="notice">
                Confirming saves your booking and reserves available capacity. This demo does not
                collect money.
              </p>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{' '}
                I reviewed the exact items, price and schedule.
              </label>
              {expired ? (
                <p className="error-banner">This quote expired. Prepare a fresh one.</p>
              ) : null}
              {basketChanged ? (
                <p className="error-banner">
                  Your bag changed. Review a fresh quote before confirming.
                </p>
              ) : null}
              <Button
                disabled={action.pending || !confirmed || expired || basketChanged}
                onClick={async () => {
                  const challenge = await action.run<{ challengeToken: string }>(
                    `/quotes/${quote.id}/confirmation-challenge`,
                    { proposalHash: quote.proposalHash },
                  );
                  if (!challenge) return;
                  const result = await action.run<{ id: string }>('/orders/confirm', {
                    quoteId: quote.id,
                    proposalHash: quote.proposalHash,
                    challengeToken: challenge.challengeToken,
                  });
                  if (result) {
                    basket.set([]);
                    navigate(`/account/orders/${result.id}`);
                  }
                }}
              >
                <Check size={16} /> Confirm booking
              </Button>
            </>
          ) : (
            <div className="quote-placeholder">
              <ReceiptText size={36} />
              <h3>Your quote will appear here</h3>
              <p>
                Add items, choose a date and select Review exact quote. Then check the total,
                deposit and schedule before confirming.
              </p>
            </div>
          )}
          <p className="spaced">
            <Link className="text-link" to={`/b/${me!.business.slug}/chat`}>
              Ask your buddy or request a reviewed promotion →
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
