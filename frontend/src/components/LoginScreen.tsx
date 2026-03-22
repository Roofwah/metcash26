import React, { useState } from 'react';
import './LoginScreen.css';

const DEMO_EMAIL = 'chris@flowmarketing.com.au';
const DEMO_CODE = '1234';

interface LoginScreenProps {
  onSuccess: (email: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [phase, setPhase] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const normalizedEmail = email.trim().toLowerCase();

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setPhase('code');
      setCode('');
    }, 600);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (normalizedEmail !== DEMO_EMAIL.toLowerCase()) {
      setError('Account not recognised.');
      return;
    }
    if (code.trim() !== DEMO_CODE) {
      setError('Invalid code. Please try again.');
      return;
    }
    onSuccess(DEMO_EMAIL);
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

        <h1>{phase === 'email' ? 'Sign in' : 'Check your email'}</h1>

        {phase === 'email' ? (
          <>
            <form onSubmit={handleSendCode}>
              {error && <div className="login-error">{error}</div>}
              <div className="login-field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
              </div>
              <button type="submit" className="login-primary" disabled={sending}>
                {sending ? 'Sending…' : 'Send verification code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="login-lede">
              Enter the verification code we sent to your email to continue.
            </p>
            <form onSubmit={handleSignIn}>
              {error && <div className="login-error">{error}</div>}
              <div className="login-field">
                <label htmlFor="login-code">One-time code</label>
                <input
                  id="login-code"
                  name="one-time-code"
                  type="password"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={code}
                  onChange={(ev) => setCode(ev.target.value)}
                  placeholder="••••"
                />
              </div>
              <button type="submit" className="login-primary">
                Sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
