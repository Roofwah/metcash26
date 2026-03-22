import React, { useEffect, useRef, useState } from 'react';
import './TopNav.css';

interface TopNavProps {
  userName?: string;
  userEmail?: string;
  connectedDatasets?: string[];
  onLogout?: () => void;
  onDashboard?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({
  userName,
  userEmail,
  connectedDatasets = [],
  onLogout,
  onDashboard,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isOpen &&
        modalRef.current &&
        buttonRef.current &&
        !modalRef.current.contains(target) &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const initials = (userName || 'U')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <div className="floating-nav">
      <button
        ref={buttonRef}
        type="button"
        className="floating-nav-button"
        aria-label="Open navigation menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img className="floating-nav-logo-image" src="/dble.svg?v=20260320-1" alt="dble" />
      </button>

      {isOpen && (
        <div ref={modalRef} className="floating-nav-modal" role="dialog" aria-modal="true">
          <div className="floating-nav-profile">
            <div className="floating-nav-avatar">{initials}</div>
            <div className="floating-nav-profile-text">
              <div className="floating-nav-user">{userName || 'Not logged in'}</div>
              <div className="floating-nav-email">{userEmail || 'No email on file'}</div>
            </div>
          </div>

          <div className="floating-nav-datasets-title">Connected datasets</div>
          {connectedDatasets.length > 0 ? (
            <ul className="floating-nav-datasets-list">
              {connectedDatasets.map((dataset) => (
                <li key={dataset}>{dataset}</li>
              ))}
            </ul>
          ) : (
            <div className="floating-nav-datasets-empty">No datasets connected</div>
          )}

          <button
            type="button"
            className="floating-nav-dashboard-row"
            aria-label="Open dashboard"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDashboard?.();
              setIsOpen(false);
            }}
          >
            <span className="floating-nav-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
              </svg>
            </span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="floating-nav-logout-row"
            aria-label="Log out"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLogout?.();
              setIsOpen(false);
            }}
          >
            <span className="floating-nav-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M10 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7v-2h7V6h-7V4Zm1.7 4.3L10.3 9.7 12.6 12H4v2h8.6l-2.3 2.3 1.4 1.4L16.4 13l-4.7-4.7Z" />
              </svg>
            </span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TopNav;
