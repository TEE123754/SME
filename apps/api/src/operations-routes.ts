import type { Express, RequestHandler, Request } from 'express';
import { createOperations, withScope } from '@customerbuddy/db';
import type { Pool } from '@customerbuddy/db';
import { z } from 'zod';
import { idempotencyKeySchema } from '@customerbuddy/contracts';
import { requireCsrf, requestScope } from './auth.js';
import { createGrowth } from './growth.js';
import { ownerOnly, activeCatalogue } from '../../../packages/db/src/operations.js';
const key = (req: Request) => idempotencyKeySchema.parse(req.get('Idempotency-Key'));
const id = (req: Request) => z.uuid().parse(req.params.id);
const text = (max = 500) => z.string().trim().min(1).max(max);
export function operationsRoutes(
  app: Express,
  pool: Pool,
  signedIn: RequestHandler,
  origin: RequestHandler,
) {
  const ops = createOperations(pool),
    growth = createGrowth(pool),
    write = [signedIn, origin, requireCsrf];
  app.get('/api/v1/owner/catalogue', signedIn, async (_req, res) => {
    const s = requestScope(res);
    ownerOnly(s);
    res.json(await withScope(pool, s, async (c) => ({ items: await activeCatalogue(c) })));
  });
  app.get('/api/v1/business-profile', signedIn, async (_req, res) =>
    res.json(await ops.profile(requestScope(res))),
  );
  app.post('/api/v1/owner/business-profile', ...write, async (req, res) =>
    res.json(
      await ops.setup(
        requestScope(res),
        z
          .object({
            name: text(100),
            slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
            sector: text(80),
            fulfilment: z.enum(['pickup', 'delivery', 'appointment']),
            version: z.number().int().positive(),
            factsEn: text(3000),
            factsBm: text(3000),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/products', ...write, async (req, res) =>
    res.json(
      await ops.product(
        requestScope(res),
        z
          .object({
            sku: z.string().regex(/^[a-z0-9-]{1,60}$/),
            label: text(100),
            description: text(500),
            unitPriceSen: z.number().int().min(1).max(1000000),
            unitsDescription: text(100),
            kind: z.enum(['product', 'service']),
            available: z.boolean(),
            knowledgeVersionId: z.uuid(),
            imageKey: z.enum(['parcel', 'brownie', 'cupcake', 'flower', 'service']).optional(),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.get('/api/v1/owner/agents', signedIn, async (_req, res) =>
    res.json(await ops.agents(requestScope(res))),
  );
  app.get('/api/v1/owner/stock', signedIn, async (_req, res) =>
    res.json(await ops.stock(requestScope(res))),
  );
  app.post('/api/v1/owner/stock', ...write, async (req, res) =>
    res.json(
      await ops.movement(
        requestScope(res),
        z
          .object({
            productId: z.uuid(),
            quantity: z
              .number()
              .int()
              .min(-100000)
              .max(100000)
              .refine((v) => v !== 0),
            kind: z.enum(['receipt', 'adjustment']),
            note: text(),
          })
          .strict()
          .refine((v) => v.kind !== 'receipt' || v.quantity > 0)
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/prices', ...write, async (req, res) =>
    res.json(
      await ops.price(
        requestScope(res),
        z.object({ productId: z.uuid() }).strict().parse(req.body).productId,
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/prices/:id', ...write, async (req, res) =>
    res.json(
      await ops.priceDecision(
        requestScope(res),
        id(req),
        z
          .object({ decision: z.enum(['approved', 'rejected']) })
          .strict()
          .parse(req.body).decision,
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/ethics', ...write, async (req, res) =>
    res.json(
      await ops.ethics(
        requestScope(res),
        z
          .object({
            personalisation: z.boolean(),
            marketingEnabled: z.boolean(),
            dailyContactLimit: z.number().int().min(0).max(3),
            maxDiscountPercent: z.number().int().min(0).max(30),
            maxIncreasePercent: z.number().int().min(0).max(20),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.get('/api/v1/me/recommendation', signedIn, async (_req, res) =>
    res.json(await ops.recommendation(requestScope(res))),
  );
  app.get('/api/v1/owner/members', signedIn, async (_req, res) =>
    res.json(await ops.members(requestScope(res))),
  );
  app.post('/api/v1/owner/members', ...write, async (req, res) =>
    res.json(
      await ops.member(
        requestScope(res),
        z
          .object({ name: text(80), language: z.enum(['en', 'bm']) })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.get('/api/v1/owner/sales', signedIn, async (_req, res) =>
    res.json(await ops.sales(requestScope(res))),
  );
  app.post('/api/v1/owner/query', ...write, async (req, res) =>
    res.json({
      mode: 'scripted',
      ...(await ops.ownerQuery(
        requestScope(res),
        z
          .object({ text: text(4000) })
          .strict()
          .parse(req.body).text,
      )),
    }),
  );
  app.get('/api/v1/owner/calendar', signedIn, async (req, res) =>
    res.json(
      await ops.calendar(
        requestScope(res),
        z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
          .parse(req.query.month),
      ),
    ),
  );
  app.post('/api/v1/owner/calendar', ...write, async (req, res) =>
    res.json(
      await ops.event(
        requestScope(res),
        z
          .object({
            title: text(150),
            date: z.iso.date(),
            time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            kind: z.enum(['task', 'campaign', 'appointment']),
            note: z.string().trim().max(1000),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/calendar/:id', ...write, async (req, res) =>
    res.json(
      await ops.eventDone(
        requestScope(res),
        id(req),
        z.object({ done: z.boolean() }).strict().parse(req.body).done,
        key(req),
      ),
    ),
  );
  app.get('/api/v1/orders/:id/tracking', signedIn, async (req, res) =>
    res.json(
      await withScope(pool, requestScope(res), async (c) => ({
        events: (
          await c.query(
            'SELECT state,created_at FROM app.order_tracking WHERE order_id=$1 ORDER BY created_at,id',
            [id(req)],
          )
        ).rows,
      })),
    ),
  );
  app.get('/api/v1/owner/risks', signedIn, async (_req, res) =>
    res.json(await ops.risks(requestScope(res))),
  );
  app.post('/api/v1/owner/risks/screen', ...write, async (req, res) =>
    res.json(
      await ops.risk(
        requestScope(res),
        z
          .object({
            orderId: z.uuid(),
            amountSen: z.number().int().min(1).max(10000000),
            reference: text(100),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/risks/:id', ...write, async (req, res) =>
    res.json(
      await ops.riskDecision(
        requestScope(res),
        id(req),
        z
          .object({ state: z.enum(['cleared', 'blocked']), note: text(1000) })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.get('/api/v1/owner/campaigns', signedIn, async (_req, res) =>
    res.json(await growth.list(requestScope(res))),
  );
  app.post('/api/v1/owner/campaigns', ...write, async (req, res) =>
    res.json(
      await growth.draft(
        requestScope(res),
        z
          .object({
            title: text(150),
            kind: z.enum(['announcement', 'recommendation', 'promotion', 'after_sales']),
            content: text(2000),
            productId: z.uuid().optional(),
            discountPercent: z.number().int().min(0).max(30),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.get('/api/v1/owner/campaigns/:id/preview', signedIn, async (req, res) =>
    res.json(await growth.preview(requestScope(res), id(req))),
  );
  app.post('/api/v1/owner/campaigns/:id/send', ...write, async (req, res) =>
    res.json(await growth.send(requestScope(res), id(req), key(req))),
  );
  app.get('/api/v1/me/inbox', signedIn, async (_req, res) =>
    res.json(await growth.inbox(requestScope(res))),
  );
  app.get('/api/v1/owner/content', signedIn, async (_req, res) =>
    res.json(await growth.content(requestScope(res))),
  );
  app.post('/api/v1/owner/content', ...write, async (req, res) =>
    res.json(
      await growth.generate(
        requestScope(res),
        z
          .object({
            productId: z.uuid(),
            channel: z.enum(['seo', 'marketing', 'email', 'social', 'pr']),
            language: z.enum(['en', 'bm', 'zh']),
            tone: z.enum(['friendly', 'professional']),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/content/:id', ...write, async (req, res) =>
    res.json(
      await growth.editContent(
        requestScope(res),
        id(req),
        z
          .object({
            title: text(150),
            body: text(4000),
            headline: text(100),
            accent: z.string().regex(/^#[a-fA-F0-9]{6}$/),
            state: z.enum(['draft', 'approved']),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
}
