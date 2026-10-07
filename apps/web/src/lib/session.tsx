import { useState, type ReactNode } from 'react';
import { Context, useSession } from './session-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, ApiError } from './api';
import type { Me } from './types';
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient(),
    [localLanguage, setLocalLanguage] = useState<'en' | 'bm'>(() =>
      sessionStorage.getItem('cb.language') === 'bm' ? 'bm' : 'en',
    );
  const query = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        return await api<Me>('/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 15000,
  });
  const me = query.data ?? null,
    language = me?.profile?.preferred_language ?? localLanguage;
  async function signIn(accountKey: string) {
    const response = await api<{ csrfToken: string }>('/demo/sessions', 'POST', { accountKey });
    sessionStorage.setItem('cb.csrf', response.csrfToken);
    await client.cancelQueries();
    client.removeQueries({ queryKey: ['data'] });
    const current = await api<Me>('/me');
    client.setQueryData(['session'], current);
    return current;
  }
  async function signOut() {
    await api('/demo/sessions', 'DELETE');
    sessionStorage.removeItem('cb.csrf');
    await client.cancelQueries();
    client.removeQueries({ queryKey: ['data'] });
    client.setQueryData(['session'], null);
  }
  async function setLanguage(next: 'en' | 'bm') {
    if (me?.role === 'customer') {
      await api('/me', 'PATCH', { preferredLanguage: next });
      await query.refetch();
    }
    setLocalLanguage(next);
    sessionStorage.setItem('cb.language', next);
  }
  return (
    <Context.Provider
      value={{
        me,
        loading: query.isPending,
        error: query.error,
        refresh: query.refetch,
        signIn,
        signOut,
        language,
        setLanguage,
        t: (en, bm) => (language === 'bm' ? bm : en),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function Access({ role, children }: { role: 'owner' | 'customer'; children: ReactNode }) {
  const { me, loading, error, t } = useSession();
  if (loading) return <p role="status">{t('Loading your session…', 'Memuatkan sesi anda…')}</p>;
  if (error)
    return (
      <div className="error-banner" role="alert">
        Unable to reach your session. Check the local API and refresh.
      </div>
    );
  if (!me || me.role !== role)
    return (
      <section className="panel">
        <h1>
          {t(
            role === 'owner' ? 'Owner workspace' : 'Your shopping account',
            role === 'owner' ? 'Ruang pemilik' : 'Akaun bakeri anda',
          )}
        </h1>
        <p>
          {t(
            `Sign in as a ${role} to continue.`,
            `Log masuk sebagai ${role === 'owner' ? 'pemilik' : 'pelanggan'} untuk teruskan.`,
          )}
        </p>
        <Link
          className="button button-primary"
          to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}
        >
          {t('Choose a demo account', 'Pilih akaun demo')}
        </Link>
      </section>
    );
  return <div key={`${me.business.id}:${me.role}:${me.profile?.id ?? 'owner'}`}>{children}</div>;
}
