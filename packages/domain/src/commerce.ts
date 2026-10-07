// Pure integer arithmetic and canonical proposal hashing; no model or client totals.
import { createHash } from 'node:crypto';
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .filter((key) => object[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
export const proposalHash = (value: unknown) =>
  createHash('sha256').update(canonical(value)).digest('hex');
export function depositSen(total: number, basisPoints: number): number {
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    total > 10000000 ||
    !Number.isInteger(basisPoints) ||
    basisPoints < 0 ||
    basisPoints > 10000
  )
    throw new Error('Invalid money');
  return Math.ceil((total * basisPoints) / 10000);
}
export function pickupInstant(date: string, startLocal: string): Date {
  return new Date(`${date}T${startLocal.slice(0, 8)}+08:00`);
}
