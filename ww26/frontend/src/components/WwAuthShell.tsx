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
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [authError, setAuthError] = useState('');

  const checkAuth = useCallback(async () => {
    setAuthError('');
    try {
      const me = await fetchApi<{ authenticated?: boolean; email?: string }>('/api/auth/me');
      if (me.authenticated && me.email) {
        setRepEmail(String(me.email).trim().toLowerCase());
        setNeedsSignIn(false);
        return;
      }
      setRepEmail(null);
      setNeedsSignIn(true);
    } catch {
      setRepEmail(null);
      setAuthError('Could not verify sign-in. Check your connection and try again.');
      setNeedsSignIn(false);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

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
    if (authError) {
      return (
        <div className="ww-login ww-login--checking">
          <p className="ww-login-lede">{authError}</p>
          <button type="button" className="ww-login-primary" onClick={() => void checkAuth()}>
            Try again
          </button>
        </div>
      );
    }
    const onProductionHost =
      typeof window !== 'undefined' &&
      !/localhost|127\.0\.0\.1/.test(window.location.hostname) &&
      window.location.port !== '3003';
    if (onProductionHost && needsSignIn) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/energizerAU?from=${encodeURIComponent(returnTo)}`);
      return (
        <div className="ww-login ww-login--checking">
          <p className="ww-login-lede">Redirecting to sign in…</p>
        </div>
      );
    }
    if (!onProductionHost) {
      return <WwLoginScreen publicUrl={publicUrl} onSuccess={setRepEmail} />;
    }
    return (
      <div className="ww-login ww-login--checking">
        <p className="ww-login-lede">Checking sign-in…</p>
      </div>
    );
  }

  return (
    <WwSessionContext.Provider value={{ email: repEmail, logout }}>{children}</WwSessionContext.Provider>
  );
}
