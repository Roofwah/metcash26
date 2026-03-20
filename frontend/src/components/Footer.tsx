import React, { useState, useEffect } from 'react';
import './Footer.css';
import { apiUrl } from '../api';

const Footer: React.FC = () => {
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
        <span>Metcash – Store lookup &amp; sales input</span>
        <span className="separator">|</span>
        <div className="status-circles">
          <div className={`status-circle ${backendConnected ? 'connected' : 'disconnected'}`} title={backendConnected ? 'API connected' : 'API disconnected'} />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
