import {
  LayoutDashboard,
  Users,
  Bot,
  ShoppingBag,
  CalendarDays,
  Wallet,
  Package,
  Megaphone,
  PenLine,
  MessageSquare,
  ShieldCheck,
  Settings,
  BookOpen,
  SlidersHorizontal,
  Workflow,
  FileSearch,
  HeartHandshake,
  Store,
  type LucideIcon,
} from 'lucide-react';

export type WorkspacePage = {
  label: string;
  path: string;
  icon: LucideIcon;
  group: string;
  keywords?: string;
};
export const ownerPages: WorkspacePage[] = [
  { label: 'Overview', path: '/owner', icon: LayoutDashboard, group: 'Workspace' },
  {
    label: 'Customer agents',
    path: '/owner/agents',
    icon: Bot,
    group: 'Workspace',
    keywords: 'interactions takeover human',
  },
  {
    label: 'Orders & appointments',
    path: '/owner/orders',
    icon: ShoppingBag,
    group: 'Workspace',
    keywords: 'booking payment preparing tracking',
  },
  { label: 'Calendar', path: '/owner/calendar', icon: CalendarDays, group: 'Workspace' },
  {
    label: 'Members',
    path: '/owner/members',
    icon: Users,
    group: 'Workspace',
    keywords: 'customers consent profiles',
  },
  {
    label: 'Sales & invoices',
    path: '/owner/sales',
    icon: Wallet,
    group: 'Business',
    keywords: 'revenue payments documents',
  },
  {
    label: 'Stock & forecast',
    path: '/owner/stock',
    icon: Package,
    group: 'Business',
    keywords: 'inventory pricing prediction',
  },
  {
    label: 'Human reviews',
    path: '/owner/reviews',
    icon: HeartHandshake,
    group: 'Business',
    keywords: 'approval discounts complaints refund',
  },
  {
    label: 'Risk review',
    path: '/owner/risks',
    icon: ShieldCheck,
    group: 'Business',
    keywords: 'fraud transactions',
  },
  {
    label: 'Engagement',
    path: '/owner/campaigns',
    icon: Megaphone,
    group: 'Growth',
    keywords: 'campaigns promotions announcements',
  },
  {
    label: 'Content studio',
    path: '/owner/content',
    icon: PenLine,
    group: 'Growth',
    keywords: 'visual seo multilingual social email',
  },
  { label: 'Business assistant', path: '/owner/assistant', icon: MessageSquare, group: 'Growth' },
  {
    label: 'Business setup',
    path: '/owner/setup',
    icon: Store,
    group: 'Settings',
    keywords: 'onboarding new business checklist',
  },
  { label: 'Business & catalogue', path: '/owner/business', icon: Store, group: 'Settings' },
  { label: 'Business knowledge', path: '/owner/knowledge', icon: BookOpen, group: 'Settings' },
  {
    label: 'Booking capacity',
    path: '/owner/capacity',
    icon: SlidersHorizontal,
    group: 'Settings',
  },
  { label: 'Privacy & ethics', path: '/owner/ethics', icon: ShieldCheck, group: 'Settings' },
  { label: 'Demo automation', path: '/owner/automation', icon: Workflow, group: 'Settings' },
  { label: 'Activity evidence', path: '/owner/evidence', icon: FileSearch, group: 'Settings' },
  {
    label: 'Conversation archive',
    path: '/owner/customers',
    icon: MessageSquare,
    group: 'Settings',
  },
];
export const customerPages: WorkspacePage[] = [
  { label: 'Discover', path: '/b/customerbuddy', icon: Store, group: 'Your business' },
  {
    label: 'Your buddy',
    path: '/b/customerbuddy/chat',
    icon: MessageSquare,
    group: 'Your business',
  },
  { label: 'Checkout / book', path: '/checkout', icon: ShoppingBag, group: 'Your business' },
  { label: 'My orders', path: '/account/orders', icon: Package, group: 'Your account' },
  { label: 'My updates', path: '/account/inbox', icon: Megaphone, group: 'Your account' },
  { label: 'My preferences', path: '/account/preferences', icon: Settings, group: 'Your account' },
];
export function currentPage(pages: WorkspacePage[], pathname: string) {
  return [...pages]
    .sort((a, b) => b.path.length - a.path.length)
    .find((p) => pathname === p.path || (p.path !== '/owner' && pathname.startsWith(`${p.path}/`)));
}
