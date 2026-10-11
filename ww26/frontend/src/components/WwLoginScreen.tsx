import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';
import './WwLoginScreen.css';

type Props = {
  publicUrl?: string;
  onSuccess: (email: string) => void;
};

export default function WwLoginScreen({ publicUrl = '', onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    setError('');
  }, [otpCode, email]);

  const requestCode = async () => {
    setError('');
    setInfo('');
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const res = await fetchApi<{ ok?: boolean; localOtpCode?: string }>('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      setOtpSent(true);
      if (res.localOtpCode) {
        setInfo(`Dev preview code: ${res.localOtpCode}`);
      } else {
        setInfo('If your email is approved, we have sent a 6-digit sign-in code.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send sign-in code.');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Enter the 6-digit code.');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetchApi<{ email?: string }>('/api/auth/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, code: otpCode.trim() }),
      });
      const userEmail = String(res.email || normalizedEmail).trim().toLowerCase();
      if (userEmail) {
        onSuccess(userEmail);
        return;
      }
      setError('Could not complete sign-in. Please request a new code.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="ww-login">
      <div className="ww-login-bg" style={{ backgroundImage: `url(${publicUrl}/bg.jpg)` }} aria-hidden="true" />
      <div className="ww-login-card">
        <img className="ww-login-logo" src={`${publicUrl}/dble.svg`} alt="DBLE" width={160} height={146} />
        <h1>Sign in</h1>
        <p className="ww-login-lede">
          Enter your approved rep email to receive a secure 6-digit sign-in code (same access as Metcash expo).
        </p>
        <form onSubmit={otpSent ? verifyCode : (ev) => { ev.preventDefault(); void requestCode(); }}>
          {error ? <p className="ww-login-err">{error}</p> : null}
          {info ? <p className="ww-login-info">{info}</p> : null}
          <label className="ww-login-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={verifying}
            />
          </label>
          {otpSent ? (
            <label className="ww-login-field">
              <span>6-digit code</span>
              <input
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(ev) => setOtpCode(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={verifying}
              />
            </label>
          ) : null}
          {!otpSent ? (
            <button type="submit" className="ww-login-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send sign-in code'}
            </button>
          ) : (
            <>
              <button type="submit" className="ww-login-primary" disabled={verifying}>
                {verifying ? 'Verifying…' : 'Verify code'}
              </button>
              <button
                type="button"
                className="ww-login-secondary"
                onClick={() => void requestCode()}
                disabled={sending || verifying}
              >
                {sending ? 'Sending…' : 'Resend code'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
