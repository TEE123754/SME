import type { Express, RequestHandler, Request } from 'express';
import type { Pool } from '@customerbuddy/db';
import { createCommerce, createRepositories, withScope } from '@customerbuddy/db';
import { z } from 'zod';
import {
  quoteRequestSchema,
  challengeRequestSchema,
  confirmRequestSchema,
  paymentRequestSchema,
  exceptionRequestSchema,
  decisionRequestSchema,
  statusRequestSchema,
  handoffRequestSchema,
  conversationRequestSchema,
  messageRequestSchema,
  takeoverRequestSchema,
  idempotencyKeySchema,
  publishRequestSchema,
  capacityChangeSchema,
} from '@customerbuddy/contracts';
import { requestScope, requireCsrf } from './auth.js';
const key = (request: Request) => idempotencyKeySchema.parse(request.get('Idempotency-Key'));
export function commerceRoutes(
  app: Express,
  pool: Pool,
  signedIn: RequestHandler,
  origin: RequestHandler,
) {
  const service = createCommerce(pool),
    repos = createRepositories(pool),
    write = [signedIn, origin, requireCsrf];
  app.get('/api/v1/business-time', signedIn, async (_req, res) =>
    res.json(
      await withScope(pool, requestScope(res), async (c) => ({
        demoTime: (await c.query('SELECT app.business_now() AS instant')).rows[0].instant,
      })),
    ),
  );
  app.post('/api/v1/quotes', ...write, async (req, res) =>
    res
      .status(201)
      .json(await service.quote(requestScope(res), quoteRequestSchema.parse(req.body), key(req))),
  );
  app.get('/api/v1/quotes/:id', signedIn, async (req, res) =>
    res.json(await service.readQuote(requestScope(res), z.uuid().parse(req.params.id))),
  );
  app.post('/api/v1/quotes/:id/edit', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.editQuote(
          requestScope(res),
          z.uuid().parse(req.params.id),
          quoteRequestSchema.parse(req.body),
          key(req),
        ),
      ),
  );
  app.post('/api/v1/owner/knowledge/publish', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.publish(requestScope(res), publishRequestSchema.parse(req.body), key(req)),
      ),
  );
  app.post('/api/v1/owner/capacity', ...write, async (req, res) =>
    res.json(
      await service.configureCapacity(
        requestScope(res),
        capacityChangeSchema.parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/quotes/:id/confirmation-challenge', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.challenge(
          requestScope(res),
          z.uuid().parse(req.params.id),
          challengeRequestSchema.parse(req.body).proposalHash,
          key(req),
        ),
      ),
  );
  app.post('/api/v1/orders/confirm', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.confirm(requestScope(res), confirmRequestSchema.parse(req.body), key(req)),
      ),
  );
  app.post('/api/v1/orders/:id/handoff', ...write, async (req, res) => {
    const input = handoffRequestSchema.parse(req.body);
    res
      .status(201)
      .json(
        await service.handoff(
          requestScope(res),
          z.uuid().parse(req.params.id),
          input.note,
          input.conversationId,
          key(req),
        ),
      );
  });
  app.post('/api/v1/exceptions', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.exception(
          requestScope(res),
          exceptionRequestSchema.parse(req.body),
          key(req),
        ),
      ),
  );
  app.get('/api/v1/owner/approvals', signedIn, async (_req, res) =>
    res.json({ approvals: await service.approvals(requestScope(res)) }),
  );
  app.get('/api/v1/me/reviews', signedIn, async (_req, res) => {
    const scope = requestScope(res);
    if (scope.role !== 'customer') {
      res.status(403).json({ code: 'CUSTOMER_ONLY' });
      return;
    }
    res.json({
      reviews: await withScope(
        pool,
        scope,
        async (c) =>
          (
            await c.query(`SELECT a.id,a.kind,a.state,a.expires_at,a.decision_note,
      CASE WHEN a.state='pending' AND a.expires_at<=app.business_now() THEN 'expired'
      WHEN a.state='pending' AND (a.policy_version_id<>(SELECT active_knowledge_version_id FROM app.businesses WHERE id=a.business_id)
       OR (a.order_id IS NOT NULL AND (SELECT version FROM app.orders WHERE id=a.order_id)<>(a.proposal_json->>'orderVersion')::integer)) THEN 'superseded'
      ELSE a.state END AS effective_state,
      (SELECT q.id FROM app.quotes q WHERE q.approval_id=a.id ORDER BY q.created_at DESC LIMIT 1) AS quote_id
      FROM app.approvals a ORDER BY a.created_at DESC LIMIT 50`)
          ).rows,
      ),
    });
  });
  app.post('/api/v1/owner/approvals/:id/decision', ...write, async (req, res) =>
    res.json(
      await service.decision(
        requestScope(res),
        z.uuid().parse(req.params.id),
        decisionRequestSchema.parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/payments/verify', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.verifyPayment(
          requestScope(res),
          paymentRequestSchema.parse(req.body),
          key(req),
        ),
      ),
  );
  app.post('/api/v1/owner/orders/:id/status', ...write, async (req, res) =>
    res.json(
      await service.status(
        requestScope(res),
        z.uuid().parse(req.params.id),
        statusRequestSchema.parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/orders/:id/resume', ...write, async (req, res) =>
    res.json(
      await service.resumeOrder(
        requestScope(res),
        z.uuid().parse(req.params.id),
        z
          .object({ version: z.number().int().min(1) })
          .strict()
          .parse(req.body).version,
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/holds/expire', ...write, async (req, res) =>
    res.json(
      await service.expire(
        requestScope(res),
        z.object({ date: z.iso.date() }).strict().parse(req.body).date,
      ),
    ),
  );
  app.get('/api/v1/owner/dashboard', signedIn, async (_req, res) =>
    res.json(await service.dashboard(requestScope(res))),
  );
  app.get('/api/v1/owner/orders', signedIn, async (_req, res) => {
    if (requestScope(res).role !== 'owner') {
      res.status(403).json({ code: 'OWNER_ONLY' });
      return;
    }
    res.json({ orders: await repos.orders(requestScope(res)) });
  });
  app.get('/api/v1/conversations', signedIn, async (_req, res) =>
    res.json({ conversations: await service.conversations(requestScope(res)) }),
  );
  app.post('/api/v1/conversations', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.conversation(
          requestScope(res),
          conversationRequestSchema.parse(req.body).language,
          key(req),
        ),
      ),
  );
  app.get('/api/v1/conversations/:id/messages', signedIn, async (req, res) =>
    res.json({
      messages: await service.messages(requestScope(res), z.uuid().parse(req.params.id)),
    }),
  );
  app.post('/api/v1/conversations/:id/messages', ...write, async (req, res) =>
    res
      .status(201)
      .json(
        await service.message(
          requestScope(res),
          z.uuid().parse(req.params.id),
          messageRequestSchema.parse(req.body).content,
          key(req),
        ),
      ),
  );
  app.post('/api/v1/owner/conversations/:id/takeover', ...write, async (req, res) =>
    res.json(
      await service.takeover(
        requestScope(res),
        z.uuid().parse(req.params.id),
        takeoverRequestSchema.parse(req.body).takeover,
        key(req),
      ),
    ),
  );
}
