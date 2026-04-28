import React, { useState, useEffect } from 'react';
import './Footer.css';
import { apiUrl } from '../api';

interface FooterProps {
  onBack?: (() => void) | null;
  /** Hide API status orb (e.g. login screen mock-up). */
  hideStatusOrb?: boolean;
}

const FOOTER_COMMIT_STAMP = '6a41c44  ·  2026-04-28 09:59';

const Footer: React.FC<FooterProps> = ({ onBack, hideStatusOrb = false }) => {
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(apiUrl('/api/offers'), { method: 'GET' });
        setBackendConnected(response.ok);
      } catch {
        setBackendConnected(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Left: back button */}
        <div className="footer-left">
          {onBack ? (
            <button className="footer-back-btn" onClick={onBack} aria-label="Go back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
          ) : (
            <div className="footer-back-placeholder" />
          )}
        </div>

        {/* Centre: wordmark + status dot */}
        <div className="footer-centre">
          <span className="footer-wordmark">dble.co | Flow MKTG &copy; 2026</span>
          {!hideStatusOrb && (
            <div className="status-circles">
              <div
                className={`status-circle ${backendConnected ? 'connected' : 'disconnected'}`}
                title={backendConnected ? 'API connected' : 'API disconnected'}
              />
            </div>
          )}
        </div>

        <div className="footer-commit-stamp" aria-label="Build commit reference">
          {FOOTER_COMMIT_STAMP}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
