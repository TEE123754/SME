import { resolve } from 'node:path';
import { rename, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createDatabasePool, fixtureBusinessId, seedDemo } from '@customerbuddy/db';
import { createJobs } from './jobs.js';
import { localStorage } from './storage.js';
export function localRuntime(documentPath: string) {
  const workerUrl = process.env.WORKER_DATABASE_URL,
    adminUrl = process.env.MIGRATION_DATABASE_URL;
  function verify(value: string | undefined, user: string) {
    if (!value) throw new Error('Missing local role configuration');
    const u = new URL(value);
    if (
      !['postgres:', 'postgresql:'].includes(u.protocol) ||
      u.hostname !== '127.0.0.1' ||
      u.pathname !== '/customerbuddy' ||
      u.username !== user
    )
      throw new Error('Invalid local role target');
    return value;
  }
  const worker = createDatabasePool(verify(workerUrl, 'cb_worker')),
    jobs = createJobs(worker, localStorage(documentPath));
  let busy = false;
  const timer = setInterval(() => {
    if (busy) return;
    busy = true;
    void jobs
      .run({ businessId: fixtureBusinessId, subject: 'local:scheduler', role: 'worker' })
      .catch(() => console.error('Local job batch failed; retained for retry.'))
      .finally(() => {
        busy = false;
      });
  }, 15000);
  timer.unref();
  return {
    async close() {
      clearInterval(timer);
      await worker.end();
    },
    async reset() {
      if (busy) throw new Error('Wait for the active local job batch before resetting');
      busy = true;
      try {
        const admin = createDatabasePool(verify(adminUrl, 'customerbuddy'));
        try {
          await seedDemo(admin, true);
        } finally {
          await admin.end();
        }
        // Keep old files in a private recovery archive; fresh document root never exposes old IDs.
        const archive = resolve(documentPath, '..', `documents-reset-${randomUUID()}`);
        try {
          await rename(documentPath, archive);
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        }
        await mkdir(documentPath, { recursive: true });
      } finally {
        busy = false;
      }
    },
  };
}
