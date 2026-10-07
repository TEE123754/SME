import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, Tag, Check } from 'lucide-react';
import { useData, useAction } from '../lib/hooks';
import { useSession } from '../lib/session-context';
import { QueryState, Feedback } from '../components/workflow';
import { Button } from '../components/ui/button';
export type MembershipData = {
  program: { enabled: boolean; basisPoints: number; version: number };
  effectiveBasisPoints: number;
  membership: { active: boolean; version: number; joined_at: string } | null;
};
export function Membership() {
  const q = useData<MembershipData>('/membership'),
    { me, refresh } = useSession(),
    action = useAction();
  const active = q.data?.membership?.active,
    newsletter = me?.consents?.marketing ?? false;
  return (
    <>
      <section className="membership-hero">
        <span className="shop-kicker">{me?.business.name} · Members club</span>
        <Heart size={38} />
        <h1>
          A little extra.
          <br />
          Just for members.
        </h1>
        <p>Join for discounts on new orders. Keep news and offers on your terms.</p>
      </section>
      <QueryState query={q}>
        {q.data ? (
          <>
            <div className="membership-perks">
              <article>
                <Tag size={25} />
                <h2>{q.data.effectiveBasisPoints / 100}% member discount</h2>
                <p>
                  {q.data.program.enabled
                    ? 'Applied automatically to eligible new quotes while your membership is active.'
                    : 'The owner has paused the programme.'}
                </p>
              </article>
              <article>
                <Mail size={25} />
                <h2>News, when you want it</h2>
                <p>
                  Opt in separately for product news and offers in My updates. This demo delivers to
                  your local inbox.
                </p>
              </article>
              <article>
                <Check size={25} />
                <h2>You stay in control</h2>
                <p>Free to join and leave. You can shop without joining or subscribing.</p>
              </article>
            </div>
            <div className="membership-controls">
              <section className="panel">
                <h2>{active ? 'You’re a member' : 'Join the members club'}</h2>
                <p>
                  {active
                    ? 'Your member pricing is available at checkout.'
                    : 'No fee. No newsletter subscription required.'}
                </p>
                <Button
                  disabled={action.pending || (!active && !q.data.program.enabled)}
                  variant={active ? 'secondary' : 'primary'}
                  onClick={async () => {
                    if (await action.run('/membership', { active: !active }))
                      action.setNotice(
                        active
                          ? 'Membership ended. Newsletter preference is unchanged.'
                          : 'Membership saved. Review a new quote to apply your discount.',
                      );
                  }}
                >
                  {active ? 'Leave membership' : 'Join membership'}
                </Button>
                <p className="fine-print spaced">
                  Discounts use whole-sen rounding per unit, do not stack with individually approved
                  promotions, and are checked again when you confirm. Existing orders keep their
                  saved prices.
                </p>
              </section>
              <section className="panel">
                <h2>Newsletter & offers</h2>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={newsletter}
                    disabled={action.pending}
                    onChange={async (e) => {
                      const granted = e.target.checked;
                      if (
                        await action.run('/me/consents', { purpose: 'marketing', granted }, 'POST')
                      ) {
                        await refresh();
                        action.setNotice(
                          granted
                            ? 'Newsletter enabled for the local inbox.'
                            : 'Newsletter disabled. Membership is unchanged.',
                        );
                      }
                    }}
                  />{' '}
                  Send me business news and offers
                </label>
                <p className="muted spaced">
                  Optional marketing consent. Joining or leaving the club never changes this choice.
                </p>
                <Link className="text-link" to="/account/inbox">
                  Read my updates →
                </Link>
                <p>
                  <Link className="text-link" to="/account/preferences">
                    Manage all privacy preferences
                  </Link>
                </p>
              </section>
            </div>
            <Feedback action={action} />
            <Link className="button button-primary" to={`/b/${me?.business.slug}`}>
              Continue shopping
            </Link>
          </>
        ) : null}
      </QueryState>
    </>
  );
}
export function MembershipProgram() {
  const q = useData<MembershipData>('/membership');
  return (
    <QueryState query={q}>
      {q.data ? <ProgramEditor key={q.data.program.version} data={q.data} /> : null}
    </QueryState>
  );
}
function ProgramEditor({ data }: { data: MembershipData }) {
  const [enabled, setEnabled] = useState(data.program.enabled),
    [percent, setPercent] = useState(data.program.basisPoints / 100),
    action = useAction();
  return (
    <section className="panel spaced">
      <h2>Customer member perks</h2>
      <p>Customers explicitly join this optional club. Newsletter consent remains separate.</p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await action.run('/owner/membership-program', {
              enabled,
              basisPoints: Math.round(percent * 100),
              version: data.program.version,
            })
          )
            action.setNotice('Member programme saved. Existing orders keep their prices.');
        }}
      >
        <label className="check-label">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />{' '}
          Offer membership
        </label>
        <label>
          Member discount (%)
          <input
            type="number"
            min={0}
            max={15}
            step={0.01}
            required
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
        </label>
        <p className="fine-print">
          Up to 15%, further bounded by your Ethics discount limit. New member quotes only; no
          stacking with individually approved discounts.
        </p>
        <Button disabled={action.pending}>Save member programme</Button>
        <Feedback action={action} />
      </form>
    </section>
  );
}
