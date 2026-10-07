import { useState, useEffect, useRef } from 'react';

import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import {
  ArrowRight,
  ChefHat,
  Clock,
  Cookie,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  ShoppingBag,
} from 'lucide-react';

import { assistantDisclosure } from '@customerbuddy/demo-assistant';

import { Button } from './components/ui/button';

import { SystemStatus } from './components/SystemStatus';

import { Access } from './lib/session';
import { useSession } from './lib/session-context';

import { errorText } from './lib/api';

import { SignIn, Preferences } from './pages/Account';

import { CustomerChat, Orders, OrderDetail } from './pages/Customer';

import {
  OwnerOverview,
  OwnerReviews,
  OwnerCustomers,
  OwnerKnowledge,
  OwnerCapacity,
  OwnerEvidence,
} from './pages/Owner';

const navigation = [
  { label: 'Welcome', to: '/b/ainas-home-bakery', icon: ChefHat },

  { label: 'Customer chat', to: '/b/ainas-home-bakery/chat', icon: MessageSquare },

  { label: 'My orders', to: '/account/orders', icon: ShoppingBag },

  { label: 'Preferences', to: '/account/preferences', icon: Settings },

  { label: 'Owner workspace', to: '/owner', icon: LayoutDashboard },
];

function Welcome() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A little less admin. A little more baking.</span>

          <h1>
            A familiar face for
            <br />
            every customer.
          </h1>

          <p>
            Meet CustomerBuddy, Aina's Home Bakery's helpful corner for enquiries, orders and the
            details that matter.
          </p>

          <div className="hero-actions">
            <Button asChild>
              <Link to="/b/ainas-home-bakery/chat">
                Explore customer view
                <ArrowRight size={18} />
              </Link>
            </Button>

            <Button variant="secondary" asChild>
              <Link to="/owner">Open owner workspace</Link>
            </Button>
          </div>

          <p className="fine-print">
            Phase 3 business APIs ready · business screens arrive in Phase 4.
          </p>
        </div>

        <div className="bakery-card" aria-label="Home bakery illustration">
          <div className="card-stamp">
            <ChefHat size={22} /> SMALL BATCH, BIG HEART
          </div>

          <div className="bakery-art" aria-hidden="true">
            <div className="brownie brownie-one" />

            <div className="brownie brownie-two" />

            <div className="brownie brownie-three" />

            <span className="crumb crumb-one" />

            <span className="crumb crumb-two" />
          </div>

          <div className="bakery-card-caption">
            <span>Aina's Home Bakery</span>

            <strong>
              Made with care.
              <br />
              Ordered with clarity.
            </strong>
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="Bakery workflow">
        <article>
          <Cookie size={22} />

          <h2>Pick your favourites</h2>

          <p>Published products and clear pickup details, in one place.</p>

          <span>Ordering · Phases 3–4</span>
        </article>

        <article>
          <HeartHandshake size={22} />

          <h2>Keep the owner close</h2>

          <p>Human review when a request needs a personal touch.</p>

          <span>Owner controls · Phases 3–4</span>
        </article>

        <article>
          <Clock size={22} />

          <h2>Follow up thoughtfully</h2>

          <p>Saved orders, useful documents and carefully timed reminders.</p>

          <span>Local jobs · Phase 5</span>
        </article>
      </section>

      <SystemStatus />
    </>
  );
}

const ownerTitles: Record<string, string> = {
  '/owner': 'Overview',
  '/owner/orders': 'Orders',
  '/owner/reviews': 'Reviews',
  '/owner/customers': 'Customers',

  '/owner/knowledge': 'Knowledge',
  '/owner/capacity': 'Capacity',
  '/owner/automation': 'Automation',
  '/owner/evidence': 'Evidence',
};

