import React, { useEffect, useRef, useState } from 'react';
import './DbleNav.css';

interface DbleNavProps {
  publicUrl?: string;
  repEmail?: string;
  onDashboard?: () => void;
  onLogout?: () => void;
}

export default function DbleNav({ publicUrl = '', repEmail, onDashboard, onLogout }: DbleNavProps) {
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

  return (
    <div className="ww-dble-nav">
      <button
        ref={buttonRef}
        type="button"
        className="ww-dble-nav-button"
        aria-label="Open DBLE menu"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img className="ww-dble-nav-logo" src={`${publicUrl}/dble.svg`} alt="DBLE" />
      </button>

      {isOpen && (
        <div ref={modalRef} className="ww-dble-nav-menu" role="dialog" aria-modal="true">
          {repEmail ? (
            <p className="ww-dble-nav-menu-rep" title={repEmail}>
              {repEmail}
            </p>
          ) : null}
          <button
            type="button"
            className="ww-dble-nav-menu-row"
            aria-label="Main menu — Energizer AU channels"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
              window.location.assign('/energizerAU');
            }}
          >
            <span className="ww-dble-nav-menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
              </svg>
            </span>
            <span>Main menu</span>
          </button>
          <button
            type="button"
            className="ww-dble-nav-menu-row"
            aria-label="Open dashboard"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDashboard?.();
              setIsOpen(false);
            }}
          >
            <span className="ww-dble-nav-menu-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
              </svg>
            </span>
            <span>Dashboard</span>
          </button>
          {onLogout ? (
            <button
              type="button"
              className="ww-dble-nav-menu-row ww-dble-nav-menu-row--logout"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onLogout();
                setIsOpen(false);
              }}
            >
              Sign out
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
