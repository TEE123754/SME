import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Layers3,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  LogOut,
} from 'lucide-react';
import { assistantDisclosure } from '@customerbuddy/demo-assistant';
import { useSession } from '../lib/session-context';
import { errorText } from '../lib/api';
import { containDialogFocus } from './dialog-focus';
import { ownerPages, customerPages, currentPage, type WorkspacePage } from '../lib/navigation';

function Navigation({ pages, close }: { pages: WorkspacePage[]; close: () => void }) {
  const { pathname } = useLocation();
  const groups = [...new Set(pages.map((p) => p.group))];
  return (
    <nav aria-label="Main navigation" className="workspace-nav">
      {groups.map((group) => {
        const links = pages.filter((p) => p.group === group);
        const list = (
          <div className="nav-links">
            {links.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} end={path === '/owner'} onClick={close}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        );
        return group === 'Settings' ? (
          <details
            className="nav-settings"
            key={group}
            open={links.some((p) => pathname.startsWith(p.path)) || undefined}
          >
            <summary>
              <span>Settings & tools</span>
              <ChevronDown size={15} />
            </summary>
            {list}
          </details>
        ) : (
          <section className="nav-group" key={group}>
            <p>{group}</p>
            {list}
          </section>
        );
      })}
    </nav>
  );
}

function Brand({ close }: { close: () => void }) {
  return (
    <Link to="/" className="brand" onClick={close}>
      <span className="brand-mark">
        <Layers3 size={22} />
      </span>
      <span>
        BizBuddy<small>YOUR BUSINESS, CONNECTED</small>
      </span>
    </Link>
  );
}

