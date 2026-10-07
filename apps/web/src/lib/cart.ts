import { useSyncExternalStore } from 'react';
export type CartItem = { sku: string; quantity: number };
function subscribe(fn: () => void) {
  window.addEventListener('cb-cart', fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener('cb-cart', fn);
    window.removeEventListener('storage', fn);
  };
}
export function cartKey(business: string, customer?: string) {
  return `cb.cart:${business}:${customer ?? 'guest'}`;
}
export function readCart(key: string): CartItem[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v)
      ? v
          .filter(
            (i): i is CartItem =>
              typeof i?.sku === 'string' &&
              /^[a-z0-9-]{1,60}$/.test(i.sku) &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 100,
          )
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}
export function saveCart(key: string, items: CartItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event('cb-cart'));
}
export function useCart(business: string, customer?: string) {
  const key = cartKey(business, customer);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key) ?? '[]',
    () => '[]',
  );
  const items = readCart(key);
  return {
    items,
    snapshot,
    set: (next: CartItem[]) => saveCart(key, next),
    add: (sku: string, quantity = 1) => {
      const cart = readCart(key),
        existing = cart.find((i) => i.sku === sku);
      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 100 ||
        (existing?.quantity ?? 0) + quantity > 100 ||
        (!existing && cart.length >= 10)
      )
        return false;
      saveCart(
        key,
        existing
          ? cart.map((i) => (i.sku === sku ? { ...i, quantity: i.quantity + quantity } : i))
          : [...cart, { sku, quantity }],
      );
      return true;
    },
  };
}
