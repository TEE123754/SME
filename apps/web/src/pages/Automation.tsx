import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, useAction } from '../lib/hooks';
import { PageHeading, Feedback, QueryState } from '../components/workflow';
import { Button } from '../components/ui/button';
import { instant, money } from '../lib/api';
export function Automation() {
  const query = useData<{
      clock: { instant: string; paused: boolean };
      automationPaused: boolean;
      jobs: {
        id: string;
        kind: string;
        state: string;
        attempts: number;
        due_at: string;
        last_error: string | null;
      }[];
      digests: {
        id: string;
        created_at: string;
        snapshot_json: {
          orders: number;
          verifiedPaymentSen: number;
          awaitingDeposit: number;
          failedJobs: number;
          remindersDelivered: number;
        };
      }[];
    }>('/owner/demo/jobs'),
    action = useAction(),
    navigate = useNavigate();
  const [hours, setHours] = useState(12),
    [confirmation, setConfirmation] = useState('');
  async function changeClock(mode: string) {
    if (await action.run('/owner/demo/clock', { mode, hours }))
      action.setNotice('Demo clock saved. Run due jobs to process eligible work.');
  }
  return (
    <>
      <PageHeading
        title="Local automation"
        description="Synthetic local jobs and persisted business clock. Scheduler checks every 15 seconds while the API runs; downtime leaves work queued."
      />
      <QueryState query={query}>
        {query.data ? (
          <>
            <section className="panel">
              <h2>Demo business time</h2>
              <p>
                {instant(query.data.clock.instant)} ·{' '}
                {query.data.clock.paused ? 'Paused' : 'Running'}
              </p>
              <p>Quotes, holds and reminders follow this clock. Worker leases use real time.</p>
              <div className="action-row">
                <Button
                  variant="secondary"
                  disabled={action.pending}
                  onClick={() => changeClock('pause')}
                >
                  Pause clock
                </Button>
                <Button
                  variant="secondary"
                  disabled={action.pending}
                  onClick={() => changeClock('resume')}
                >
                  Resume clock
                </Button>
              </div>
              <label>
                Advance by hours
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                />
              </label>
              <Button
                disabled={action.pending || hours < 1 || hours > 168}
                onClick={() => changeClock('advance')}
              >
                Advance clock
              </Button>
            </section>
            <section className="panel spaced">
              <h2>Process guarded work</h2>
              <div className="action-row">
                <Button
                  disabled={action.pending}
                  onClick={async () => {
                    const result = await action.run<{ processed: number }>('/owner/demo/jobs/run');
                    if (result)
                      action.setNotice(
                        `Processed ${result.processed} claimed jobs. Inspect saved states below.`,
                      );
                  }}
                >
                  Run due jobs
                </Button>
                <Button
                  variant="secondary"
                  disabled={action.pending}
                  onClick={async () => {
                    if (await action.run('/owner/demo/digest'))
                      action.setNotice('Digest saved from current records.');
                  }}
                >
                  Generate digest
                </Button>
                <Button
                  variant="secondary"
                  disabled={action.pending}
                  onClick={() =>
                    action.run('/owner/demo/pause', { paused: !query.data?.automationPaused })
                  }
                >
                  {query.data.automationPaused ? 'Resume reminders' : 'Pause reminders'}
                </Button>
              </div>
              <p>
                One eligible deposit reminder per order; consent, payment, expiry, takeover, review
                and pause are rechecked. Delivery window is 09:00–20:00 Malaysia time. No external
                messages.
              </p>
            </section>
            <section className="panel spaced">
              <h2>Saved job states</h2>
              {query.data.jobs.length ? (
                query.data.jobs.map((j) => (
                  <p key={j.id}>
                    {j.kind} · {j.state} · attempt {j.attempts} · due {instant(j.due_at)}{' '}
                    {j.last_error ? `· ${j.last_error}` : ''}
                  </p>
                ))
              ) : (
                <p>No jobs yet.</p>
              )}
            </section>
            <section className="panel spaced">
              <h2>Saved owner digests</h2>
              {query.data.digests.map((d) => (
                <article key={d.id}>
                  <h3>{instant(d.created_at)}</h3>
                  <p>
                    {d.snapshot_json.orders} orders · {money(d.snapshot_json.verifiedPaymentSen)}{' '}
                    verified synthetic payments · {d.snapshot_json.awaitingDeposit} awaiting deposit
                    · {d.snapshot_json.failedJobs} failed jobs ·{' '}
                    {d.snapshot_json.remindersDelivered} delivered reminders
                  </p>
                </article>
              ))}
            </section>
            <section className="panel spaced">
              <h2>Reset synthetic demo</h2>
              <p>
                Restores the local seeded bakery, clock and jobs, removes synthetic changes and
                invalidates sessions. Old private files are archived locally. This never targets an
                external database.
              </p>
              <label>
                Type RESET SYNTHETIC DEMO
                <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
              </label>
              <Button
                variant="secondary"
                disabled={action.pending || confirmation !== 'RESET SYNTHETIC DEMO'}
                onClick={async () => {
                  if (await action.run('/owner/demo/reset', { confirmation })) {
                    sessionStorage.removeItem('cb.csrf');
                    navigate('/sign-in');
                    window.location.reload();
                  }
                }}
              >
                Confirm reset demo
              </Button>
            </section>
          </>
        ) : null}
      </QueryState>
      <Feedback action={action} />
    </>
  );
}
