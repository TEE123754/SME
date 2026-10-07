export type Me = {
  role: 'owner' | 'customer';
  business: { id: string; name: string; slug: string };
  profile: {
    id: string;
    display_name: string;
    display_code: string;
    preferred_language: 'bm' | 'en';
    version: number;
  } | null;
  consents: Record<string, boolean> | null;
};
export type Product = {
  image_key?: string;
  available?: boolean;
  kind?: 'product' | 'service';
  product_id: string;
  sku: string;
  label: string;
  description: string;
  units_description: string;
  unit_price_sen: number;
  knowledge_version_id: string;
};
export type Pickup = {
  slots: { id: string; code: string; start_local: string; end_local: string }[];
  timezone: string;
};
export type Quote = {
  memberBenefit?: { basisPoints: number; savingsSen: number };
  id: string;
  items: {
    sku: string;
    label: string;
    quantity: number;
    unitPriceSen: number;
    lineTotalSen: number;
  }[];
  pickupDate: string;
  pickupSlotId: string;
  knowledgeVersionId: string;
  totalSen: number;
  depositSen: number;
  proposalHash: string;
  expiresAt: string;
  state: string;
};
export type Order = {
  id: string;
  display_code: string;
  customer_id: string;
  state: string;
  version: number;
  exception_paused: boolean;
  pickup_date: string;
  pickup_slot_id: string;
  total_sen: number;
  deposit_required_sen: number;
  verified_paid_sen: number;
  items: { sku: string; label: string; quantity: number; unitPriceSen: number }[];
  reservation: { state: string; expiresAt: string } | null;
  payments:
    | { id: string; amountSen: number; reference: string; state: string; verifiedAt: string }[]
    | null;
  documents: { id: string; kind: string; state: string }[] | null;
};
export type Approval = {
  id: string;
  kind: string;
  customer_id: string;
  order_id: string | null;
  conversation_id: string | null;
  proposal_hash: string;
  version: number;
  state: string;
  effective_state: string;
  expires_at: string;
  policy_version_id: string;
  proposal_json: {
    offer?: { items: Quote['items']; totalSen: number; depositSen: number; pickupDate: string };
    note?: string;
    paidSen?: number;
    orderVersion?: number;
  };
  decision_note: string | null;
};
export type Conversation = {
  id: string;
  customer_id: string;
  state: string;
  human_takeover: boolean;
  language: 'bm' | 'en';
  created_at: string;
};
export type Message = { id: string; role: string; content: string; created_at: string };
export type Capacity = {
  product_id?: string;
  sku: string;
  pickup_date: string;
  max_units: number;
  held_units: number;
  committed_units: number;
  available_units: number;
  version?: number;
};
export type Dashboard = {
  orders: number;
  awaiting_deposit: number;
  confirmed: number;
  paused: number;
  verifiedSyntheticPaymentSen: number;
  pendingApprovals: number;
  demoTime: string;
};
