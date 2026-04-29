import React, { useEffect, useState } from 'react';
import './LoginScreen.css';
import axios from 'axios';
import { apiUrl } from '../api';

interface LoginScreenProps {
  onSuccess: (email: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [devSigningIn, setDevSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get('magic') || '').trim();
    if (!token) return;
    setVerifying(true);
    setError('');
    setInfo('Verifying your sign-in link...');
    axios
      .post(
        apiUrl('/api/auth/verify-link'),
        { token },
        { withCredentials: true },
      )
      .then((res) => {
        const userEmail = String(res.data?.email || '').trim().toLowerCase();
        if (userEmail) {
          onSuccess(userEmail);
          params.delete('magic');
          const next = params.toString();
          const nextUrl = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash || ''}`;
          window.history.replaceState({}, '', nextUrl);
        } else {
          setError('Could not complete sign-in. Please request a new link.');
          setInfo('');
        }
      })
      .catch(() => {
        setError('This sign-in link is invalid or expired. Please request a new one.');
        setInfo('');
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [onSuccess]);

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    axios
      .post(apiUrl('/api/auth/request-link'), { email: normalizedEmail })
      .then(() => {
        setInfo('If your email is approved, we have sent a magic link.');
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Could not send sign-in link. Please try again.');
      })
      .finally(() => setSending(false));
  };

  const handleDevSignIn = () => {
    setError('');
    setInfo('');
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setDevSigningIn(true);
    axios
      .post(
        apiUrl('/api/auth/dev-login'),
        { email: normalizedEmail },
        { withCredentials: true },
      )
      .then((res) => {
        const userEmail = String(res.data?.email || normalizedEmail).trim().toLowerCase();
        onSuccess(userEmail);
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Debug sign-in is not enabled.');
      })
      .finally(() => setDevSigningIn(false));
  };

  return (
    <div className="login-screen">
      <div className="image-background" aria-hidden="true">
        <div className="animated-bg" />
      </div>
      <div className="login-overlay" aria-hidden="true" />

      <div className="login-card">
        <div className="login-logo-wrap">
          <img src="/dble.svg" alt="DBLE" className="login-logo" width={200} height={182} />
        </div>

        <h1>Sign in</h1>
        <p className="login-lede">
          Enter your approved email to receive a secure magic sign-in link.
        </p>
        <form onSubmit={handleSendLink}>
          {error && <div className="login-error">{error}</div>}
          {!!info && <div className="login-lede"><strong>{info}</strong></div>}
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={verifying}
            />
          </div>
          <button type="submit" className="login-primary" disabled={sending || verifying}>
            {verifying ? 'Verifying…' : sending ? 'Sending…' : 'Send magic link'}
          </button>
          <button
            type="button"
            className="login-primary"
            disabled={sending || verifying || devSigningIn}
            onClick={handleDevSignIn}
            style={{ marginTop: 10, background: '#475569' }}
          >
            {devSigningIn ? 'Signing in…' : 'Debug sign in (local only)'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
