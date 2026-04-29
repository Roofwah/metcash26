import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';

interface Props {
  token: string;
}

interface ForwardMeta {
  orderId: number;
  storeName: string;
  customerEmail: string;
  repEmail: string;
  totalValue: number;
  itemCount: number;
  expiresAt: string;
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
  const [sending, setSending] = useState(false);
  const [meta, setMeta] = useState<ForwardMeta | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setMessage('');
    axios
      .post(apiUrl('/api/order-forward/confirm'), { token }, { withCredentials: true })
      .then((res) => {
        if (res.data?.ok) setMeta(res.data as ForwardMeta);
        else setError('Could not validate this forward link.');
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Could not validate this forward link.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSend = () => {
    setSending(true);
    setError('');
    setMessage('');
    axios
      .post(apiUrl('/api/order-forward/send'), { token }, { withCredentials: true })
      .then(() => {
        setMessage('Customer confirmation sent successfully.');
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Could not send customer confirmation.');
      })
      .finally(() => setSending(false));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px 14px' }}>
      <div style={panelStyle}>
        <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Confirm & Forward Order</h2>
        {loading && <p style={{ margin: 0, color: '#475569' }}>Validating link...</p>}
        {!loading && error && <p style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
        {!loading && !error && meta && (
          <>
            <p style={{ margin: '0 0 10px', color: '#334155' }}>
              Review and confirm the customer email before sending.
            </p>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px' }}><strong>Order:</strong> #{meta.orderId}</p>
              <p style={{ margin: '0 0 4px' }}><strong>Store:</strong> {meta.storeName}</p>
              <p style={{ margin: '0 0 4px' }}><strong>Customer email:</strong> {meta.customerEmail}</p>
              <p style={{ margin: '0 0 4px' }}><strong>Submitted by:</strong> {meta.repEmail}</p>
              <p style={{ margin: '0 0 4px' }}><strong>Items:</strong> {meta.itemCount}</p>
              <p style={{ margin: 0 }}><strong>Total:</strong> ${Number(meta.totalValue || 0).toFixed(2)}</p>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !!message}
              style={{
                marginTop: 14,
                padding: '10px 14px',
                border: 0,
                borderRadius: 9,
                color: '#fff',
                background: sending || !!message ? '#94a3b8' : '#0f766e',
                cursor: sending || !!message ? 'default' : 'pointer',
                fontWeight: 600,
              }}
            >
              {sending ? 'Sending...' : message ? 'Sent' : 'Send to Customer'}
            </button>
            {!!message && <p style={{ margin: '10px 0 0', color: '#065f46' }}>{message}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderForwardConfirm;
