import { z } from 'zod';

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('customerbuddy-api'),
  phase: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  assistantMode: z.literal('scripted'),
  database: z.enum(['connected', 'unavailable']),
  correlationId: z.uuid(),
});

export type HealthResponse = z.infer<typeof healthSchema>;

export interface TrustedScope {
  businessId: string;
  subject: string;
  role: 'customer' | 'owner' | 'worker';
  customerId?: string;
}

// Local demo implementation resolves persisted sessions; cloud mapping is Phase 7 work.
export interface IdentityAdapter {
  resolveSession(sessionToken: string): Promise<TrustedScope | null>;
}

export interface PrivateDocumentStorage {
  put(key: string, content: Uint8Array): Promise<void>;
  read(key: string): Promise<Uint8Array>;
}

export const demoSignInSchema = z
  .object({ accountKey: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/) })
  .strict();
export const profileChangeSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    preferredLanguage: z.enum(['bm', 'en']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
export const consentChangeSchema = z
  .object({
    purpose: z.enum(['preference_memory', 'operational_reminders', 'marketing']),
    granted: z.boolean(),
  })
  .strict();
export const preferenceKeySchema = z.enum([
  'favourite_product_sku',
  'pickup_slot_code',
  'packaging',
]);
export const preferenceChangeSchema = z.discriminatedUnion('key', [
  z
    .object({
      key: z.literal('favourite_product_sku'),
      value: z.enum(['brownie-tray', 'cupcake-box']),
    })
    .strict(),
  z.object({ key: z.literal('pickup_slot_code'), value: z.enum(['midday', 'late']) }).strict(),
  z.object({ key: z.literal('packaging'), value: z.enum(['standard', 'gift']) }).strict(),
]);
export const policySchema = z
  .object({
    leadTimeHours: z.number().int().min(1),
    depositBasisPoints: z.number().int().min(0).max(10000),
    quoteLifetimeMinutes: z.number().int().min(1),
    holdLifetimeHours: z.number().int().min(1),
    reminderDelayHours: z.number().int().min(1),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
    allowedExceptionTypes: z.array(
      z.enum(['discount', 'custom_order', 'complaint', 'refund_request']),
    ),
  })
  .strict();

export const quoteRequestSchema = z
  .object({
    items: z
      .array(
        z
          .object({ sku: z.string().min(1).max(60), quantity: z.number().int().min(1).max(100) })
          .strict(),
      )
      .min(1)
      .max(10),
    pickupDate: z.iso.date(),
    pickupSlotCode: z.string().min(1).max(40),
  })
  .strict()
  .refine((v) => new Set(v.items.map((i) => i.sku)).size === v.items.length);
export const challengeRequestSchema = z
  .object({ proposalHash: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const confirmRequestSchema = z
  .object({
    quoteId: z.uuid(),
    proposalHash: z.string().regex(/^[a-f0-9]{64}$/),
    challengeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  })
  .strict();
export const paymentRequestSchema = z
  .object({
    orderId: z.uuid(),
    amountSen: z.number().int().min(1).max(10000000),
    reference: z
      .string()
      .trim()
      .regex(/^SYNTHETIC-[A-Za-z0-9_-]{1,80}$/),
  })
  .strict();
export const exceptionRequestSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('discount'),
      quoteId: z.uuid(),
      discountBasisPoints: z.number().int().min(1).max(5000),
      note: z.string().trim().min(1).max(500),
    })
    .strict(),
  z
    .object({
      kind: z.enum(['custom_order', 'complaint', 'refund_request']),
      orderId: z.uuid().optional(),
      conversationId: z.uuid().optional(),
      note: z.string().trim().min(1).max(1000),
    })
    .strict(),
]);
export const decisionRequestSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    proposalHash: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.number().int().min(1),
    note: z.string().trim().min(1).max(500),
  })
  .strict();
export const statusRequestSchema = z
  .object({
    state: z.enum(['preparing', 'ready', 'delivering', 'completed', 'cancelled']),
    version: z.number().int().min(1),
    reviewed: z.boolean().optional(),
    note: z.string().trim().min(1).max(500),
  })
  .strict();
export const handoffRequestSchema = z
  .object({ note: z.string().trim().min(1).max(1000), conversationId: z.uuid().optional() })
  .strict();
export const conversationRequestSchema = z.object({ language: z.enum(['bm', 'en']) }).strict();
export const messageRequestSchema = z
  .object({ content: z.string().trim().min(1).max(4000) })
  .strict();
export const takeoverRequestSchema = z.object({ takeover: z.boolean() }).strict();
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);
export const publishRequestSchema = z
  .object({
    expectedKnowledgeVersionId: z.uuid(),
    policy: policySchema,
    catalogue: z
      .array(
        z
          .object({
            sku: z.string().min(1).max(60),
            label: z.string().min(1).max(100),
            description: z.string().max(500),
            unitPriceSen: z.number().int().min(1).max(1000000),
            unitsDescription: z.string().min(1).max(100),
            available: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .refine((v) => new Set(v.catalogue.map((i) => i.sku)).size === v.catalogue.length);
export const capacityChangeSchema = z
  .object({
    productId: z.uuid(),
    pickupDate: z.iso.date(),
    maxUnits: z.number().int().min(0).max(10000),
    version: z.number().int().min(0),
  })
  .strict();
