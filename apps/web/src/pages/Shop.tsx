import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Search, ShoppingBag, Heart, CalendarDays } from 'lucide-react';
import { api, money } from '../lib/api';
import { useSession } from '../lib/session-context';
import { useCart } from '../lib/cart';
import { QueryState } from '../components/workflow';
import { Button } from '../components/ui/button';
import type { Product } from '../lib/types';
import { customerRoute } from '../lib/store-links';
type StoreData = {
  business: { id: string; name: string; slug: string; sector: string; fulfilment: string };
  items: Product[];
};
function useStore() {
  const { me } = useSession(),
    p = useParams(),
    slug = p.bakerySlug ?? me?.business.slug ?? 'ainas-home-bakery';
  return useQuery({
    queryKey: ['store', slug],
    queryFn: () => api<StoreData>(`/stores/${slug}`),
    retry: false,
  });
}
export function ProductImage({ product }: { product: Product }) {
  return (
    <div className={`product-image image-${product.image_key ?? 'parcel'}`}>
      <img
        src={`/images/${product.image_key ?? 'parcel'}.svg`}
        alt={`${product.label} — catalogue illustration`}
        loading="lazy"
      />
      <span>Illustration</span>
    </div>
  );
}
export function Shop() {
  const q = useStore(),
    { me } = useSession(),
    [search, setSearch] = useState(''),
    [kind, setKind] = useState('all'),
    [notice, setNotice] = useState('');
  const b = q.data?.business,
    cart = useCart(
      b?.id ?? 'loading',
      me?.role === 'customer' && me.business.id === b?.id ? me.profile?.id : undefined,
    );
  const products = (q.data?.items ?? []).filter(
    (p) =>
      (kind === 'all' || p.kind === kind) &&
      `${p.label} ${p.description}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <QueryState query={q}>
      {b ? (
        <>
          <section className="shop-hero">
            <div>
              <span className="shop-kicker">
                {b.sector} ·{' '}
                {b.fulfilment === 'appointment' ? 'Book your next visit' : 'Made for your everyday'}
              </span>
              <h1>
                A little local.
                <br />A lot to love.
              </h1>
              <p>
                Welcome to {b.name}. Explore our products and services, choose your favourites and
                plan your next order.
              </p>
              <a className="button button-primary" href="#products">
                Explore the collection <ArrowRight size={17} />
              </a>
            </div>
            <div className="shop-hero-art">
              <span className="hero-art-label">Discover something good</span>
              <img src="/images/parcel.svg" alt="Illustrated shopping parcel" />
              <span className="hero-art-foot">
                <Heart size={18} /> From your local business
              </span>
            </div>
          </section>
          <section className="shop-perk-strip">
            <span>
              <ShoppingBag size={18} /> Clear prices, easy ordering
            </span>
            <span>
              <CalendarDays size={18} /> Choose your date at checkout
            </span>
            <Link to={customerRoute(me, b?.slug, '/account/membership')}>
              <Heart size={18} /> Explore member perks <ArrowRight size={16} />
            </Link>
          </section>
          <section id="products" className="shop-collection">
            <div className="shop-section-title">
              <div>
                <span className="shop-kicker">The collection</span>
                <h2>Find your next favourite</h2>
              </div>
              <label className="shop-search">
                <Search size={18} />
                <span className="sr-only">Search products and services</span>
                <input
                  placeholder="Search the collection"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            <div className="shop-filter-row">
              <div role="group" aria-label="Item type">
                {['all', 'product', 'service'].map((k) => (
                  <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
                    {k === 'all' ? 'All items' : k === 'product' ? 'Products' : 'Services'}
                  </button>
                ))}
              </div>
              <span>
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="shop-cart-notice" role="status">
              {notice}
              {notice ? (
                <Link
                  to={
                    me?.role === 'customer' && me.business.id === b?.id
                      ? '/checkout'
                      : `/sign-in?business=${b?.slug}&next=%2Fcheckout`
                  }
                >
                  View bag →
                </Link>
              ) : null}
            </p>
            <div className="product-grid">
              {products.map((p) => (
                <article className="store-product-card" key={p.sku}>
                  <Link
                    to={`/b/${b.slug}/products/${p.sku}`}
                    className="product-picture-link"
                    aria-label={`View ${p.label}`}
                  >
                    <ProductImage product={p} />
                  </Link>
                  <div className="store-product-card-copy">
                    <span className="shop-kicker">
                      {p.kind === 'service' ? 'Appointment' : 'Product'} · {p.units_description}
                    </span>
                    <Link to={`/b/${b.slug}/products/${p.sku}`}>
                      <h3>{p.label}</h3>
                    </Link>
                    <p>{p.description}</p>
                    <div className="store-product-card-bottom">
                      <strong>{money(p.unit_price_sen)}</strong>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setNotice(
                            cart.add(p.sku)
                              ? `${p.label} added to your bag.`
                              : 'Bag limit reached: 10 item types, 100 units per item.',
                          )
                        }
                      >
                        <ShoppingBag size={16} /> Add to bag
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!products.length ? (
              <div className="shop-empty">
                <h3>
                  {search || kind !== 'all' ? 'No matches yet' : 'The collection is being prepared'}
                </h3>
                <p>
                  {search || kind !== 'all'
                    ? 'Try another search or choose All items.'
                    : 'Check back after the owner publishes products or services.'}
                </p>
                {search || kind !== 'all' ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setKind('all');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>
          <section className="shop-member-banner">
            <div>
              <span className="shop-kicker">A little extra for you</span>
              <h2>Make yourself a member.</h2>
              <p>
                Discover exclusive discounts and choose whether to receive news and offers. Joining
                is optional.
              </p>
            </div>
            <Link
              className="button button-primary"
              to={customerRoute(me, b?.slug, '/account/membership')}
            >
              Explore membership <ArrowRight size={18} />
            </Link>
          </section>
        </>
      ) : null}
    </QueryState>
  );
}
export function ProductDetail() {
  const q = useStore(),
    { sku } = useParams(),
    { me } = useSession(),
    [quantity, setQuantity] = useState(1),
    [notice, setNotice] = useState('');
  const b = q.data?.business,
    p = q.data?.items.find((i) => i.sku === sku),
    cart = useCart(
      b?.id ?? 'loading',
      me?.role === 'customer' && me.business.id === b?.id ? me.profile?.id : undefined,
    );
  return (
    <QueryState query={q}>
      {b && p ? (
        <>
          <Link className="text-link" to={`/b/${b.slug}`}>
            ← Back to collection
          </Link>
          <div className="product-detail">
            <ProductImage product={p} />
            <section>
              <span className="shop-kicker">
                {p.kind === 'service' ? 'Service appointment' : 'The collection'} · {b.name}
              </span>
              <h1>{p.label}</h1>
              <p className="product-detail-price">
                {money(p.unit_price_sen)} <small>/ {p.units_description}</small>
              </p>
              <p>{p.description}</p>
              <div className="product-detail-note">
                <CalendarDays size={20} />
                <p>
                  Choose a date and time at checkout. Availability and your exact price are checked
                  before you confirm.
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice(
                    cart.add(p.sku, quantity)
                      ? `${quantity} × ${p.label} added to your bag.`
                      : 'Bag limit reached: 10 item types, 100 units per item.',
                  );
                }}
              >
                <label>
                  Quantity
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </label>
                <Button>
                  <ShoppingBag size={18} /> Add to bag
                </Button>
              </form>
              <p role="status">{notice}</p>
              <Link
                className="button button-secondary"
                to={
                  me?.role === 'customer' && me.business.id === b?.id
                    ? '/checkout'
                    : `/sign-in?business=${b?.slug}&next=%2Fcheckout`
                }
              >
                Go to checkout <ArrowRight size={17} />
              </Link>
              <Link
                className="product-member-link"
                to={customerRoute(me, b?.slug, '/account/membership')}
              >
                <Heart size={17} /> See member discounts
              </Link>
              <details>
                <summary>How ordering works</summary>
                <p>
                  Add items to your bag, choose a date, review the exact quote and confirm. The
                  owner verifies synthetic deposits. No real payment is collected in this demo.
                </p>
              </details>
            </section>
          </div>
        </>
      ) : b ? (
        <section className="panel">
          <h1>Item unavailable</h1>
          <p>This item is no longer in the published collection.</p>
          <Link to={`/b/${b.slug}`}>Browse current items</Link>
        </section>
      ) : null}
    </QueryState>
  );
}
