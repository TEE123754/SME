import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Heart, Package, MessageCircle, Store, ArrowUpRight } from 'lucide-react';
import { useSession } from '../lib/session-context';
import { useCart } from '../lib/cart';
import { useQuery } from '@tanstack/react-query';
import { api, errorText } from '../lib/api';
import { customerRoute } from '../lib/store-links';
export function StoreLayout({ children }: { children: ReactNode }) {
  const { me, t, signOut } = useSession(),
    { pathname } = useLocation(),
    main = useRef<HTMLElement>(null);
  const [params] = useSearchParams();
  const [signOutPending, setSignOutPending] = useState(false),
    [signOutError, setSignOutError] = useState<unknown>(null);
  const slug =
    pathname.match(/^\/b\/([^/]+)/)?.[1] ??
    params.get('business') ??
    me?.business.slug ??
    'ainas-home-bakery';
  const store = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api<{ business: { id: string; name: string; slug: string } }>(`/stores/${slug}`),
    retry: false,
  });
  const base = `/b/${slug}`,
    cart = useCart(
      store.data?.business.id ?? me?.business.id ?? slug,
      me?.role === 'customer' && me.business.slug === slug ? me.profile?.id : undefined,
    );
  const bagTo =
    me?.role === 'customer' && me.business.slug === slug
      ? '/checkout'
      : `/sign-in?business=${slug}&next=%2Fcheckout`;
  const count = cart.items.reduce((n, i) => n + i.quantity, 0);
  useEffect(() => {
    document.title =
      pathname === '/'
        ? 'BizBuddy · Set up your business'
        : `BizBuddy · ${store.data?.business.name ?? 'Shop'}`;
  }, [pathname, store.data?.business.name]);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  const links = [
    { to: base, label: t('Shop', 'Kedai'), icon: Store },
    {
      to: customerRoute(me, slug, '/account/membership'),
      label: t('Members', 'Ahli'),
      icon: Heart,
    },
    {
      to: customerRoute(me, slug, '/account/orders'),
      label: t('Orders', 'Pesanan'),
      icon: Package,
    },
    {
      to: customerRoute(me, slug, `${base}/chat`),
      label: t('Help', 'Bantuan'),
      icon: MessageCircle,
    },
  ];
  return (
    <div className="store-layout">
      <a className="skip-link" href="#shop-main">
        Skip to content
      </a>
      <div className="store-announcement">
        Local shopping demo · Synthetic accounts and payments
      </div>
      <header className="store-header">
        <Link to={base} className="store-brand">
          <Store size={26} />
          <span>
            {pathname === '/' || pathname === '/start-business'
              ? 'BizBuddy'
              : (store.data?.business.name ?? 'BizBuddy')}
            <small>Your neighbourhood, online</small>
          </span>
        </Link>
        <nav aria-label="Shopping navigation">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end>
              <l.icon size={17} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="store-header-actions">
          <Link className="store-bag" to={bagTo} aria-label={`Shopping bag, ${count} items`}>
            <ShoppingBag size={22} />
            <span>{count}</span>
          </Link>
          <Link
            className="store-account"
            to={`/sign-in?business=${slug}&next=${encodeURIComponent(base)}`}
          >
            {me?.profile?.display_name ?? 'Sign in'}
          </Link>
        </div>
      </header>
      <main id="shop-main" ref={main} tabIndex={-1} className="store-main">
        {children}
      </main>
      <footer className="store-footer">
        <div>
          <Link to="/">
            BizBuddy <ArrowUpRight size={14} />
          </Link>
          <p>Demo assistant — scripted responses</p>
          {signOutError ? <p role="alert">{errorText(signOutError)}</p> : null}
        </div>
        <div>
          <Link to={customerRoute(me, slug, '/account/preferences')}>Privacy & preferences</Link>
          <Link to={customerRoute(me, slug, '/account/inbox')}>My updates</Link>
          <Link to={`/sign-in?business=${slug}&next=%2Fowner`}>Owner workspace</Link>
          {me ? (
            <button
              className="store-sign-out"
              disabled={signOutPending}
              onClick={async () => {
                setSignOutPending(true);
                setSignOutError(null);
                try {
                  await signOut();
                } catch (error) {
                  setSignOutError(error);
                } finally {
                  setSignOutPending(false);
                }
              }}
            >
              {signOutPending ? 'Signing out…' : 'Sign out'}
            </button>
          ) : null}
        </div>
      </footer>
      <nav className="store-bottom-nav" aria-label="Mobile shopping navigation">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end>
            <l.icon size={20} />
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
