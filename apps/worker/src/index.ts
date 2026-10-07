import type { TrustedScope } from '@customerbuddy/contracts';

// Phase 5 supplies leased persisted jobs; no fake scheduler runs in Phase 1.
export interface BoundedJobProcessor {
  processDueBatch(
    scope: TrustedScope,
    maximumJobs: number,
  ): Promise<{
    processed: number;
    suppressed: number;
    failed: number;
  }>;
}
