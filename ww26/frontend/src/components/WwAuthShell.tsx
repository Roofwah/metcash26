import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchApi } from '../api';
import WwLoginScreen from './WwLoginScreen';

type Session = {
  email: string;
  logout: () => void;
};

const WwSessionContext = createContext<Session | null>(null);

export function useWwSession(): Session {
  const ctx = useContext(WwSessionContext);
  if (!ctx) throw new Error('useWwSession must be used within WwAuthShell');
  return ctx;
}

type Props = {
  publicUrl?: string;
  children: React.ReactNode;
};

export default function WwAuthShell({ publicUrl = '', children }: Props) {
  const [repEmail, setRepEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchApi<{ authenticated?: boolean; email?: string }>('/api/auth/me');
        if (!cancelled && me.authenticated && me.email) {
          setRepEmail(String(me.email).trim().toLowerCase());
        }
      } catch {
        // Stay on login until /api/auth/me is available.
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    fetchApi('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setRepEmail(null);
  }, []);

  if (!authChecked) {
    return (
      <div className="ww-login ww-login--checking">
        <p className="ww-login-lede">Checking sign-in…</p>
      </div>
    );
  }

  if (!repEmail) {
    const onProductionHost =
      typeof window !== 'undefined' &&
      !/localhost|127\.0\.0\.1/.test(window.location.hostname) &&
      window.location.port !== '3003';
    if (onProductionHost) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/energizerAU?from=${encodeURIComponent(returnTo)}`);
      return (
        <div className="ww-login ww-login--checking">
          <p className="ww-login-lede">Redirecting to sign in…</p>
        </div>
      );
    }
    return <WwLoginScreen publicUrl={publicUrl} onSuccess={setRepEmail} />;
  }

  return (
    <WwSessionContext.Provider value={{ email: repEmail, logout }}>{children}</WwSessionContext.Provider>
  );
}
