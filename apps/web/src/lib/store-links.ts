import type { Me } from './types';
export function customerRoute(me: Me | null, slug: string | undefined, path: string) {
  return me?.role === 'customer' && me.business.slug === slug
    ? path
    : `/sign-in?business=${encodeURIComponent(slug ?? 'ainas-home-bakery')}&next=${encodeURIComponent(path)}`;
}
