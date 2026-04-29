import React, { useEffect, useState } from 'react';
import './LoginScreen.css';
import axios from 'axios';
import { apiUrl } from '../api';

interface LoginScreenProps {
  onSuccess: (email: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
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

  const requestCode = () => {
    setError('');
    setInfo('');
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    axios
      .post(apiUrl('/api/auth/request-link'), { email: normalizedEmail })
      .then((res) => {
        setOtpSent(true);
        setInfo('If your email is approved, we have sent a 6-digit sign-in code.');
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Could not send sign-in code. Please try again.');
      })
      .finally(() => setSending(false));
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    requestCode();
  };

  const handleVerifyCode = (e?: React.FormEvent | React.MouseEvent) => {
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
    axios
      .post(
        apiUrl('/api/auth/verify-link'),
        { email: normalizedEmail, code: otpCode.trim() },
        { withCredentials: true },
      )
      .then((res) => {
        const userEmail = String(res.data?.email || '').trim().toLowerCase();
        if (userEmail) {
          onSuccess(userEmail);
          return;
        }
        setError('Could not complete sign-in. Please request a new code.');
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Invalid or expired code. Please request a new one.');
      })
      .finally(() => setVerifying(false));
  };

  return (
    <div className="login-screen">
      <div className="image-background" aria-hidden="true">
        <div className="animated-bg" />
      </div>
      <div className="login-overlay" aria-hidden="true" />

      <div className="login-card">
        <div className="login-logo-wrap">
          <img src="/metcash26/dble.svg" alt="DBLE" className="login-logo" width={200} height={182} />
        </div>

        <h1>Sign in</h1>
        <p className="login-lede">
          Enter your approved email to receive a secure 6-digit sign-in code.
        </p>
        <form onSubmit={otpSent ? handleVerifyCode : handleSendCode}>
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
          {otpSent ? (
            <>
              <div className="login-field">
                <label htmlFor="login-otp">6-digit code</label>
                <input
                  id="login-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(ev) => setOtpCode(ev.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  disabled={verifying}
                />
              </div>
              <button type="submit" className="login-primary" disabled={verifying}>
                {verifying ? 'Verifying…' : 'Verify code'}
              </button>
              <button
                type="button"
                className="login-secondary"
                onClick={requestCode}
                disabled={sending || verifying}
              >
                {sending ? 'Sending…' : 'Resend code'}
              </button>
            </>
          ) : (
            <button type="submit" className="login-primary" disabled={sending || verifying}>
              {sending ? 'Sending…' : 'Send sign-in code'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