function OwnerShell() {
  return (
    <>
      <nav className="owner-tabs" aria-label="Owner sections">
        {Object.entries(ownerTitles).map(([path, title]) => (
          <NavLink key={path} to={path} end>
            {title}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<OwnerOverview />} />
        <Route path="orders" element={<Orders owner />} />
        <Route path="orders/:id" element={<OrderDetail owner />} />
        <Route path="reviews" element={<OwnerReviews />} />
        <Route path="customers" element={<OwnerCustomers />} />
        <Route path="knowledge" element={<OwnerKnowledge />} />
        <Route path="capacity" element={<OwnerCapacity />} />
        <Route path="automation" element={<OwnerEvidence automation />} />
        <Route path="evidence" element={<OwnerEvidence />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function NotFound() {
  return (
    <section className="panel">
      <h1>Page not found</h1>
      <p>Choose a workspace page from the navigation.</p>
      <Link className="button button-secondary" to="/">
        Back to bakery
      </Link>
    </section>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false),
    [accountPending, setAccountPending] = useState(false),
    [accountError, setAccountError] = useState<unknown>(null);

  const session = useSession(),
    { pathname } = useLocation(),
    menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.getElementById('main-content')?.focus();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside id="workspace-navigation" className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Button
          className="close-navigation"
          variant="secondary"
          onClick={() => {
            setMenuOpen(false);
            menuButton.current?.focus();
          }}
        >
          Close navigation
        </Button>
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">
            <ChefHat size={25} />
          </span>
          <span>
            CustomerBuddy<small>BAKERY WORKSPACE</small>
          </span>
        </Link>
        <p className="nav-caption">Your workspace</p>
        <nav aria-label="Main navigation">
          {navigation
            .filter((n) => session.me?.role !== 'owner' || !n.to.startsWith('/account'))
            .map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} end onClick={() => setMenuOpen(false)}>
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-dot" />
          Local synthetic prototype
          <p>
            Saved records and human review.
            <br />
            Scripted replies arrive in Phase 5.
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              ref={menuButton}
              className="mobile-menu"
              aria-label="Toggle navigation"
              aria-controls="workspace-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={22} />
            </button>
            <span>Aina's Home Bakery</span>
          </div>
          <span className="mode-badge">{assistantDisclosure}</span>
          <div className="account-bar">
            <label className="compact-label">
              {session.t('Language', 'Bahasa')}
              <select
                value={session.language}
                disabled={accountPending}
                onChange={async (e) => {
                  setAccountPending(true);
                  setAccountError(null);
                  try {
                    await session.setLanguage(e.target.value as 'en' | 'bm');
                  } catch (error) {
                    setAccountError(error);
                  } finally {
                    setAccountPending(false);
                  }
                }}
              >
                <option value="en">EN</option>
                <option value="bm">BM</option>
              </select>
            </label>
            {session.me ? (
              <>
                <span className="account-name">
                  {session.me.role === 'owner' ? 'Aina · owner' : session.me.profile?.display_name}
                </span>
                <Button
                  variant="secondary"
                  disabled={accountPending}
                  onClick={async () => {
                    setAccountPending(true);
                    setAccountError(null);
                    try {
                      await session.signOut();
                    } catch (error) {
                      setAccountError(error);
                    } finally {
                      setAccountPending(false);
                    }
                  }}
                >
                  {session.t('Sign out', 'Log keluar')}
                </Button>
                <Link className="text-link" to="/sign-in">
                  Switch account
                </Link>
              </>
            ) : (
              <Link className="button button-primary" to="/sign-in">
                {session.t('Sign in', 'Log masuk')}
              </Link>
            )}
          </div>
        </header>
        {accountError ? (
          <p className="error-banner" role="alert">
            {errorText(accountError)}
          </p>
        ) : null}
        <main
          id="main-content"
          tabIndex={-1}
          className="main-content"
          key={`${session.me?.role}:${session.me?.profile?.id ?? 'none'}`}
        >
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/b/:bakerySlug" element={<Welcome />} />
            <Route
              path="/b/:bakerySlug/chat"
              element={
                <Access role="customer">
                  <CustomerChat />
                </Access>
              }
            />
            <Route path="/sign-in" element={<SignIn />} />
            <Route
              path="/account/orders"
              element={
                <Access role="customer">
                  <Orders />
                </Access>
              }
            />
            <Route
              path="/account/orders/:id"
              element={
                <Access role="customer">
                  <OrderDetail />
                </Access>
              }
            />
            <Route
              path="/account/preferences"
              element={
                <Access role="customer">
                  <Preferences />
                </Access>
              }
            />
            <Route
              path="/owner/*"
              element={
                <Access role="owner">
                  <OwnerShell />
                </Access>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer>
          Synthetic demo only <span>·</span> No live AI, real payments or cloud integration
        </footer>
      </div>
    </div>
  );
}
