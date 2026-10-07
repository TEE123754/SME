// Business timestamps and real worker lease timestamps have separate boundaries.
export interface BusinessClock {
  now(): Date;
}

export interface DemoClock extends BusinessClock {
  advanceTo(instant: Date): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}

// Commerce reads the persisted database clock in Phase 3; owner controls arrive in Phase 5.
export const realClock: BusinessClock = { now: () => new Date() };

export const businessTimezone = 'Asia/Kuala_Lumpur';
export const initialDemoInstant = '2026-10-07T02:00:00.000Z';
export { canonical, proposalHash, depositSen, pickupInstant } from './commerce.js';
