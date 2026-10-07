import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, errorText } from '../lib/api';
import { useSession } from '../lib/session-context';
import { PageHeading, QueryState, Feedback } from '../components/workflow';
import { Button } from '../components/ui/button';
import { useData, useAction } from '../lib/hooks';
import { cartKey, readCart, saveCart } from '../lib/cart';
export function SignIn() {
  const session = useSession(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const accounts = useQuery({
    queryKey: ['accounts', params.get('business')],
    queryFn: () =>
      api<{ accounts: { account_key: string; label: string; role: string }[] }>(
        `/demo/accounts${params.get('business') ? '?business=' + encodeURIComponent(params.get('business')!) : ''}`,
      ),
    retry: false,
  });
  const [chosen, setChosen] = useState(''),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  const selectedAccount =
    accounts.data?.accounts.find((a) => a.account_key === chosen) ??
    accounts.data?.accounts.find((a) =>
      params.get('next')?.startsWith('/owner') ? a.role === 'owner' : a.account_key === 'farah',
    ) ??
    accounts.data?.accounts.find((a) => a.role === 'customer') ??
    accounts.data?.accounts[0];
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const me = await session.signIn(selectedAccount?.account_key ?? chosen),
        next = params.get('next');
      if (me.role === 'customer') {
        const guest = cartKey(me.business.id),
          target = cartKey(me.business.id, me.profile?.id);
        if (readCart(guest).length && !readCart(target).length) {
          saveCart(target, readCart(guest));
          saveCart(guest, []);
        }
      }
      navigate(
        next?.startsWith('/') &&
          !next.startsWith('//') &&
          ((me.role === 'owner' && next.startsWith('/owner')) ||
            (me.role === 'customer' && !next.startsWith('/owner')))
          ? next
          : me.role === 'owner'
            ? '/owner'
            : `/b/${me.business.slug}`,
      );
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageHeading
        title={session.t('Meet your business buddy', 'Kenali pembantu perniagaan anda')}
        description={session.t(
          'Choose a synthetic account for the local demo. Every account has its own saved records.',
          'Pilih akaun sintetik untuk demo tempatan. Setiap akaun mempunyai rekod tersendiri.',
        )}
      />
      <section className="panel narrow">
        <QueryState query={accounts}>
          <form onSubmit={submit} className="form-stack">
            <label>
              {session.t('Demo account', 'Akaun demo')}
              <select
                value={selectedAccount?.account_key ?? ''}
                onChange={(e) => setChosen(e.target.value)}
              >
                {accounts.data?.accounts.map((a) => (
                  <option key={a.account_key} value={a.account_key}>
                    {a.label} · {a.role}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              Owner access uses the synthetic owner account. No real customer accounts or payments
              are connected.
            </p>
            <Button disabled={pending || !accounts.data}>
              {pending ? 'Signing in…' : session.t('Enter workspace', 'Masuk ruang kerja')}
            </Button>
            {error ? (
              <p role="alert" className="error-banner">
                {errorText(error)}
              </p>
            ) : null}
          </form>
        </QueryState>
      </section>
    </>
  );
}
export function Preferences() {
  const { me, t } = useSession(),
    prefs = useData<{ preferences: { key: string; value: string }[] }>('/me/preferences'),
    catalogue = useData<{ items: import('../lib/types').Product[] }>('/catalogue');
  const action = useAction();
  const [name, setName] = useState(me?.profile?.display_name ?? ''),
    [language, setLanguage] = useState<'en' | 'bm' | undefined>();
  const [favourite, setFavourite] = useState(''),
    [slot, setSlot] = useState('midday'),
    [packaging, setPackaging] = useState('standard');
  const selectedFavourite = catalogue.data?.items.some((p) => p.sku === favourite)
    ? favourite
    : (catalogue.data?.items[0]?.sku ?? '');
  async function savePreference(key: string, value: string) {
    if (await action.run('/me/preferences', { key, value }, 'PATCH'))
      action.setNotice(t('Preference saved.', 'Pilihan disimpan.'));
  }
  return (
    <>
      <PageHeading
        title={t('Your preferences', 'Pilihan anda')}
        description={t(
          'You decide what your business buddy remembers. Consent is separate from ordering.',
          'Anda tentukan perkara yang disimpan. Persetujuan berasingan daripada pesanan.',
        )}
      />
      <div className="two-columns">
        <section className="panel">
          <h2>{t('Your profile', 'Profil anda')}</h2>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await action.run(
                  '/me',
                  {
                    displayName: name.trim(),
                    preferredLanguage: language ?? me?.profile?.preferred_language ?? 'en',
                  },
                  'PATCH',
                )
              ) {
                setLanguage(undefined);
                action.setNotice(t('Profile saved.', 'Profil disimpan.'));
              }
            }}
          >
            <label>
              {t('Display name', 'Nama paparan')}
              <input
                required
                minLength={1}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {t('Language', 'Bahasa')}
              <select
                value={language ?? me?.profile?.preferred_language ?? 'en'}
                onChange={(e) => setLanguage(e.target.value as 'bm' | 'en')}
              >
                <option value="en">English</option>
                <option value="bm">Bahasa Melayu</option>
              </select>
            </label>
            <Button disabled={action.pending}>{t('Save profile', 'Simpan profil')}</Button>
          </form>
        </section>
        <section className="panel">
          <h2>{t('Consent controls', 'Kawalan persetujuan')}</h2>
          {[
            ['preference_memory', 'Remember my favourites', 'Simpan pilihan kegemaran saya'],
            [
              'operational_reminders',
              'In-app order reminders',
              'Peringatan pesanan dalam aplikasi',
            ],
            ['marketing', 'Promotional follow-up', 'Maklumat promosi'],
          ].map(([purpose, en, bm]) => (
            <label className="check-row" key={purpose}>
              <input
                type="checkbox"
                checked={!!me?.consents?.[purpose!]}
                disabled={action.pending}
                onChange={async (e) => {
                  if (await action.run('/me/consents', { purpose, granted: e.target.checked }))
                    action.setNotice(t('Consent updated.', 'Persetujuan dikemas kini.'));
                }}
              />
              <span>
                <strong>{t(en!, bm!)}</strong>
                {purpose === 'preference_memory' ? (
                  <small>
                    {t(
                      'Turning this off deletes optional favourites, not order or payment history.',
                      'Mematikan ini memadam pilihan, bukan rekod pesanan atau bayaran.',
                    )}
                  </small>
                ) : null}
              </span>
            </label>
          ))}
          <p className="muted">
            Reminders and local campaign messages use these saved consent controls. Optional
            marketing can be withdrawn at any time.
          </p>
        </section>
      </div>
      <section className="panel spaced">
        <h2>{t('Optional favourites', 'Pilihan kegemaran')}</h2>
        <QueryState query={prefs}>
          {prefs.data?.preferences.length ? (
            <ul className="saved-list">
              {prefs.data.preferences.map((p) => (
                <li key={p.key}>
                  <span>
                    {p.key.replaceAll('_', ' ')}: <strong>{p.value}</strong>
                  </span>
                  <Button
                    variant="secondary"
                    disabled={action.pending}
                    onClick={async () => {
                      if (await action.run(`/me/preferences/${p.key}`, undefined, 'DELETE'))
                        action.setNotice(t('Preference removed.', 'Pilihan dipadam.'));
                    }}
                  >
                    {t('Remove', 'Padam')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('No optional favourites saved.', 'Tiada pilihan kegemaran disimpan.')}</p>
          )}
        </QueryState>
        <div className="field-grid">
          <div>
            <label>
              {t('Favourite product', 'Produk kegemaran')}
              <select value={selectedFavourite} onChange={(e) => setFavourite(e.target.value)}>
                {catalogue.data?.items.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={action.pending || !me?.consents?.preference_memory || !selectedFavourite}
              onClick={() => savePreference('favourite_product_sku', selectedFavourite)}
            >
              {t('Save favourite', 'Simpan kegemaran')}
            </Button>
          </div>
          <div>
            <label>
              {t('Preferred pickup', 'Pilihan waktu ambil')}
              <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                <option value="midday">12:00–14:00</option>
                <option value="late">16:00–18:00</option>
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={action.pending || !me?.consents?.preference_memory}
              onClick={() => savePreference('pickup_slot_code', slot)}
            >
              {t('Save pickup', 'Simpan waktu ambil')}
            </Button>
          </div>
          <div>
            <label>
              {t('Packaging', 'Pembungkusan')}
              <select value={packaging} onChange={(e) => setPackaging(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="gift">Gift</option>
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={action.pending || !me?.consents?.preference_memory}
              onClick={() => savePreference('packaging', packaging)}
            >
              {t('Save packaging', 'Simpan pembungkusan')}
            </Button>
          </div>
        </div>
        {!me?.consents?.preference_memory ? (
          <p className="notice">
            {t(
              'Turn on preference memory above to save favourites. Ordering is still available without it.',
              'Aktifkan simpanan pilihan di atas untuk menyimpan kegemaran. Anda masih boleh membuat pesanan.',
            )}
          </p>
        ) : null}
      </section>
      <Feedback action={action} />
      <Link className="text-link" to={`/b/${me?.business.slug}/chat`}>
        {t('Back to ordering', 'Kembali ke pesanan')}
      </Link>
    </>
  );
}
