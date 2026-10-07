import { useQuery } from '@tanstack/react-query';
import { healthSchema } from '@customerbuddy/contracts';
import { RefreshCw, Server, Database } from 'lucide-react';
import { Button } from './ui/button';

async function loadHealth() {
  const response = await fetch('/api/v1/health', { signal: AbortSignal.timeout(5_000) });
  const payload = healthSchema.parse(await response.json());
  if (!response.ok && response.status !== 503) throw new Error('Health request failed');
  return payload;
}

export function SystemStatus() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: loadHealth,
    retry: false,
    staleTime: 30_000,
  });
  const connected = query.data?.database === 'connected';
  return (
    <section className="panel system-status" aria-labelledby="system-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Live connection</span>
          <h2 id="system-heading">Your local workspace</h2>
        </div>
        <Button
          variant="secondary"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Refresh system status"
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>
      <div className="status-grid" aria-live="polite">
        <div>
          <Server size={20} />
          <span>Application API</span>
          <strong>
            {query.isPending ? 'Connecting…' : query.isError ? 'Unavailable' : 'Online'}
          </strong>
        </div>
        <div>
          <Database size={20} />
          <span>Local PostgreSQL</span>
          <strong>
            {query.isPending ? 'Connecting…' : connected ? 'Connected' : 'Unavailable'}
          </strong>
        </div>
      </div>
      {query.isError || (query.data && !connected) ? (
        <p className="error-text">
          The local services need attention. Start PostgreSQL and the API, then refresh.
        </p>
      ) : null}
      <p className="fine-print">
        This status comes from the API and a real database query. Customer and owner screens save
        real synthetic records; scripted replies and private document workers are active.
      </p>
    </section>
  );
}
