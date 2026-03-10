import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/wallet').then(r => setWallet(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!wallet) return <div className="page"><div className="alert alert-error">Could not load wallet</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>💳 My Wallet</h1>
        <p>Your earnings and transaction history</p>
      </div>

      <div className="card" style={{ background: 'var(--gradient)', color: '#fff', marginBottom: '2rem', border: 'none' }}>
        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.5rem' }}>Available Balance</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>UGX {Number(wallet.balance).toLocaleString()}</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>7% platform commission deducted from task payments</div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Recent Transactions</h3>
        {wallet.transactions.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📊</div><p>No transactions yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>{t.description}</td>
                    <td><span className={`badge ${t.type === 'credit' ? 'badge-green' : 'badge-red'}`}>{t.type}</span></td>
                    <td style={{ fontWeight: 600, color: t.type === 'credit' ? 'var(--success)' : 'var(--error)' }}>
                      {t.type === 'credit' ? '+' : '-'} UGX {Number(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
