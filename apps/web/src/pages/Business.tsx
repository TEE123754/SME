import { MembershipProgram } from './Membership';
import { useState, useRef } from 'react';
import { Search, Plus, ArrowRight, X, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData, useAction } from '../lib/hooks';
import { containDialogFocus } from '../components/dialog-focus';
import { money, instant } from '../lib/api';
import { PageHeading, QueryState, Feedback, Status } from '../components/workflow';
import { Button } from '../components/ui/button';
import type { StockData, StockItem, BusinessProfile } from '../lib/operations-types';
import type { Product } from '../lib/types';

export function StockForecast() {
  const q = useData<StockData>('/owner/stock'),
    action = useAction();
  return (
    <>
      <PageHeading
        title="Stock, forecasts and pricing"
        description="Keep inventory balanced. Explainable demo forecasts use saved orders; pricing changes require your approval."
      />
      <QueryState query={q}>
        {q.data ? (
          <>
            <p className="notice">
              {q.data.method} As of {instant(q.data.asOf)}. Ranges are illustrative heuristics, not
              statistically calibrated forecasts. Untracked stock uses date capacity only; receive
              stock to enable inventory controls.
            </p>
            <div className="metric-grid">
              <article className="panel metric">
                <p>Seven-day baseline units</p>
                <strong>{q.data.items.reduce((n, p) => n + p.predicted7, 0)}</strong>
              </article>
              <article className="panel metric">
                <p>Forecast sales at current prices</p>
                <strong>
                  {money(q.data.items.reduce((n, p) => n + p.predicted7 * p.unit_price_sen, 0))}
                </strong>
              </article>
              <article className="panel metric">
                <p>Confirmed future units</p>
                <strong>{q.data.items.reduce((n, p) => n + p.booked, 0)}</strong>
              </article>
            </div>
            <div className="field-grid">
              {q.data.items.map((p) => (
                <StockCard key={p.product_id} product={p} />
              ))}
            </div>
            <section className="panel spaced">
              <h2>Dynamic pricing proposals</h2>
              <p>Published uniformly for future quotes. Existing order prices remain unchanged.</p>
              {q.data.proposals.length ? (
                q.data.proposals.map((p) => (
                  <article className="record-row" key={p.id}>
                    <div>
                      <strong>
                        {p.sku} · {money(p.old_price_sen)} → {money(p.new_price_sen)}
                      </strong>
                      <p>{p.reason}</p>
                      <Status state={p.state} />
                    </div>
                    {p.state === 'pending' ? (
                      <div className="action-row">
                        {['approved', 'rejected'].map((d) => (
                          <Button
                            key={d}
                            variant={d === 'approved' ? 'primary' : 'secondary'}
                            disabled={action.pending}
                            onClick={async () => {
                              if (await action.run(`/owner/prices/${p.id}`, { decision: d }))
                                action.setNotice(`Price proposal ${d}.`);
                            }}
                          >
                            {d === 'approved' ? 'Approve and publish' : 'Reject'}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p>No pricing proposals yet. Suggest one from a product card.</p>
              )}
              <Feedback action={action} />
            </section>
            <section className="panel spaced">
              <h2>Stock movement ledger</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>SKU</th>
                      <th>Movement</th>
                      <th>Units</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.movements.map((m) => (
                      <tr key={m.id}>
                        <td>{instant(m.created_at)}</td>
                        <td>{m.sku}</td>
                        <td>{m.kind}</td>
                        <td>
                          {m.quantity > 0 ? '+' : ''}
                          {m.quantity}
                        </td>
                        <td>{m.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!q.data.movements.length ? (
                <p>No stock received yet. Ledger movements persist and cannot be edited.</p>
              ) : null}
            </section>
          </>
        ) : null}
      </QueryState>
    </>
  );
}
function StockCard({ product: p }: { product: StockItem }) {
  const action = useAction(),
    [quantity, setQuantity] = useState(10),
    [note, setNote] = useState('New stock received'),
    [kind, setKind] = useState('receipt');
  return (
    <article className="panel">
      <div className="section-heading">
        <h2>{p.label}</h2>
        <Status state={p.overflow ? 'overflow' : p.kind} />
      </div>
      <p className="muted">
        {p.sku} · {money(p.unit_price_sen)} · {p.confidence}
      </p>
      <dl className="money-summary">
        <div>
          <dt>{p.kind === 'service' ? 'Availability' : 'On hand / available to reserve'}</dt>
          <dd>
            {p.kind === 'service'
              ? 'Date capacity'
              : `${p.onHand ?? 'Untracked'} / ${p.available ?? '—'}`}
          </dd>
        </div>
        <div>
          <dt>Ordered in past 28 days</dt>
          <dd>{p.sold28}</dd>
        </div>
        <div>
          <dt>Seven-day baseline / range</dt>
          <dd>
            {p.predicted7} / {p.low}–{p.high}
          </dd>
        </div>
        <div>
          <dt>Confirmed future units</dt>
          <dd>{p.booked}</dd>
        </div>
        <div>
          <dt>Suggested replenishment</dt>
          <dd>{p.reorder}</dd>
        </div>
      </dl>
      {p.overflow ? (
        <p className="notice">Possible excess stock. Review demand before buying more.</p>
      ) : null}
      {p.kind === 'product' ? (
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await action.run('/owner/stock', { productId: p.product_id, quantity, kind, note }))
              action.setNotice('Stock movement saved.');
          }}
        >
          <label>
            Movement
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="receipt">Receive stock</option>
              <option value="adjustment">Adjustment (+ / −)</option>
            </select>
          </label>
          <label>
            Units
            <input
              type="number"
              min={kind === 'receipt' ? 1 : -100000}
              max={100000}
              value={quantity}
              required
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <label>
            Reason
            <input
              required
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <Button disabled={action.pending || quantity === 0}>Save stock movement</Button>
        </form>
      ) : (
        <p>Service units are bookings. Set daily capacity and select a date/time at checkout.</p>
      )}
      <div className="action-row spaced">
        <Button
          variant="secondary"
          disabled={action.pending}
          onClick={async () => {
            if (await action.run('/owner/prices', { productId: p.product_id }))
              action.setNotice('Pricing suggestion saved for owner review.');
          }}
        >
          Suggest dynamic price
        </Button>
        <Link className="text-link" to="/owner/capacity">
          Set date capacity →
        </Link>
      </div>
      <Feedback action={action} />
    </article>
  );
}
type Sales = {
  totals: { orders: number; booked_sen: number; cancelled_sen: number };
  paidSen: number;
  products: { sku: string; label: string; units: number; sales_sen: number }[];
  invoices: {
    id: string;
    state: string;
    order_id: string;
    display_code: string;
    total_sen: number;
  }[];
};
export function SalesPage() {
  const q = useData<Sales>('/owner/sales');
  return (
    <>
      <PageHeading
        title="Sales and invoices"
        description="Reconcile booked sales, synthetic payments and documents from the same saved orders."
      />
      <QueryState query={q}>
        {q.data ? (
          <>
            <div className="metric-grid">
              {[
                ['Orders', q.data.totals.orders],
                ['Booked sales', money(q.data.totals.booked_sen)],
                ['Verified synthetic payments', money(q.data.paidSen)],
                ['Cancelled order value', money(q.data.totals.cancelled_sen)],
              ].map(([label, value]) => (
                <article className="panel metric" key={label}>
                  <p>{label}</p>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <p className="notice">
              Booked sales exclude cancelled orders. Payments include retained synthetic payments on
              cancelled orders; this is cash reconciliation, not recognised accounting revenue.
            </p>
            <div className="two-columns">
              <section className="panel">
                <h2>Sales by item</h2>
                {q.data.products.map((p) => (
                  <div className="record-row" key={`${p.sku}:${p.label}`}>
                    <div>
                      <strong>{p.label}</strong>
                      <p>
                        {p.units} units · {p.sku}
                      </p>
                    </div>
                    <strong>{money(p.sales_sen)}</strong>
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>Invoice register</h2>
                {q.data.invoices.map((d) => (
                  <div className="record-row" key={d.id}>
                    <div>
                      <Link className="text-link" to={`/owner/orders/${d.order_id}`}>
                        {d.display_code}
                      </Link>
                      <p>
                        {money(d.total_sen)} · <Status state={d.state} />
                      </p>
                    </div>
                    {d.state === 'available' ? (
                      <a
                        className="button button-secondary"
                        href={`/api/v1/documents/${d.id}/download`}
                      >
                        Download PDF
                      </a>
                    ) : (
                      <Link to="/owner/automation">Run due jobs</Link>
                    )}
                  </div>
                ))}
                {!q.data.invoices.length ? (
                  <p>Confirm an order to queue an invoice, then Run due jobs in Automation.</p>
                ) : null}
              </section>
            </div>
          </>
        ) : null}
      </QueryState>
    </>
  );
}
type Member = {
  club_member: boolean;
  id: string;
  display_name: string;
  display_code: string;
  preferred_language: string;
  orders: number;
  paid_sen: number;
  consents: Record<string, boolean>;
};
export function Members() {
  const q = useData<{ members: Member[] }>('/owner/members'),
    [search, setSearch] = useState(''),
    [created, setCreated] = useState('');
  const dialog = useRef<HTMLDialogElement>(null),
    members = q.data?.members ?? [];
  const shown = members.filter((m) =>
    `${m.display_name} ${m.display_code}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Members"
        description="A private profile and a dedicated buddy for every customer."
      >
        <Button onClick={() => dialog.current?.showModal()}>
          <Plus size={16} /> Add member
        </Button>
      </PageHeading>
      {created ? (
        <p role="status" className="success-banner">
          {created} was added. Their demo account is available from Switch demo account; optional
          consents start off.
        </p>
      ) : null}
      <section className="panel directory-panel">
        <div className="directory-toolbar">
          <label className="search-input">
            <Search size={17} />
            <span className="sr-only">Find a member</span>
            <input
              placeholder="Search name or member ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="record-count">
            {q.data ? `${shown.length} member${shown.length === 1 ? '' : 's'}` : 'Loading…'}
          </span>
        </div>
        <QueryState query={q}>
          {shown.length ? (
            <div className="table-wrap">
              <table className="directory-table members-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Orders</th>
                    <th>Verified payments</th>
                    <th>Marketing</th>
                    <th>Preference memory</th>
                    <th>
                      <span className="sr-only">Agent</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={m.id}>
                      <td data-label="Member">
                        <div className="member-identity">
                          <span className="small-avatar">
                            {m.display_name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>
                            <strong>{m.display_name}</strong>
                            <small className="cell-detail">
                              {m.display_code} · {m.preferred_language.toUpperCase()} ·{' '}
                              {m.club_member ? 'Club member' : 'Customer account'}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Orders">{m.orders}</td>
                      <td data-label="Verified payments">{money(m.paid_sen)}</td>
                      <td data-label="Marketing">
                        <span className={m.consents.marketing ? 'permission-on' : 'permission-off'}>
                          {m.consents.marketing ? 'Opted in' : 'Not opted in'}
                        </span>
                      </td>
                      <td data-label="Preference memory">
                        {m.consents.preference_memory ? 'Enabled' : 'Off'}
                      </td>
                      <td>
                        <Link className="inline-link" to={`/owner/agents?customer=${m.id}`}>
                          View buddy <ArrowRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Users size={30} />
              <h2>No matching members</h2>
              <p>Search by name or member ID, or add a synthetic member.</p>
              <Button variant="secondary" onClick={() => setSearch('')}>
                Clear search
              </Button>
            </div>
          )}
        </QueryState>
        <div className="directory-footer">
          Membership never grants marketing permission.
          <Link className="inline-link" to="/owner/ethics">
            Privacy controls <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <dialog
        ref={dialog}
        className="form-dialog"
        aria-labelledby="member-dialog-title"
        onKeyDown={containDialogFocus}
      >
        <div className="dialog-heading">
          <h2 id="member-dialog-title">Add a demo member</h2>
          <button
            className="icon-button"
            aria-label="Close member form"
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <MemberForm
          onCreated={(name) => {
            setCreated(name);
            dialog.current?.close();
          }}
        />
      </dialog>
    </>
  );
}
export function BusinessSettings() {
  const q = useData<BusinessProfile>('/business-profile'),
    catalogue = useData<{ items: Product[] }>('/owner/catalogue'),
    knowledge = useData<{
      policy: { id: string };
      entries: { content_en: string; content_bm: string }[];
    }>('/knowledge');
  return (
    <>
      <PageHeading
        title="Business and catalogue"
        description="Configure this workspace for retail, home businesses or booked services. Existing orders retain their original snapshots."
      />
      <QueryState query={q}>
        <QueryState query={knowledge}>
          {q.data && knowledge.data ? (
            <ProfileEditor
              key={`${q.data.version}:${knowledge.data.policy.id}`}
              profile={q.data}
              initialEn={knowledge.data.entries.map((e) => e.content_en).join('\n')}
              initialBm={knowledge.data.entries.map((e) => e.content_bm).join('\n')}
            />
          ) : null}
        </QueryState>
      </QueryState>
      <section className="panel spaced">
        <h2>Products and services</h2>
        <p>
          Add or update any SKU. Publish a new catalogue version; active quotes must be refreshed.
          Set date capacity before accepting orders/bookings.
        </p>
        <QueryState query={catalogue}>
          {catalogue.data ? (
            <CatalogueEditor
              key={catalogue.data.items.map((i) => `${i.sku}:${i.knowledge_version_id}`).join()}
              products={catalogue.data.items}
              knowledgeId={knowledge.data?.policy.id ?? ''}
            />
          ) : null}
        </QueryState>
      </section>
      <MembershipProgram />
    </>
  );
}
function MemberForm({ onCreated }: { onCreated: (name: string) => void }) {
  const action = useAction(),
    [name, setName] = useState(''),
    [language, setLanguage] = useState('en');
  return (
    <section className="member-form">
      <p className="muted">
        Creates a private synthetic account. Marketing and preference memory remain off until the
        customer chooses.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await action.run('/owner/members', { name, language })) {
            onCreated(name.trim());
            setName('');
            action.setNotice(
              'Member created with a private demo account. Choose it from Sign in to start a conversation. Optional consents start disabled.',
            );
          }
        }}
      >
        <div className="field-grid">
          <label>
            Display name
            <input required value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="bm">Bahasa Melayu</option>
            </select>
          </label>
        </div>
        <Button disabled={action.pending}>Create demo member</Button>
      </form>
      <Feedback action={action} />
    </section>
  );
}

export function ProfileEditor({
  profile: p,
  initialEn,
  initialBm,
}: {
  profile: BusinessProfile;
  initialEn: string;
  initialBm: string;
}) {
  const [name, setName] = useState(p.name),
    [slug, setSlug] = useState(p.slug),
    [sector, setSector] = useState(p.sector),
    [fulfilment, setFulfilment] = useState(p.fulfilment),
    [en, setEn] = useState(initialEn),
    [bm, setBm] = useState(initialBm),
    action = useAction();
  return (
    <section className="panel">
      <h2>Business profile</h2>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await action.run('/owner/business-profile', {
              name,
              slug,
              sector,
              fulfilment,
              version: p.version,
              factsEn: en,
              factsBm: bm,
            })
          )
            action.setNotice('Business profile and facts published.');
        }}
      >
        <div className="field-grid">
          <label>
            Business name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Public slug
            <input
              required
              pattern="[a-z0-9-]{3,60}"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <label>
            Industry
            <input
              required
              value={sector}
              maxLength={80}
              placeholder="Retail, tutoring, salon, home bakery…"
              onChange={(e) => setSector(e.target.value)}
            />
          </label>
          <label>
            Fulfilment
            <select
              value={fulfilment}
              onChange={(e) => setFulfilment(e.target.value as typeof fulfilment)}
            >
              <option value="pickup">Collection / pickup</option>
              <option value="delivery">Local delivery</option>
              <option value="appointment">Service appointment</option>
            </select>
          </label>
        </div>
        <label>
          Published business facts — English
          <textarea required value={en} maxLength={3000} onChange={(e) => setEn(e.target.value)} />
        </label>
        <label>
          Published business facts — Bahasa Melayu
          <textarea required value={bm} maxLength={3000} onChange={(e) => setBm(e.target.value)} />
        </label>
        <Button disabled={action.pending}>Save profile and publish facts</Button>
      </form>
      <Feedback action={action} />
    </section>
  );
}
export function CatalogueEditor({
  products,
  knowledgeId,
}: {
  products: Product[];
  knowledgeId: string;
}) {
  const action = useAction(),
    [sku, setSku] = useState(''),
    [label, setLabel] = useState(''),
    [description, setDescription] = useState(''),
    [units, setUnits] = useState('1 unit'),
    [price, setPrice] = useState(1000),
    [kind, setKind] = useState('product'),
    [available, setAvailable] = useState(true);
  const [image, setImage] = useState('parcel');
  return (
    <div className="two-columns">
      <div>
        {products.map((p) => (
          <article className="record-row" key={p.sku}>
            <div>
              <strong>{p.label}</strong>
              <p>
                {p.sku} · {money(p.unit_price_sen)} · {p.kind ?? 'product'}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSku(p.sku);
                setLabel(p.label);
                setDescription(p.description);
                setUnits(p.units_description);
                setPrice(p.unit_price_sen);
                setKind(p.kind ?? 'product');
                setAvailable(p.available ?? true);
                setImage(p.image_key ?? 'parcel');
              }}
            >
              Edit item
            </Button>
          </article>
        ))}
      </div>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await action.run('/owner/products', {
              sku,
              label,
              description,
              unitPriceSen: price,
              unitsDescription: units,
              kind,
              available,
              knowledgeVersionId: knowledgeId,
              imageKey: image,
            })
          )
            action.setNotice(
              'Catalogue item published. Configure its date capacity to enable booking.',
            );
        }}
      >
        <label>
          SKU
          <input
            value={sku}
            pattern="[a-z0-9-]{1,60}"
            required
            onChange={(e) => setSku(e.target.value)}
          />
        </label>
        <label>
          Name
          <input
            value={label}
            required
            maxLength={100}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="product">Product — optional stock tracking</option>
            <option value="service">Service — daily booking capacity</option>
          </select>
        </label>
        <label>
          Description
          <textarea
            value={description}
            required
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Price (sen)
          <input
            type="number"
            min={1}
            max={1000000}
            value={price}
            required
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <label>
          Unit / duration description
          <input
            value={units}
            required
            maxLength={100}
            placeholder="One item / 60-minute appointment"
            onChange={(e) => setUnits(e.target.value)}
          />
        </label>
        <label>
          Catalogue image (illustration)
          <select value={image} onChange={(e) => setImage(e.target.value)}>
            <option value="parcel">General product / parcel</option>
            <option value="brownie">Brownie tray</option>
            <option value="cupcake">Cupcake box</option>
            <option value="flower">Flowers</option>
            <option value="service">Service appointment</option>
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />{' '}
          Available for new quotes
        </label>
        <Button disabled={action.pending || !knowledgeId}>Publish item</Button>
        <Feedback action={action} />
      </form>
    </div>
  );
}
