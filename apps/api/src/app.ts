import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import {
  healthSchema,
  demoSignInSchema,
  profileChangeSchema,
  consentChangeSchema,
  preferenceChangeSchema,
  preferenceKeySchema,
} from '@customerbuddy/contracts';
import { databaseReady, createRepositories, DataError } from '@customerbuddy/db';
import { z, ZodError } from 'zod';
import type { ErrorRequestHandler } from 'express';
import {
  LocalDemoIdentity,
  requireSession,
  requestScope,
  requireMutationOrigin,
  requireCsrf,
  revokeSession,
  sessionCookie,
} from './auth.js';
import type { Pool } from '@customerbuddy/db';
import type { readConfig } from './config.js';
import { commerceRoutes } from './commerce-routes.js';

export function createApp(config: ReturnType<typeof readConfig>, pool: Pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use((request, response, next) => {
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')) {
      response.status(403).json({ code: 'LOCAL_ONLY' });
      return;
    }
    const origin = request.get('Origin');
    if (origin && !config.allowedOrigins.includes(origin)) {
      response.status(403).json({ code: 'ORIGIN_DENIED' });
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/v1/health', async (_request, response) => {
    const ready = await databaseReady(pool);
    const payload = healthSchema.parse({
      status: ready ? 'ok' : 'degraded',
      service: 'customerbuddy-api',
      phase: 4,
      assistantMode: 'scripted',
      database: ready ? 'connected' : 'unavailable',
      correlationId: randomUUID(),
    });
    response.status(ready ? 200 : 503).json(payload);
  });
  const identity = new LocalDemoIdentity(pool);
  const repositories = createRepositories(pool);
  const signedIn = requireSession(identity);
  const mutationOrigin = requireMutationOrigin(config.allowedOrigins);
  app.get('/api/v1/demo/accounts', async (_request, response) => {
    const result = await pool.query('SELECT * FROM app.list_demo_accounts()');
    response.json({ isSynthetic: true, accounts: result.rows });
  });
  app.post('/api/v1/demo/sessions', mutationOrigin, async (request, response) => {
    const { accountKey } = demoSignInSchema.parse(request.body);
    const session = await identity.signIn(accountKey);
    if (!session) {
      response.status(404).json({ code: 'DEMO_ACCOUNT_NOT_FOUND' });
      return;
    }
    // Selecting a different local identity rotates/revokes an existing session.
    const existingCookie = (request.get('Cookie') ?? '')
      .split(';')
      .find((value) => value.trim().startsWith(`${sessionCookie}=`));
    if (existingCookie) {
      const previous = await identity.resolveRecord(
        existingCookie.trim().slice(sessionCookie.length + 1),
      );
      if (previous) await pool.query('SELECT app.revoke_demo_session($1)', [previous.tokenHash]);
    }
    response.cookie(sessionCookie, session.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: false,
      path: '/api/v1',
      maxAge: 8 * 60 * 60 * 1000,
    });
    response
      .status(201)
      .json({ isSynthetic: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
  });
  app.delete(
    '/api/v1/demo/sessions',
    signedIn,
    mutationOrigin,
    requireCsrf,
    async (_request, response) => {
      await revokeSession(pool, response);
      response.clearCookie(sessionCookie, {
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        path: '/api/v1',
      });
      response.status(204).end();
    },
  );
  app.get('/api/v1/me', signedIn, async (_request, response) =>
    response.json(await repositories.me(requestScope(response))),
  );
  app.patch('/api/v1/me', signedIn, mutationOrigin, requireCsrf, async (request, response) =>
    response.json(
      await repositories.profile(requestScope(response), profileChangeSchema.parse(request.body)),
    ),
  );
  app.get('/api/v1/me/preferences', signedIn, async (_request, response) =>
    response.json({ preferences: await repositories.preferences(requestScope(response)) }),
  );
  app.patch(
    '/api/v1/me/preferences',
    signedIn,
    mutationOrigin,
    requireCsrf,
    async (request, response) => {
      const { key, value } = preferenceChangeSchema.parse(request.body);
      response.json(await repositories.putPreference(requestScope(response), key, value));
    },
  );
  app.delete(
    '/api/v1/me/preferences/:key',
    signedIn,
    mutationOrigin,
    requireCsrf,
    async (request, response) => {
      await repositories.deletePreference(
        requestScope(response),
        preferenceKeySchema.parse(request.params.key),
      );
      response.status(204).end();
    },
  );
  app.post(
    '/api/v1/me/consents',
    signedIn,
    mutationOrigin,
    requireCsrf,
    async (request, response) => {
      const { purpose, granted } = consentChangeSchema.parse(request.body);
      response
        .status(201)
        .json({ consents: await repositories.consents(requestScope(response), purpose, granted) });
    },
  );
  app.get('/api/v1/catalogue', signedIn, async (_request, response) =>
    response.json({ items: await repositories.catalogue(requestScope(response)) }),
  );
  app.get('/api/v1/knowledge', signedIn, async (_request, response) =>
    response.json(await repositories.knowledge(requestScope(response))),
  );
  app.get('/api/v1/pickup-options', signedIn, async (_request, response) =>
    response.json(await repositories.pickupOptions(requestScope(response))),
  );
  app.get('/api/v1/capacity', signedIn, async (request, response) =>
    response.json({
      capacity: await repositories.capacity(
        requestScope(response),
        z.iso.date().parse(request.query.date),
      ),
    }),
  );
  app.get('/api/v1/orders', signedIn, async (_request, response) =>
    response.json({ orders: await repositories.orders(requestScope(response)) }),
  );
  app.get('/api/v1/orders/:id', signedIn, async (request, response) =>
    response.json(
      await repositories.orders(requestScope(response), z.uuid().parse(request.params.id)),
    ),
  );
  app.get('/api/v1/owner/customers', signedIn, async (_request, response) =>
    response.json({ customers: await repositories.ownerCustomers(requestScope(response)) }),
  );
  app.get('/api/v1/owner/customers/:id', signedIn, async (request, response) =>
    response.json(
      await repositories.ownerCustomers(requestScope(response), z.uuid().parse(request.params.id)),
    ),
  );
  commerceRoutes(app, pool, signedIn, mutationOrigin);
  app.use((_request, response) => {
    response.status(404).json({ code: 'NOT_FOUND', message: 'This route is not implemented yet.' });
  });
  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    void _next;
    if (error instanceof ZodError) {
      response.status(400).json({ code: 'INVALID_INPUT' });
      return;
    }
    if (error instanceof DataError) {
      response.status(error.status).json({ code: error.code });
      return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ code: 'INVALID_JSON' });
      return;
    }
    // Never echo SQL, request bodies, token hashes or credential-bearing config errors.
    console.error('API operation failed', {
      code: (error as { code?: string }).code ?? 'INTERNAL_ERROR',
    });
    response.status(500).json({ code: 'INTERNAL_ERROR' });
  };
  app.use(errorHandler);
  return app;
}
