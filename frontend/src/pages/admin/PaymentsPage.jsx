import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/payments').then(r => setPayments(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const totalCommission = payments.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.commission), 0);
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.net_amount), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>💰 Payments</h1>
        <p>Track all payments and commission</p>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div><div className="stat-value">UGX {totalCommission.toLocaleString()}</div><div className="stat-label">Platform Commission (7%)</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">💸</div>
          <div><div className="stat-value">UGX {totalPaid.toLocaleString()}</div><div className="stat-label">Total Paid to Influencers</div></div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Task</th><th>Business</th><th>Influencer</th><th>Gross</th><th>Commission (7%)</th><th>Net</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{p.task_title}</td>
                  <td>{p.business_name}</td>
                  <td>{p.influencer_name}</td>
                  <td>UGX {Number(p.gross_amount).toLocaleString()}</td>
                  <td>UGX {Number(p.commission).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>UGX {Number(p.net_amount).toLocaleString()}</td>
                  <td><span className={`badge ${p.status === 'completed' ? 'badge-green' : 'badge-yellow'}`}>{p.status}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