function PageSearch({ pages }: { pages: WorkspacePage[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!dialog.current?.open) dialog.current?.showModal();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  const matches = pages.filter((p) =>
    `${p.label} ${p.group} ${p.keywords ?? ''}`.toLowerCase().includes(query.toLowerCase().trim()),
  );
  return (
    <>
      <button
        className="page-search-trigger"
        aria-label="Search pages"
        onClick={() => {
          setQuery('');
          dialog.current?.showModal();
          input.current?.focus();
        }}
      >
        <Search size={17} />
        <span>Search pages</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        className="page-search-dialog"
        aria-labelledby="search-title"
        onKeyDown={containDialogFocus}
      >
        <div className="dialog-heading">
          <h2 id="search-title">Find a page</h2>
          <button
            className="icon-button"
            aria-label="Close page search"
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </button>
        </div>
        <label className="search-input">
          <Search size={18} />
          <span className="sr-only">Search workspace pages</span>
          <input
            ref={input}
            placeholder="Orders, stock, content…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="page-search-results">
          {matches.map(({ path, label, group, icon: Icon }) => (
            <Link key={path} to={path} onClick={() => dialog.current?.close()}>
              <Icon size={19} />
              <span>
                {label}
                <small>{group}</small>
              </span>
              <ChevronRight size={17} />
            </Link>
          ))}
          {!matches.length ? (
            <p className="empty-copy">No pages found. Try “orders” or “members”.</p>
          ) : null}
        </div>
        <p className="search-help">Tab to a result, Enter to open · Esc to close</p>
      </dialog>
    </>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const session = useSession(),
    { pathname } = useLocation();
  const owner = session.me?.role === 'owner';
  const businessBase = pathname.match(/^\/b\/[^/]+/)?.[0] ?? '/b/customerbuddy';
  const pages = owner
    ? ownerPages
    : customerPages.map((p) => ({ ...p, path: p.path.replace('/b/customerbuddy', businessBase) }));
  const mobile = useRef<HTMLDialogElement>(null);
  const account = useRef<HTMLDetailsElement>(null);
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  const page = currentPage(pages, pathname);
  const closeNavigation = () => mobile.current?.close();
  useEffect(() => {
    document.title = `BizBuddy · ${session.me?.business.name ?? 'Business workspace'}`;
  }, [session.me?.business.name]);
  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  const disclosure = (
    <div className="sidebar-disclosure">
      <span className="demo-dot" /> <span>{assistantDisclosure}</span>
      <small>Synthetic accounts & payments</small>
    </div>
  );
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand close={closeNavigation} />
        <Navigation pages={pages} close={closeNavigation} />
        {owner ? (
          <Link
            className="preview-link"
            to={`/sign-in?business=${session.me?.business.slug}&next=%2Fcheckout`}
          >
            Customer demo <ArrowUpRight size={16} />
          </Link>
        ) : (
          <Link className="preview-link" to="/sign-in?next=/owner">
            Owner workspace <ArrowUpRight size={16} />
          </Link>
        )}
        {disclosure}
      </aside>
      <dialog
        ref={mobile}
        id="mobile-navigation"
        className="mobile-nav-dialog"
        onKeyDown={containDialogFocus}
        aria-label="Workspace navigation"
      >
        <div className="drawer-brand">
          <Brand close={closeNavigation} />
          <button className="icon-button" aria-label="Close navigation" onClick={closeNavigation}>
            <X size={20} />
          </button>
        </div>
        <Navigation pages={pages} close={closeNavigation} />
        {disclosure}
      </dialog>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-controls="mobile-navigation"
              onClick={() => mobile.current?.showModal()}
            >
              <Menu size={21} />
            </button>
            <div className="workspace-context">
              <span>{session.me?.business.name ?? 'Small business workspace'}</span>
              <small>
                <span className="workspace-role">
                  {owner ? 'Owner workspace' : 'Customer workspace'}
                </span>
                <ChevronRight size={12} />
                <span className="workspace-page">
                  {page?.label ?? (pathname === '/sign-in' ? 'Sign in' : 'Welcome')}
                </span>
              </small>
            </div>
          </div>
          <div className="header-actions">
            <PageSearch pages={pages} />
            <label className="header-language">
              <span className="sr-only">{session.t('Language', 'Bahasa')}</span>
              <select
                value={session.language}
                disabled={pending}
                onChange={async (e) => {
                  setPending(true);
                  setError(null);
                  try {
                    await session.setLanguage(e.target.value as 'en' | 'bm');
                  } catch (e) {
                    setError(e);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <option value="en">EN</option>
                <option value="bm">BM</option>
              </select>
            </label>
            {session.me ? (
              <details ref={account} className="account-menu">
                <summary>
                  <span className="account-avatar">
                    {owner ? 'OW' : session.me.profile?.display_name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="account-label">
                    {owner ? 'Owner' : session.me.profile?.display_name}
                  </span>
                  <ChevronDown size={14} />
                </summary>
                <div className="account-popover">
                  <p>
                    {owner ? 'Business owner' : session.me.profile?.display_name}
                    <small>Synthetic demo account</small>
                  </p>
                  <Link
                    to="/sign-in"
                    onClick={() => {
                      if (account.current) account.current.open = false;
                    }}
                  >
                    Switch demo account <ArrowUpRight size={15} />
                  </Link>
                  <button
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      setError(null);
                      try {
                        await session.signOut();
                        if (account.current) account.current.open = false;
                      } catch (e) {
                        setError(e);
                      } finally {
                        setPending(false);
                      }
                    }}
                  >
                    <LogOut size={16} />
                    {session.t('Sign out', 'Log keluar')}
                  </button>
                </div>
              </details>
            ) : (
              <Link className="button button-primary" to="/sign-in">
                {session.t('Sign in', 'Log masuk')}
              </Link>
            )}
          </div>
        </header>
        {error ? (
          <p role="alert" className="error-banner">
            {errorText(error)}
          </p>
        ) : null}
        <main
          id="main-content"
          tabIndex={-1}
          className="main-content"
          key={`${session.me?.role}:${session.me?.profile?.id ?? 'none'}`}
        >
          {children}
        </main>
        <footer>
          {assistantDisclosure} <span>·</span> Synthetic records and payments
        </footer>
      </div>
    </div>
  );
}
