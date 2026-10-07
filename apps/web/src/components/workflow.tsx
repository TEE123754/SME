import type { ReactNode } from 'react';
import { errorText } from '../lib/api';
import type { useAction } from '../lib/hooks';
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <div aria-live="polite">
      {action.pending ? <p role="status">Saving… Please wait.</p> : null}
      {action.error ? (
        <div className="error-banner" role="alert">
          {errorText(action.error)}
        </div>
      ) : null}
      {action.notice ? (
        <div className="success-banner" role="status">
          {action.notice}
        </div>
      ) : null}
    </div>
  );
}
export function QueryState({
  query,
  children,
}: {
  query: { isPending: boolean; error: unknown };
  children: ReactNode;
}) {
  if (query.isPending) return <p role="status">Loading saved records…</p>;
  if (query.error)
    return (
      <div className="error-banner" role="alert">
        {errorText(query.error)}
      </div>
    );
  return <>{children}</>;
}
const labels: Record<string, string> = {
  awaiting_deposit: 'Awaiting deposit',
  confirmed: 'Confirmed',
  ready: 'Ready',
  completed: 'Completed',
  preparing: 'Order preparing',
  delivering: 'Delivering',
  cancelled: 'Cancelled',
  pending: 'Waiting for owner',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  superseded: 'Replaced',
  held: 'Unpaid hold',
  committed: 'Production booked',
  released: 'Capacity released',
  active: 'Active',
  waiting_owner: 'Waiting for the owner',
  closed: 'Closed',
};
export function Status({ state }: { state: string }) {
  return (
    <span className={`status-badge status-${state}`}>
      {labels[state] ?? state.replaceAll('_', ' ')}
    </span>
  );
}
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
