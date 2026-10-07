export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Your session expired. Sign in again.',
  CSRF_DENIED: 'Sign in again to refresh your session before saving.',
  OWNER_ONLY: 'This action needs an owner session.',
  CUSTOMER_ONLY: 'Sign in as a customer to use this page.',
  NOT_FOUND: 'This record is unavailable in your account.',
  LEAD_TIME_REQUIRED:
    'Choose a pickup after the bakery’s published lead time, measured from demo business time.',
  CAPACITY_UNAVAILABLE:
    'That production date is full. Edit the quote and choose another date or quantity.',
  QUOTE_EXPIRED: 'This quote expired. Prepare a fresh quote.',
  QUOTE_NOT_ACTIVE: 'This quote has already been accepted or replaced. Check your orders.',
  POLICY_CHANGED: 'The bakery published new prices or policies. Prepare a fresh quote.',
  INVALID_CONFIRMATION: 'The confirmation expired. Review the quote and try again.',
  STALE_APPROVAL: 'This review has changed or expired. Refresh the reviews list.',
  STALE_ORDER: 'The order changed. Refresh and review its latest status.',
  STALE_CAPACITY: 'Capacity changed. Refresh before saving.',
  BOOKED_CAPACITY: 'Maximum capacity cannot fall below already booked units.',
  MEMORY_CONSENT_REQUIRED: 'Turn on optional preference memory before saving favourites.',
  OVERPAYMENT_REQUIRES_REVIEW:
    'This amount exceeds the remaining balance. Review the payment amount.',
  BALANCE_REQUIRED: 'Verify the remaining balance before completing this order.',
  PENDING_APPROVAL: 'Review the pending owner case before resuming.',
  EXCEPTION_PAUSED:
    'This order is paused for owner review. Review the case and explicitly resume first.',
  INVALID_INPUT: 'Check the form fields and try again.',
  IDEMPOTENCY_MISMATCH: 'This retry has different details. Refresh and review before submitting.',
  INVALID_TRANSITION: 'This status change is not available for the current order.',
};
export const errorText = (error: unknown) =>
  error instanceof ApiError
    ? (messages[error.code] ??
      `The action was not completed (${error.code}). Refresh and review the details.`)
    : 'Connection interrupted. Check the service status and retry the same action safely.';
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  key?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = sessionStorage.getItem('cb.csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;
    if (key) headers['Idempotency-Key'] = key;
  }
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'same-origin',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const failure = (await response.json().catch(() => ({ code: 'HTTP_ERROR' }))) as {
      code?: string;
    };
    throw new ApiError(failure.code ?? 'HTTP_ERROR', response.status);
  }
  return response.status === 204 ? ({ ok: true } as T) : ((await response.json()) as T);
}
export const money = (sen: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(sen / 100);
export const instant = (value: string) =>
  new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
