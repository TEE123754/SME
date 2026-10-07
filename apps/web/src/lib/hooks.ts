import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import { useSession } from './session-context';
export function useData<T>(path: string, enabled = true) {
  const { me } = useSession();
  return useQuery({
    queryKey: ['data', me?.role, me?.profile?.id, path],
    queryFn: () => api<T>(path),
    enabled: enabled && !!me,
    retry: false,
    refetchOnWindowFocus: true,
  });
}
export function useAction() {
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState('');
  const active = useRef(false),
    client = useQueryClient();
  async function run<T>(path: string, body?: unknown, method = 'POST'): Promise<T | undefined> {
    if (active.current) return;
    active.current = true;
    setPending(true);
    setError(null);
    setNotice('');
    const identity = `cb.retry:${path}:${method}:${JSON.stringify(body)}`,
      key = sessionStorage.getItem(identity) ?? crypto.randomUUID();
    sessionStorage.setItem(identity, key);
    try {
      const result = await api<T>(path, method, body, key);
      sessionStorage.removeItem(identity);
      await client.invalidateQueries();
      return result;
    } catch (e) {
      if (e instanceof ApiError && e.status < 500) sessionStorage.removeItem(identity);
      setError(e);
      return undefined;
    } finally {
      active.current = false;
      setPending(false);
    }
  }
  return {
    run,
    pending,
    error,
    notice,
    setNotice,
    clear: () => {
      setError(null);
      setNotice('');
    },
  };
}
