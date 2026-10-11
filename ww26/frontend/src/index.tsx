import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import FieldPerformance from './features/fieldPerformance/FieldPerformance';
import WwAuthShell from './components/WwAuthShell';
import './App.css';

const PUBLIC = process.env.PUBLIC_URL || '';

function isFieldPerformanceRoute(): boolean {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return path === '/ww26/field' || path.startsWith('/ww26/field/');
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <WwAuthShell publicUrl={PUBLIC}>
      {isFieldPerformanceRoute() ? <FieldPerformance /> : <App />}
    </WwAuthShell>
  </React.StrictMode>,
);
