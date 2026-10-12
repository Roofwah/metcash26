import React from 'react';
import { BUILD_COMMIT } from '../buildInfo';

type Props = {
  className?: string;
};

function CommitIcon() {
  return (
    <svg
      className="ww-build-footer-icon"
      width={12}
      height={12}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="2.25" fill="currentColor" />
      <path
        d="M8 1.5v3.25M8 11.25V14.5M1.5 8h3.25M11.25 8H14.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BuildCommitFooter({ className = '' }: Props) {
  return (
    <footer className={`ww-build-footer ${className}`.trim()} aria-label="Build version">
      <CommitIcon />
      <span className="ww-build-footer-hash">{BUILD_COMMIT}</span>
    </footer>
  );
}
