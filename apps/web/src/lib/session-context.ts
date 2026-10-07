import { createContext, useContext } from 'react';
import type { Me } from './types';
type Session = {
  me: Me | null;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<unknown>;
  signIn: (key: string) => Promise<Me>;
  signOut: () => Promise<void>;
  language: 'en' | 'bm';
  setLanguage: (language: 'en' | 'bm') => Promise<void>;
  t: (en: string, bm: string) => string;
};
export const Context = createContext<Session | null>(null);
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing session provider');
  return value;
}
