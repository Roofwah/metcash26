import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';

interface Props {
  token: string;
}

interface ForwardMeta {
  orderId: number;
  publicOrderCode?: string;
  storeName: string;
  customerEmail: string;
  repEmail: string;
  totalValue: number;
  itemCount: number;
  expiresAt: string;
  mailtoUrl: string;
}

const panelStyle: React.CSSProperties = {
  maxWidth: 680,
  margin: '56px auto',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 20,
  boxShadow: '0 14px 40px rgba(15,23,42,0.08)',
};

const OrderForwardConfirm: React.FC<Props> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<ForwardMeta | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    axios
      .post(apiUrl('/api/order-forward/confirm'), { token }, { withCredentials: true })
      .then((res) => {
        if (res.data?.ok && res.data?.mailtoUrl) setMeta(res.data as ForwardMeta);
        else setError('Could not validate this forward link.');
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Could not validate this forward link.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const openMailto = () => {
    if (!meta?.mailtoUrl) return;
    window.location.href = meta.mailtoUrl;
  };

  const orderLabel = meta?.publicOrderCode || (meta ? `Order #${meta.orderId}` : '');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px 14px' }}>
      <div style={panelStyle}>
        <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Forward to customer</h2>
        {loading && <p style={{ margin: 0, color: '#475569' }}>Validating link...</p>}
        {!loading && error && <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
        {!loading && !error && meta && (
          <>
            <p style={{ margin: '0 0 10px', color: '#334155' }}>
              Open your email app with a prefilled draft. Send from your mailbox so it appears in Sent items. Nothing is
              sent from dble until you press Send in your mail app.
            </p>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Order:</strong> {orderLabel}
              </p>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Store:</strong> {meta.storeName}
              </p>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Customer email:</strong> {meta.customerEmail}
              </p>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Rep:</strong> {meta.repEmail}
              </p>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Items:</strong> {meta.itemCount}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Total:</strong> ${Number(meta.totalValue || 0).toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={openMailto}
              style={{
                marginTop: 14,
                padding: '10px 14px',
                border: 0,
                borderRadius: 9,
                color: '#fff',
                background: '#0f766e',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Open my email app
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderForwardConfirm;
