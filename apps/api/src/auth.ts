import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { IdentityAdapter, TrustedScope } from '@customerbuddy/contracts';
import type { Pool } from '@customerbuddy/db';

export const sessionCookie = 'cb_session';
export function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

interface ResolvedSession {
  scope: TrustedScope;
  csrfHash: string;
  tokenHash: string;
}

export class LocalDemoIdentity implements IdentityAdapter {
  constructor(private pool: Pool) {}
  async resolveRecord(token: string): Promise<ResolvedSession | null> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const hash = tokenHash(token);
    const result = await this.pool.query<{
      business_id: string;
      customer_id: string | null;
      subject: string;
      role: 'customer' | 'owner';
      csrf_hash: string;
    }>('SELECT * FROM app.resolve_demo_session($1)', [hash]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      scope: {
        businessId: row.business_id,
        customerId: row.customer_id ?? undefined,
        subject: row.subject,
        role: row.role,
      },
      csrfHash: row.csrf_hash,
      tokenHash: hash,
    };
  }
  async resolveSession(token: string): Promise<TrustedScope | null> {
    return (await this.resolveRecord(token))?.scope ?? null;
  }
  async signIn(accountKey: string) {
    const token = randomBytes(32).toString('base64url'),
      csrfToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const result = await this.pool.query<{ created: boolean }>(
      'SELECT app.create_demo_session($1,$2,$3,$4) AS created',
      [accountKey, tokenHash(token), tokenHash(csrfToken), expiresAt],
    );
    return result.rows[0]?.created ? { token, csrfToken, expiresAt } : null;
  }
}

function cookieToken(request: Request): string {
  for (const cookie of (request.get('Cookie') ?? '').split(';')) {
    const [key, ...parts] = cookie.trim().split('=');
    if (key === sessionCookie) return parts.join('=');
  }
  return '';
}

export function requireSession(identity: LocalDemoIdentity) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const session = await identity.resolveRecord(cookieToken(request));
      if (!session) {
        response.status(401).json({ code: 'SIGN_IN_REQUIRED' });
        return;
      }
      response.locals.session = session;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requestScope(response: Response): TrustedScope {
  return (response.locals.session as ResolvedSession).scope;
}

export function requireMutationOrigin(origins: string[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!origins.includes(request.get('Origin') ?? '')) {
      response.status(403).json({ code: 'ORIGIN_REQUIRED' });
      return;
    }
    next();
  };
}

export function requireCsrf(request: Request, response: Response, next: NextFunction) {
  const value = request.get('X-CSRF-Token') ?? '';
  const session = response.locals.session as ResolvedSession;
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(value) ||
    !timingSafeEqual(Buffer.from(tokenHash(value), 'hex'), Buffer.from(session.csrfHash, 'hex'))
  ) {
    response.status(403).json({ code: 'CSRF_REQUIRED' });
    return;
  }
  next();
}

export async function revokeSession(pool: Pool, response: Response) {
  const session = response.locals.session as ResolvedSession;
  await pool.query('SELECT app.revoke_demo_session($1)', [session.tokenHash]);
}
