import type { Express, RequestHandler } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { withScope, DataError } from '@customerbuddy/db';
import type { Pool } from '@customerbuddy/db';
import { requestScope, requireCsrf } from './auth.js';
import { createScripted } from './scripted.js';
import { createJobs } from './jobs.js';
import { localStorage } from './storage.js';
import { idempotencyKeySchema } from '@customerbuddy/contracts';
export function phase5Routes(
  app: Express,
  pool: Pool,
  signedIn: RequestHandler,
  origin: RequestHandler,
  documentPath: string,
  reset?: () => Promise<void>,
) {
  const storage = localStorage(documentPath),
    jobs = createJobs(pool, storage),
    assistant = createScripted(pool),
    write = [signedIn, origin, requireCsrf];
  app.post('/api/v1/conversations/:id/respond', ...write, async (req, res) =>
    res.json(
      await assistant.respond(
        requestScope(res),
        z.uuid().parse(req.params.id),
        z.object({ messageId: z.uuid() }).strict().parse(req.body).messageId,
      ),
    ),
  );
  app.get('/api/v1/me/notifications', signedIn, async (_req, res) =>
    res.json({
      notifications: await withScope(
        pool,
        requestScope(res),
        async (c) =>
          (
            await c.query(
              'SELECT id,order_id,content,created_at FROM app.notifications ORDER BY created_at DESC LIMIT 100',
            )
          ).rows,
      ),
    }),
  );
  app.get('/api/v1/owner/demo/jobs', signedIn, async (_req, res) =>
    res.json(await jobs.status(requestScope(res))),
  );
  app.post('/api/v1/owner/demo/jobs/run', ...write, async (_req, res) =>
    res.json(await jobs.run(requestScope(res))),
  );
  app.post('/api/v1/owner/demo/digest', ...write, async (req, res) =>
    res.json(
      await jobs.digest(requestScope(res), idempotencyKeySchema.parse(req.get('Idempotency-Key'))),
    ),
  );
  app.post('/api/v1/owner/demo/clock', ...write, async (req, res) => {
    const input = z
      .object({
        mode: z.enum(['pause', 'resume', 'advance']),
        hours: z.number().int().min(0).max(168).default(0),
      })
      .strict()
      .parse(req.body);
    res.json(
      await jobs.clock(
        requestScope(res),
        input.mode,
        input.hours,
        idempotencyKeySchema.parse(req.get('Idempotency-Key')),
      ),
    );
  });
  app.post('/api/v1/owner/demo/pause', ...write, async (req, res) => {
    const scope = requestScope(res);
    if (scope.role !== 'owner') throw new DataError('OWNER_ONLY', 403);
    const { paused } = z.object({ paused: z.boolean() }).strict().parse(req.body);
    await withScope(pool, scope, async (c) => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [scope.businessId]);
      await c.query('UPDATE app.businesses SET automation_paused=$2 WHERE id=$1', [
        scope.businessId,
        paused,
      ]);
    });
    res.json({ paused });
  });
  app.post('/api/v1/owner/demo/reset', ...write, async (req, res) => {
    if (requestScope(res).role !== 'owner') throw new DataError('OWNER_ONLY', 403);
    z.object({ confirmation: z.literal('RESET SYNTHETIC DEMO') })
      .strict()
      .parse(req.body);
    if (!reset) throw new DataError('LOCAL_RESET_UNAVAILABLE', 503);
    await reset();
    res.clearCookie('cb_session', { path: '/api/v1' });
    res.json({ reset: true, signInRequired: true });
  });
  app.get('/api/v1/documents/:id/download', signedIn, async (req, res) => {
    const scope = requestScope(res),
      id = z.uuid().parse(req.params.id);
    const doc = await withScope(
      pool,
      scope,
      async (c) =>
        (
          await c.query(
            "SELECT id,kind,storage_key,content_hash FROM app.documents WHERE id=$1 AND state='available'",
            [id],
          )
        ).rows[0],
    );
    if (!doc) throw new DataError('NOT_FOUND', 404);
    const bytes = await storage.read(doc.storage_key);
    if (createHash('sha256').update(bytes).digest('hex') !== doc.content_hash)
      throw new DataError('DOCUMENT_INTEGRITY_FAILED', 409);
    res
      .type('application/pdf')
      .set('Content-Disposition', `attachment; filename="synthetic-${doc.kind}-${doc.id}.pdf"`)
      .send(Buffer.from(bytes));
  });
  return jobs;
}
