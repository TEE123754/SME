import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Store, Package, CalendarDays, Eye, HeartHandshake } from 'lucide-react';
import { useSession } from '../lib/session-context';
import { useData, useAction } from '../lib/hooks';
import { PageHeading, QueryState, Feedback } from '../components/workflow';
import { Button } from '../components/ui/button';
import { BusinessSettings } from './Business';
import { OwnerKnowledge, OwnerCapacity } from './Owner';
import { SystemStatus } from '../components/SystemStatus';
import { errorText } from '../lib/api';
export type SetupData = {
  business: { id: string; name: string; slug: string };
  profileComplete: boolean;
  productCount: number;
  capacityProductCount: number;
  ready: boolean;
};
export function Landing() {
  const { me } = useSession();
  return (
    <>
      <section className="landing-hero">
        <div>
          <span className="shop-kicker">BizBuddy · Small business, less busywork</span>
          <h1>
            Your business.
            <br />
            Ready for its
            <br />
            <em>next chapter.</em>
          </h1>
          <p>
            Bring your products, customers and orders together. Start with your business details,
            then build a storefront your customers can shop.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/start-business">
              Set up my business <ArrowRight size={18} />
            </Link>
            <Link
              className="button button-secondary"
              to={me?.role === 'owner' ? '/owner/setup' : '/sign-in?next=%2Fowner%2Fsetup'}
            >
              Continue owner setup
            </Link>
          </div>
          <p className="fine-print">Local reference prototype · Synthetic accounts and payments</p>
        </div>
        <div className="landing-setup-preview">
          <span className="shop-kicker">A guided start</span>
          <h2>
            From idea to
            <br />
            open for orders.
          </h2>
          {[
            { icon: Store, title: 'Make it yours', body: 'Business details and fulfilment' },
            {
              icon: Package,
              title: 'Build your collection',
              body: 'Products, services and member perks',
            },
            {
              icon: CalendarDays,
              title: 'Set your availability',
              body: 'Policies, dates and capacity',
            },
            { icon: Eye, title: 'Preview your storefront', body: 'Check the customer experience' },
          ].map((s, i) => (
            <div className="landing-step" key={s.title}>
              <span>{i + 1}</span>
              <div>
                <h3>
                  <s.icon size={17} />
                  {s.title}
                </h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="landing-workflow">
        <span className="shop-kicker">For new owners</span>
        <h2>One clear step at a time.</h2>
        <div className="landing-step-grid">
          {[
            'Create a demo business',
            'Add products or services',
            'Set policies & availability',
            'Preview & start taking orders',
          ].map((s, i) => (
            <article key={s}>
              <span>0{i + 1}</span>
              <h3>{s}</h3>
              <p>
                {
                  [
                    'A separate workspace for your business. No setup keys required.',
                    'Publish images, descriptions and prices customers can browse.',
                    'Set lead time, deposit rules and date capacity before bookings.',
                    'Review your saved setup, then share the local storefront.',
                  ][i]
                }
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="shop-member-banner">
        <div>
          <HeartHandshake size={28} />
          <h2>Here to shop?</h2>
          <p>Explore Aina’s demo collection, join the members club and follow your orders.</p>
        </div>
        <Link className="button button-secondary" to="/b/ainas-home-bakery">
          Explore demo shop <ArrowRight size={18} />
        </Link>
      </section>
      <details className="panel diagnostic-disclosure spaced">
        <summary>Local demo status</summary>
        <SystemStatus />
      </details>
    </>
  );
}
export function StartBusiness() {
  const [name, setName] = useState(''),
    [slug, setSlug] = useState(''),
    [slugEdited, setSlugEdited] = useState(false),
    [sector, setSector] = useState('Retail'),
    [fulfilment, setFulfilment] = useState('pickup'),
    [accepted, setAccepted] = useState(false),
    [signInError, setSignInError] = useState<unknown>(null),
    requestId = useRef(crypto.randomUUID()),
    action = useAction(),
    session = useSession(),
    navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Let’s set up your business"
        description="Create a separate synthetic workspace, then add your collection and availability."
      />
      <section className="panel narrow">
        <p className="notice">
          This creates a local demo owner and shopper. Production registration and real
          authentication belong to the independent WorkBuddy rebuild.
        </p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await action.run<{ ownerKey: string; customerKey: string }>(
              '/demo/businesses',
              { requestId: requestId.current, name, slug, sector, fulfilment, synthetic: true },
            );
            if (r) {
              try {
                await session.signIn(r.ownerKey);
                navigate('/owner/setup');
              } catch (error) {
                setSignInError(error);
              }
            }
          }}
        >
          <label>
            Business name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited)
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, ''),
                  );
              }}
            />
          </label>
          <label>
            Store address
            <input
              required
              pattern="[a-z0-9-]{3,60}"
              maxLength={60}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
            />
            <small>/b/{slug || 'your-business'}</small>
          </label>
          <label>
            Industry
            <input
              required
              maxLength={80}
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          </label>
          <label>
            How customers receive their order
            <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}>
              <option value="pickup">Collection / pickup</option>
              <option value="delivery">Local delivery</option>
              <option value="appointment">Service appointment</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />{' '}
            I’m creating a synthetic demo business.
          </label>
          <Button disabled={action.pending || !accepted}>
            {action.pending ? 'Creating…' : 'Create business & continue'}
            <ArrowRight size={17} />
          </Button>
          <Feedback action={action} />
          {signInError ? (
            <p className="error-banner" role="alert">
              Business created. {errorText(signInError)} Choose its saved owner account to continue.
            </p>
          ) : null}
        </form>
        <p>
          <Link to="/sign-in?next=%2Fowner%2Fsetup">
            Already have a demo business? Continue setup
          </Link>
        </p>
      </section>
    </>
  );
}
export function OwnerSetup() {
  const q = useData<SetupData>('/owner/setup'),
    knowledge = useData<{ policy: { id: string } | null }>('/knowledge'),
    [params, setParams] = useSearchParams(),
    step = Number(params.get('step') ?? 1),
    current = [1, 2, 3, 4].includes(step) ? step : 1;
  const data = q.data,
    completed = [
      !!data?.profileComplete && (data?.productCount ?? 0) > 0,
      !!knowledge.data?.policy,
      !!data?.ready,
      !!data?.ready,
    ];
  return (
    <>
      <PageHeading
        title="Set up your business"
        description="Your changes are saved by each form. Return here any time to see what’s ready."
      />
      <QueryState query={q}>
        <ol className="setup-stepper">
          {['Business & collection', 'Policies', 'Availability', 'Preview & finish'].map(
            (label, i) => (
              <li key={label}>
                <button
                  aria-current={current === i + 1 ? 'step' : undefined}
                  onClick={() => setParams({ step: String(i + 1) })}
                >
                  <span>{completed[i] ? <Check size={16} /> : i + 1}</span>
                  {label}
                </button>
              </li>
            ),
          )}
        </ol>
        <div className="setup-status">
          <span>
            {data?.profileComplete ? '✓ Business facts published' : 'Business facts needed'}
          </span>
          <span>{data?.productCount ?? 0} published items</span>
          <span>{data?.capacityProductCount ?? 0} items with future available capacity</span>
        </div>
        {current === 1 ? (
          <BusinessSettings />
        ) : current === 2 ? (
          <OwnerKnowledge />
        ) : current === 3 ? (
          <OwnerCapacity />
        ) : (
          <section className="panel">
            <h2>
              {data?.ready ? 'Your saved setup is ready' : 'A few things still need attention'}
            </h2>
            <p>
              Readiness comes from published business facts, available catalogue items and future
              capacity that meets your lead time. It doesn’t reserve stock or create orders.
            </p>
            <ul>
              {!data?.profileComplete ? (
                <li>Publish your business facts in Business & collection.</li>
              ) : null}
              {!data?.productCount ? <li>Add at least one available product or service.</li> : null}
              {!data?.ready ? (
                <li>Set future date capacity for every available item in Availability.</li>
              ) : null}
            </ul>
            <div className="hero-actions">
              <Link className="button button-secondary" to={`/b/${data?.business.slug}`}>
                Preview customer storefront <Eye size={17} />
              </Link>
              {data?.ready ? (
                <Link className="button button-primary" to="/owner">
                  Open owner dashboard <ArrowRight size={17} />
                </Link>
              ) : (
                <Button onClick={() => setParams({ step: '1' })}>Continue setup</Button>
              )}
            </div>
            <p className="fine-print spaced">
              Storefront browsing works without sign-in. To place a test order, choose this
              business’s synthetic shopper on the sign-in page.
            </p>
          </section>
        )}
        <div className="setup-footer">
          {current > 1 ? (
            <Button variant="secondary" onClick={() => setParams({ step: String(current - 1) })}>
              Back
            </Button>
          ) : (
            <Link to="/owner">Return to dashboard</Link>
          )}
          {current < 4 ? (
            <Button onClick={() => setParams({ step: String(current + 1) })}>
              Next: {['', 'Policies', 'Availability', 'Preview'][current]} <ArrowRight size={16} />
            </Button>
          ) : null}
        </div>
      </QueryState>
    </>
  );
}
export function SetupChecklist() {
  const q = useData<SetupData>('/owner/setup');
  return q.data ? (
    <section className="panel setup-summary">
      <div>
        <span className="eyebrow">Business setup</span>
        <h2>{q.data.ready ? 'Your storefront is ready' : 'Finish setting up your business'}</h2>
        <p>
          {q.data.productCount} published items · {q.data.capacityProductCount} with eligible future
          capacity
        </p>
      </div>
      <Link className="button button-secondary" to="/owner/setup">
        {q.data.ready ? 'Review setup' : 'Continue setup'} <ArrowRight size={16} />
      </Link>
    </section>
  ) : null;
}
