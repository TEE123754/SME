export type BusinessProfile = {
  id: string;
  name: string;
  slug: string;
  version: number;
  sector: string;
  fulfilment: 'pickup' | 'delivery' | 'appointment';
  ethics: Ethics;
  profileVersion: number;
};
export type Ethics = {
  personalisation: boolean;
  marketingEnabled: boolean;
  dailyContactLimit: number;
  maxDiscountPercent: number;
  maxIncreasePercent: number;
};
export type AgentCard = {
  id: string;
  display_name: string;
  display_code: string;
  preferred_language: string;
  interactions: number;
  orders: number;
  paid_sen: number;
  reviews: number;
  conversation: { id: string; state: string; takeover: boolean } | null;
  latest: { content: string; role: string; at: string } | null;
  run: { intent: string; state: string; at: string } | null;
};
export type StockItem = {
  product_id: string;
  sku: string;
  kind: string;
  label: string;
  unit_price_sen: number;
  knowledge_version_id: string;
  onHand: number | null;
  stockTracked: boolean;
  sold28: number;
  booked: number;
  predicted7: number;
  low: number;
  high: number;
  confidence: string;
  reorder: number;
  overflow: boolean;
  available: number | null;
};
export type StockData = {
  asOf: string;
  method: string;
  items: StockItem[];
  movements: {
    id: string;
    sku: string;
    quantity: number;
    kind: string;
    note: string;
    created_at: string;
  }[];
  proposals: {
    id: string;
    sku: string;
    old_price_sen: number;
    new_price_sen: number;
    reason: string;
    state: string;
  }[];
};
export type Draft = {
  id: string;
  channel: string;
  language: string;
  title: string;
  body: string;
  state: string;
  visual_json: { headline: string; subheading: string; price: string; accent: string };
};
export type Campaign = {
  id: string;
  title: string;
  kind: string;
  content: string;
  state: string;
  delivered: number;
  discount_percent: number;
};
