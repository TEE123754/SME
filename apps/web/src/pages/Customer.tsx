import { useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from '../lib/session-context';
import { money, instant } from '../lib/api';
import type { Product, Pickup, Quote, Order, Conversation, Message, Capacity } from '../lib/types';
import { Button } from '../components/ui/button';
import { useData, useAction } from '../lib/hooks';
import { PageHeading, Feedback, QueryState, Status } from '../components/workflow';
import { OrderTracking } from './Calendar';

const orderFormSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  pickupDate: z.iso.date(),
  pickupSlotCode: z.string().min(1),
});
type OrderFields = z.infer<typeof orderFormSchema>;
export function CustomerChat() {
  const orderSection = useRef<HTMLDetailsElement>(null);
  function openOrderForm() {
    if (orderSection.current) {
      orderSection.current.open = true;
      orderSection.current.scrollIntoView({ behavior: 'smooth' });
    }
  }
  const { me, t } = useSession(),
    products = useData<{ items: Product[] }>('/catalogue'),
    pickup = useData<Pickup>('/pickup-options');
  const conversations = useData<{ conversations: Conversation[] }>('/conversations');
  const notices = useData<{ notifications: { id: string; content: string; order_id: string }[] }>(
    '/me/notifications',
  );
  const [lastMessage, setLastMessage] = useState<{
    conversationId: string;
    messageId: string;
  } | null>(null);
  const history = useData<{ orders: Order[] }>('/orders'),
    knowledge = useData<{
      policy: { policy_json: { leadTimeHours: number } };
      entries: { fact_key: string; content_en: string; content_bm: string }[];
    }>('/knowledge'),
    clock = useData<{ demoTime: string }>('/business-time');
  const reviews = useData<{
    reviews: {
      id: string;
      kind: string;
      effective_state: string;
      quote_id: string | null;
      decision_note: string | null;
    }[];
  }>('/me/reviews');
  const conversationStorageKey = `cb.conversation.${me?.business.id}.${me?.profile?.id}`;
  const [selected, setSelected] = useState<string | null>(() =>
      sessionStorage.getItem(conversationStorageKey),
    ),
    [quote, setQuote] = useState<Quote | null>(null),
    [editing, setEditing] = useState<Quote | null>(null),
    [message, setMessage] = useState(''),
    [reviewNote, setReviewNote] = useState(''),
    [kind, setKind] = useState<'custom_order' | 'complaint' | 'refund_request'>('custom_order'),
    [discount, setDiscount] = useState(10);
  const activeId =
    conversations.data?.conversations.find((c) => c.id === selected)?.id ??
    conversations.data?.conversations.find((c) => c.state !== 'closed')?.id;
  const active = conversations.data?.conversations.find((c) => c.id === activeId),
    messages = useData<{ messages: Message[] }>(
      `/conversations/${activeId ?? ''}/messages`,
      !!activeId,
    );
  const action = useAction(),
    navigate = useNavigate();
  const form = useForm<OrderFields>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      sku: '',
      quantity: 1,
      pickupDate: '2026-10-10',
      pickupSlotCode: 'midday',
    },
  });
  const date = useWatch({ control: form.control, name: 'pickupDate' }),
    capacity = useData<{ capacity: Capacity[] }>(
      `/capacity?date=${encodeURIComponent(date)}`,
      /^\d{4}-\d{2}-\d{2}$/.test(date),
    );
  const quoteExpired =
    !!quote &&
    (quote.state === 'expired' ||
      (!!clock.data &&
        new Date(quote.expiresAt).getTime() <= new Date(clock.data.demoTime).getTime()));
  async function prepare(fields: OrderFields) {
    const input = {
      items: [{ sku: fields.sku, quantity: fields.quantity }],
      pickupDate: fields.pickupDate,
      pickupSlotCode: fields.pickupSlotCode,
    };
    const q = await action.run<Quote>(editing ? `/quotes/${editing.id}/edit` : '/quotes', input);
    if (q) {
      setQuote(q);
      setEditing(null);
      action.setNotice(
        t(
          'Quote prepared. Review it before confirming. No capacity is reserved yet.',
          'Sebut harga tersedia. Semak sebelum sahkan. Kapasiti belum ditempah.',
        ),
      );
    }
  }
  function chooseConversation(id: string) {
    setSelected(id);
    sessionStorage.setItem(conversationStorageKey, id);
  }
  async function newConversation() {
    const c = await action.run<{ id: string }>('/conversations', {
      language: me?.profile?.preferred_language ?? 'en',
    });
    if (c) {
      chooseConversation(c.id);
      return c.id;
    }
    return undefined;
  }
  async function openOffer(id: string) {
    const raw = await action.run<{
      id: string;
      items_json: Quote['items'];
      pickup_date: string;
      pickup_slot_id: string;
      knowledge_version_id: string;
      total_sen: number;
      deposit_sen: number;
      proposal_hash: string;
      expires_at: string;
      state: string;
    }>(`/quotes/${id}`, undefined, 'GET');
    if (raw) {
      setQuote({
        id: raw.id,
        items: raw.items_json,
        pickupDate: raw.pickup_date,
        pickupSlotId: raw.pickup_slot_id,
        knowledgeVersionId: raw.knowledge_version_id,
        totalSen: raw.total_sen,
        depositSen: raw.deposit_sen,
        proposalHash: raw.proposal_hash,
        expiresAt: raw.expires_at,
        state: raw.state,
      });
      setEditing(null);
    }
  }
  async function dispatch(conversationId: string, messageId: string) {
    const result = await action.run<{ reply: string; error?: string }>(
      `/conversations/${conversationId}/respond`,
      { messageId },
    );
    if (result) {
      setLastMessage(null);
      action.setNotice(
        result.error ? 'The scripted service failed. Ask the owner or use the form.' : result.reply,
      );
    }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    await sendText(message.trim());
  }
  async function sendText(content: string) {
    const id = activeId ?? (await newConversation());
    if (!id) return;
    const result = await action.run<{ id: string }>(`/conversations/${id}/messages`, {
      content,
    });
    if (result) {
      setMessage('');
      setLastMessage({ conversationId: id, messageId: result.id });
      await dispatch(id, result.id);
    }
  }

  return (
    <>
      <PageHeading
        title={t(
          `Hello, ${me?.profile?.display_name ?? 'there'}. How can we help?`,
          `Hai, ${me?.profile?.display_name ?? 'anda'}. Apa pilihan anda?`,
        )}
        description={t(
          'Your dedicated business buddy. Amounts and availability come from saved business records.',
          'Pembantu perniagaan anda. Harga dan ketersediaan daripada rekod perniagaan.',
        )}
      >
        <Link className="button button-primary" to="/checkout">
          {t('Start a booking', 'Buat tempahan')}
        </Link>
      </PageHeading>
      {notices.data?.notifications.map((n) => (
        <section className="panel spaced" key={n.id}>
          <strong>
            {t(
              'Saved reminder — check the order for its current balance',
              'Peringatan tersimpan — semak pesanan untuk baki terkini',
            )}
          </strong>
          <p>{n.content}</p>
          <Link to={`/account/orders/${n.order_id}`}>{t('View order', 'Lihat pesanan')}</Link>
        </section>
      ))}
      <div className="action-row spaced chat-quick-actions" aria-label="Supported scripted actions">
        {[
          'menu',
          'pickup',
          'order status',
          'preferences',
          'recommendation',
          'after sales',
          'owner help',
        ].map((text) => (
          <Button
            key={text}
            variant="secondary"
            disabled={action.pending}
            onClick={() => sendText(text)}
          >
            {t(
              (
                {
                  menu: 'Products',
                  pickup: 'Collection times',
                  'order status': 'My order status',
                  preferences: 'Saved preferences',
                  recommendation: 'Recommend for me',
                  'after sales': 'After-sales help',
                  'owner help': 'Ask the owner',
                } as Record<string, string>
              )[text]!,
              (
                {
                  menu: 'menu',
                  pickup: 'waktu ambil',
                  'order status': 'status pesanan',
                  preferences: 'pilihan',
                  recommendation: 'cadangan',
                  'after sales': 'sokongan selepas jualan',
                  'owner help': 'bantuan pemilik',
                } as Record<string, string>
              )[text]!,
            )}
          </Button>
        ))}
      </div>
      {lastMessage ? (
        <Button
          variant="secondary"
          disabled={action.pending}
          onClick={() => dispatch(lastMessage.conversationId, lastMessage.messageId)}
        >
          Retry scripted reply
        </Button>
      ) : null}
      <div className="action-row spaced">
        <Button variant="secondary" onClick={openOrderForm}>
          {t('Single-item order form', 'Borang satu produk')}
        </Button>
        <Button
          variant="secondary"
          disabled={!history.data?.orders.length}
          onClick={() => {
            const item = history.data?.orders[0]?.items?.[0];
            if (item) {
              form.reset({
                sku: item.sku,
                quantity: item.quantity,
                pickupDate: '2026-10-10',
                pickupSlotCode: 'midday',
              });
              setEditing(null);
              setQuote(null);
              openOrderForm();
            }
          }}
        >
          {t('Order again', 'Pesan lagi')}
        </Button>
        <Link className="button button-secondary" to="/account/orders">
          {t('Check orders', 'Semak pesanan')}
        </Link>
        <Link className="button button-secondary" to="/account/preferences">
          {t('Preferences', 'Pilihan')}
        </Link>
      </div>
      <div className="two-columns customer-grid">
        <div>
          <section className="panel">
            <div className="section-heading">
              <h2>{t('Your conversation', 'Perbualan anda')}</h2>
              <Button variant="secondary" disabled={action.pending} onClick={newConversation}>
                {t('New conversation', 'Perbualan baharu')}
              </Button>
            </div>
            <QueryState query={conversations}>
              <label>
                {t('Saved conversation', 'Perbualan tersimpan')}
                <select value={activeId ?? ''} onChange={(e) => chooseConversation(e.target.value)}>
                  <option value="">
                    {t('Choose or start a conversation', 'Pilih atau mulakan perbualan')}
                  </option>
                  {conversations.data?.conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {instant(c.created_at)} · {c.state.replaceAll('_', ' ')} · {c.id.slice(0, 6)}
                    </option>
                  ))}
                </select>
              </label>
            </QueryState>
            {active ? (
              <p>
                <Status state={active.state} />
              </p>
            ) : null}
            {active?.human_takeover ? (
              <div className="notice">
                {t(
                  'Waiting for the owner. Your messages are saved; automation stays paused until the owner resumes.',
                  'Menunggu pemilik. Mesej disimpan; automasi dijeda sehingga pemilik menyambung.',
                )}
              </div>
            ) : null}
            <div className="message-list" aria-label="Saved messages">
              {activeId ? (
                <QueryState query={messages}>
                  {messages.data?.messages.length ? (
                    messages.data.messages.map((m) => (
                      <article key={m.id} className={`message message-${m.role}`}>
                        <strong>{m.role === 'customer' ? t('You', 'Anda') : m.role}</strong>
                        <p>{m.content}</p>
                        <small>{instant(m.created_at)}</small>
                      </article>
                    ))
                  ) : (
                    <p className="muted">{t('No messages yet.', 'Belum ada mesej.')}</p>
                  )}
                </QueryState>
              ) : (
                <p className="muted">
                  {t(
                    'Start a conversation or go straight to the order form.',
                    'Mulakan perbualan atau terus ke borang pesanan.',
                  )}
                </p>
              )}
            </div>
            <form className="form-stack" onSubmit={send}>
              <label>
                {t('Message to your business', 'Mesej kepada perniagaan')}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={4000}
                  rows={3}
                />
              </label>
              <Button disabled={action.pending || !message.trim() || active?.state === 'closed'}>
                {t('Send message', 'Hantar mesej')}
              </Button>
            </form>
            <p className="fine-print">
              {t(
                'Supported scripts: menu, pickup, order status, order again, preferences, recommendation, after sales, owner help. Exact ordering uses the form.',
                'Skrip: menu, waktu ambil, status, pesan lagi, pilihan, bantuan pemilik. Gunakan borang untuk pesanan tepat.',
              )}
            </p>
          </section>
          <details className="panel spaced disclosure-panel">
            <summary>{t('Request help from the owner', 'Minta bantuan pemilik')}</summary>
            <form
              className="form-stack disclosure-body"
              onSubmit={async (e) => {
                e.preventDefault();
                const id = activeId ?? (await newConversation());
                if (
                  id &&
                  (await action.run('/exceptions', {
                    kind,
                    conversationId: id,
                    note: reviewNote.trim(),
                  }))
                ) {
                  setReviewNote('');
                  action.setNotice(
                    t(
                      'Your request is waiting for owner review.',
                      'Permintaan anda menunggu semakan pemilik.',
                    ),
                  );
                }
              }}
            >
              <label>
                {t('Request type', 'Jenis permintaan')}
                <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                  <option value="custom_order">Custom order / Pesanan khas</option>
                  <option value="complaint">Help / Bantuan</option>
                  <option value="refund_request">Refund review / Semakan bayaran balik</option>
                </select>
              </label>
              <label>
                {t('Details for the owner', 'Butiran untuk pemilik')}
                <textarea
                  required
                  maxLength={1000}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                />
              </label>
              <Button disabled={action.pending}>
                {t('Request owner review', 'Minta semakan pemilik')}
              </Button>
            </form>
          </details>
        </div>
        <div>
          <details ref={orderSection} className="panel disclosure-panel" id="order-form">
            <summary>
              {t(
                editing ? 'Edit your order' : 'Single-item order form',
                editing ? 'Ubah pesanan' : 'Pesanan baharu',
              )}
            </summary>
            <div className="disclosure-body">
              <QueryState query={products}>
                <div className="catalogue-cards">
                  {products.data?.items.map((p) => (
                    <article key={p.sku} className="product-card">
                      <span className="product-mark" aria-hidden="true">
                        {p.sku === 'brownie-tray' ? '▦' : '♧'}
                      </span>
                      <div>
                        <h3>{p.label}</h3>
                        <p>{p.units_description}</p>
                        <strong>{money(p.unit_price_sen)}</strong>
                        <p>{p.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </QueryState>
              <form onSubmit={form.handleSubmit(prepare)} className="form-stack">
                <label>
                  {t('Product', 'Produk')}
                  <select {...form.register('sku')}>
                    <option value="">
                      {t('Choose a product or service', 'Pilih produk atau perkhidmatan')}
                    </option>
                    {products.data?.items.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Quantity', 'Kuantiti')}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    {...form.register('quantity', { valueAsNumber: true })}
                  />
                </label>
                <label>
                  {t('Pickup date', 'Tarikh ambil')}
                  <input type="date" required {...form.register('pickupDate')} />
                </label>
                <label>
                  {t('Pickup slot', 'Waktu ambil')}
                  <select {...form.register('pickupSlotCode')}>
                    {pickup.data?.slots.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.start_local.slice(0, 5)}–{s.end_local.slice(0, 5)} · Malaysia
                      </option>
                    ))}
                  </select>
                </label>
                {Object.keys(form.formState.errors).length ? (
                  <p className="error-banner" role="alert">
                    {t(
                      'Choose a valid product, whole quantity (1–100), date and pickup slot.',
                      'Pilih produk, kuantiti bulat (1–100), tarikh dan waktu ambil yang sah.',
                    )}
                  </p>
                ) : null}
                <QueryState query={capacity}>
                  {capacity.data?.capacity.map((c) => (
                    <p className="fine-print" key={c.sku}>
                      {c.sku}: {c.available_units}{' '}
                      {t('units available on this date', 'unit tersedia pada tarikh ini')}
                    </p>
                  ))}
                </QueryState>
                <p className="fine-print">
                  {knowledge.data?.policy.policy_json.leadTimeHours}{' '}
                  {t(
                    'hours lead time. Quotes do not hold capacity. Business time:',
                    'jam persediaan. Sebut harga tidak menempah kapasiti. Masa perniagaan:',
                  )}{' '}
                  {clock.data ? instant(clock.data.demoTime) : t('Loading…', 'Memuatkan…')}
                </p>
                <Button disabled={action.pending || !products.data?.items.length || !pickup.data}>
                  {t(
                    editing ? 'Prepare revised quote' : 'Prepare quote',
                    editing ? 'Sediakan sebut harga baharu' : 'Sediakan sebut harga',
                  )}
                </Button>
              </form>
            </div>
          </details>
          {quote ? (
            <section className="panel quote-card spaced" aria-label="Quote prepared">
              <span className="eyebrow">{t('Quote prepared', 'Sebut harga tersedia')}</span>
              <h2>{t('Review your order', 'Semak pesanan anda')}</h2>
              {quoteExpired ? (
                <p role="status" className="notice">
                  {t(
                    'This quote has expired. Prepare a fresh quote before confirming.',
                    'Sebut harga tamat tempoh. Sediakan sebut harga baharu sebelum sahkan.',
                  )}
                </p>
              ) : null}
              {quote.items.map((i) => (
                <p key={i.sku}>
                  {i.quantity} × {i.label} <strong>{money(i.lineTotalSen)}</strong>
                </p>
              ))}
              <p>
                {quote.pickupDate} ·{' '}
                {pickup.data?.slots.find((s) => s.id === quote.pickupSlotId)?.code ??
                  quote.pickupSlotId}{' '}
                · MYT
              </p>
              <dl className="money-summary">
                <div>
                  <dt>{t('Total', 'Jumlah')}</dt>
                  <dd>{money(quote.totalSen)}</dd>
                </div>
                <div>
                  <dt>{t('Deposit required', 'Deposit diperlukan')}</dt>
                  <dd>{money(quote.depositSen)}</dd>
                </div>
              </dl>
              <p>
                {t('Valid until', 'Sah sehingga')} {instant(quote.expiresAt)} ·{' '}
                {t('No capacity reserved yet.', 'Kapasiti belum ditempah.')}
              </p>
              <div className="action-row">
                <Button
                  disabled={action.pending || quote.state !== 'active' || quoteExpired}
                  onClick={async () => {
                    const token = await action.run<{ challengeToken: string }>(
                      `/quotes/${quote.id}/confirmation-challenge`,
                      { proposalHash: quote.proposalHash },
                    );
                    if (!token) return;
                    const o = await action.run<{ id: string }>('/orders/confirm', {
                      quoteId: quote.id,
                      proposalHash: quote.proposalHash,
                      challengeToken: token.challengeToken,
                    });
                    if (o) {
                      setQuote(null);
                      navigate(`/account/orders/${o.id}`);
                    }
                  }}
                >
                  {t('Confirm order', 'Sahkan pesanan')}
                </Button>
                <Button
                  variant="secondary"
                  disabled={action.pending}
                  onClick={() => {
                    setEditing(quote);
                    setQuote(null);
                    form.reset({
                      sku: quote.items[0]!.sku,
                      quantity: quote.items[0]!.quantity,
                      pickupDate: quote.pickupDate,
                      pickupSlotCode:
                        pickup.data?.slots.find((s) => s.id === quote.pickupSlotId)?.code ??
                        'midday',
                    });
                    openOrderForm();
                  }}
                >
                  {t('Edit order', 'Ubah pesanan')}
                </Button>
              </div>
              <form
                className="form-stack spaced"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await action.run('/exceptions', {
                      kind: 'discount',
                      quoteId: quote.id,
                      discountBasisPoints: discount * 100,
                      note: 'Customer requests owner-reviewed discount',
                    })
                  )
                    action.setNotice(
                      t(
                        'Discount request sent. Only an approved new quote can apply it.',
                        'Permintaan diskaun dihantar. Hanya sebut harga baharu yang diluluskan boleh menggunakannya.',
                      ),
                    );
                }}
              >
                <label>
                  {t('Request discount (%)', 'Minta diskaun (%)')}
                  <input
                    type="number"
                    value={discount}
                    min={1}
                    max={50}
                    step={1}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </label>
                <Button variant="secondary" disabled={action.pending}>
                  {t('Ask owner about this quote', 'Minta semakan sebut harga')}
                </Button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
      <details
        className="panel spaced disclosure-panel"
        open={!!reviews.data?.reviews.length || undefined}
      >
        <summary>{t('Your owner reviews and offers', 'Semakan pemilik dan tawaran anda')}</summary>
        <div className="disclosure-body">
          <QueryState query={reviews}>
            {reviews.data?.reviews.length ? (
              reviews.data.reviews.map((r) => (
                <article className="review-summary" key={r.id}>
                  <div>
                    <strong>{r.kind.replaceAll('_', ' ')}</strong>{' '}
                    <Status state={r.effective_state} />
                    {r.decision_note ? <p>{r.decision_note}</p> : null}
                  </div>
                  {r.quote_id ? (
                    <Button
                      variant="secondary"
                      disabled={action.pending}
                      onClick={() => openOffer(r.quote_id!)}
                    >
                      {t('Review approved offer', 'Semak tawaran diluluskan')}
                    </Button>
                  ) : null}
                </article>
              ))
            ) : (
              <p>{t('No owner reviews yet.', 'Belum ada semakan pemilik.')}</p>
            )}
          </QueryState>
        </div>
      </details>
      <details className="panel spaced disclosure-panel">
        <summary>{t('Business facts', 'Maklumat perniagaan')}</summary>
        <div className="disclosure-body">
          <QueryState query={knowledge}>
            {knowledge.data?.entries.map((e) => (
              <details key={e.fact_key}>
                <summary>{e.fact_key.replaceAll('_', ' ')}</summary>
                <p>{me?.profile?.preferred_language === 'bm' ? e.content_bm : e.content_en}</p>
              </details>
            ))}
          </QueryState>
        </div>
      </details>
      <Feedback action={action} />
    </>
  );
}
export { Orders } from './OrdersList';
export function OrderDetail({ owner = false }: { owner?: boolean }) {
  const { id } = useParams(),
    query = useData<Order>(`/orders/${id}`),
    action = useAction(),
    { t } = useSession();
  const [note, setNote] = useState('');
  return (
    <>
      <Link className="text-link" to={owner ? '/owner/orders' : '/account/orders'}>
        ← {t('All orders', 'Semua pesanan')}
      </Link>
      <QueryState query={query}>
        {query.data ? (
          <>
            <PageHeading
              title={query.data.display_code}
              description={`${query.data.pickup_date} · Malaysia pickup`}
            >
              <Status state={query.data.state} />
            </PageHeading>
            <OrderTracking order={query.data} owner={owner} />
            <div className="two-columns">
              <section className="panel">
                <h2>{t('Order summary', 'Ringkasan pesanan')}</h2>
                {query.data.items?.map((i) => (
                  <p key={i.sku}>
                    {i.quantity} × {i.label} · {money(i.unitPriceSen)} {t('each', 'seunit')}
                  </p>
                ))}
                <dl className="money-summary">
                  <div>
                    <dt>{t('Total', 'Jumlah')}</dt>
                    <dd>{money(query.data.total_sen)}</dd>
                  </div>
                  <div>
                    <dt>{t('Required deposit', 'Deposit diperlukan')}</dt>
                    <dd>{money(query.data.deposit_required_sen)}</dd>
                  </div>
                  <div>
                    <dt>{t('Verified paid', 'Bayaran disahkan')}</dt>
                    <dd>{money(query.data.verified_paid_sen)}</dd>
                  </div>
                  <div>
                    <dt>{t('Remaining balance', 'Baki bayaran')}</dt>
                    <dd>{money(query.data.total_sen - query.data.verified_paid_sen)}</dd>
                  </div>
                </dl>
                {query.data.reservation ? (
                  <p>
                    <Status state={query.data.reservation.state} />
                    {query.data.reservation.state === 'held' ? (
                      <>
                        {' '}
                        · {t('Deposit due', 'Deposit sebelum')}{' '}
                        {instant(query.data.reservation.expiresAt)}
                      </>
                    ) : null}
                  </p>
                ) : null}
                {query.data.exception_paused ? (
                  <div className="notice">
                    {t('Paused for owner review.', 'Dijeda untuk semakan pemilik.')}
                  </div>
                ) : null}
                <h3>{t('Synthetic payment history', 'Sejarah bayaran sintetik')}</h3>
                {query.data.payments?.length ? (
                  query.data.payments.map((p) => (
                    <p key={p.id}>
                      {money(p.amountSen)} · {p.reference} · {p.state}
                    </p>
                  ))
                ) : (
                  <p>
                    {t(
                      'No payment verified. Please use the owner workspace to verify a synthetic deposit.',
                      'Tiada bayaran disahkan. Gunakan ruang pemilik untuk mengesahkan deposit sintetik.',
                    )}
                  </p>
                )}
              </section>
              <section className="panel">
                <h2>{t('Documents', 'Dokumen')}</h2>
                {query.data.documents?.length ? (
                  query.data.documents.map((d) => (
                    <p key={d.id}>
                      {d.kind} · <Status state={d.state} />{' '}
                      {d.state === 'available' ? (
                        <a className="text-link" href={`/api/v1/documents/${d.id}/download`}>
                          {t('Download PDF', 'Muat turun PDF')}
                        </a>
                      ) : null}
                    </p>
                  ))
                ) : (
                  <p>
                    {t(
                      'No file available yet. The local worker processes queued documents; the owner can run due jobs.',
                      'Fail belum tersedia. Pemproses tempatan menjana dokumen; pemilik boleh menjalankan tugas.',
                    )}
                  </p>
                )}
                <p className="fine-print">
                  {t(
                    'No file is available until the document worker creates it.',
                    'Fail hanya tersedia selepas dijana oleh pemproses dokumen.',
                  )}
                </p>
                {owner ? (
                  <OwnerOrderActions
                    key={`${query.data.id}:${query.data.version}:${query.data.verified_paid_sen}`}
                    order={query.data}
                  />
                ) : (
                  <form
                    className="form-stack spaced"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await action.run(`/orders/${id}/handoff`, { note: note.trim() })) {
                        setNote('');
                        action.setNotice(t('Owner review requested.', 'Semakan pemilik diminta.'));
                      }
                    }}
                  >
                    <h3>{t('Need help with this order?', 'Perlukan bantuan pesanan ini?')}</h3>
                    <label>
                      {t('Note for the owner', 'Nota untuk pemilik')}
                      <textarea
                        required
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={1000}
                      />
                    </label>
                    <Button disabled={action.pending}>
                      {t('Request owner review', 'Minta semakan pemilik')}
                    </Button>
                  </form>
                )}
              </section>
            </div>
          </>
        ) : null}
      </QueryState>
      <Feedback action={action} />
    </>
  );
}
const paymentFormSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reference: z.string().regex(/^SYNTHETIC-[A-Za-z0-9_-]{1,80}$/),
});
function OwnerOrderActions({ order }: { order: Order }) {
  const action = useAction(),
    form = useForm<z.infer<typeof paymentFormSchema>>({
      resolver: zodResolver(paymentFormSchema),
      defaultValues: {
        amount: (
          (order.verified_paid_sen < order.deposit_required_sen
            ? order.deposit_required_sen - order.verified_paid_sen
            : order.total_sen - order.verified_paid_sen) / 100
        ).toFixed(2),
        reference: `SYNTHETIC-${order.display_code}-${order.verified_paid_sen ? 'BALANCE' : 'DEPOSIT'}-V${order.version}`,
      },
    });
  const [note, setNote] = useState(''),
    [reviewed, setReviewed] = useState(false);
  return (
    <>
      <form
        className="form-stack spaced"
        onSubmit={form.handleSubmit(async (v) => {
          const amountSen = Math.round(Number(v.amount) * 100);
          if (amountSen <= 0 || amountSen > order.total_sen - order.verified_paid_sen) {
            action.setNotice('Enter a positive amount within the remaining balance.');
            return;
          }
          if (
            await action.run('/owner/payments/verify', {
              orderId: order.id,
              amountSen,
              reference: v.reference,
            })
          )
            action.setNotice('Synthetic payment verified. The latest order state is shown.');
        })}
      >
        <h3>Verify a synthetic payment</h3>
        <label>
          Amount (RM)
          <input inputMode="decimal" required {...form.register('amount')} />
        </label>
        <label>
          Synthetic payment reference
          <input required maxLength={90} {...form.register('reference')} />
        </label>
        {Object.keys(form.formState.errors).length ? (
          <p role="alert" className="error-banner">
            Enter a valid decimal amount and a SYNTHETIC- reference.
          </p>
        ) : null}
        <Button disabled={action.pending || order.verified_paid_sen >= order.total_sen}>
          Verify synthetic payment
        </Button>
      </form>
      <form className="form-stack spaced" onSubmit={(e) => e.preventDefault()}>
        <h3>Owner status controls</h3>
        <label>
          Decision note
          <textarea
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
        </label>
        <div className="action-row">
          {(['ready', 'completed'] as const).map((state) => (
            <Button
              variant="secondary"
              key={state}
              disabled={
                action.pending ||
                !note.trim() ||
                (state === 'ready'
                  ? !['confirmed', 'preparing'].includes(order.state)
                  : !['ready', 'delivering'].includes(order.state))
              }
              onClick={async () => {
                if (
                  await action.run(`/owner/orders/${order.id}/status`, {
                    state,
                    version: order.version,
                    note: note.trim(),
                  })
                )
                  action.setNotice(`Order marked ${state}.`);
              }}
            >
              Mark {state}
            </Button>
          ))}
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          <span>
            I reviewed cancellation. Payments remain recorded; refunds are handled separately.
          </span>
        </label>
        <Button
          variant="secondary"
          disabled={
            action.pending ||
            !reviewed ||
            !note.trim() ||
            ['completed', 'cancelled'].includes(order.state)
          }
          onClick={async () => {
            if (
              await action.run(`/owner/orders/${order.id}/status`, {
                state: 'cancelled',
                version: order.version,
                reviewed,
                note: note.trim(),
              })
            )
              action.setNotice(
                'Order cancelled; allocation released and payment history retained.',
              );
          }}
        >
          Cancel reviewed order
        </Button>
        {order.exception_paused ? (
          <Button
            variant="secondary"
            disabled={action.pending}
            onClick={async () => {
              if (await action.run(`/owner/orders/${order.id}/resume`, { version: order.version }))
                action.setNotice('Order automation explicitly resumed.');
            }}
          >
            Resume after review
          </Button>
        ) : null}
      </form>
      <Feedback action={action} />
    </>
  );
}
