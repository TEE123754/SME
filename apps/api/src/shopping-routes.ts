import type { Express, RequestHandler, Request } from 'express';
import type { Pool } from '@customerbuddy/db';
import { DataError } from '@customerbuddy/db';
import { z } from 'zod';
import { idempotencyKeySchema } from '@customerbuddy/contracts';
import { createShopping } from '../../../packages/db/src/shopping.js';
import { requestScope, requireCsrf } from './auth.js';
const key = (r: Request) => idempotencyKeySchema.parse(r.get('Idempotency-Key'));
export function shoppingRoutes(
  app: Express,
  pool: Pool,
  signedIn: RequestHandler,
  origin: RequestHandler,
) {
  const shopping = createShopping(pool),
    write = [signedIn, origin, requireCsrf];
  app.get('/api/v1/stores/:slug', async (req, res) => {
    const slug = z
      .string()
      .regex(/^[a-z0-9-]{3,60}$/)
      .parse(req.params.slug);
    const store = (await pool.query('SELECT app.public_store($1) AS store', [slug])).rows[0].store;
    if (!store) {
      res.status(404).json({ code: 'NOT_FOUND' });
      return;
    }
    res.json(store);
  });
  app.post('/api/v1/demo/businesses', origin, async (req, res) => {
    const i = z
      .object({
        requestId: z.uuid(),
        name: z.string().trim().min(1).max(100),
        slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
        sector: z.string().trim().min(1).max(80),
        fulfilment: z.enum(['pickup', 'delivery', 'appointment']),
        synthetic: z.literal(true),
      })
      .strict()
      .parse(req.body);
    try {
      res
        .status(201)
        .json(
          (
            await pool.query('SELECT app.create_demo_business($1,$2,$3,$4,$5) AS result', [
              i.requestId,
              i.name,
              i.slug,
              i.sector,
              i.fulfilment,
            ])
          ).rows[0].result,
        );
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new DataError('STORE_ADDRESS_TAKEN', 409);
      if ((error as { code?: string }).code === '23514')
        throw new DataError('SETUP_REQUEST_CHANGED', 409);
      throw error;
    }
  });
  app.get('/api/v1/membership', signedIn, async (_req, res) =>
    res.json(await shopping.membership(requestScope(res))),
  );
  app.post('/api/v1/membership', ...write, async (req, res) =>
    res.json(
      await shopping.join(
        requestScope(res),
        z.object({ active: z.boolean() }).strict().parse(req.body).active,
        key(req),
      ),
    ),
  );
  app.post('/api/v1/owner/membership-program', ...write, async (req, res) =>
    res.json(
      await shopping.program(
        requestScope(res),
        z
          .object({
            enabled: z.boolean(),
            basisPoints: z.number().int().min(0).max(1500),
            version: z.number().int().positive(),
          })
          .strict()
          .parse(req.body),
        key(req),
      ),
    ),
  );
  app.get('/api/v1/owner/setup', signedIn, async (_req, res) =>
    res.json(await shopping.setup(requestScope(res))),
  );
}
