import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const counts = data?.counts || {};

  return (
    <div className="page">
      <div className="page-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p>Platform overview and management</p>
      </div>

      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div><div className="stat-value">{counts.influencers || 0}</div><div className="stat-label">Influencers</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🏢</div>
          <div><div className="stat-value">{counts.businesses || 0}</div><div className="stat-label">Businesses</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{counts.completed_tasks || 0}</div><div className="stat-label">Completed Tasks</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">💰</div>
          <div><div className="stat-value">UGX {Number(counts.total_commission || 0).toLocaleString()}</div><div className="stat-label">Commission Earned</div></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>📊 Tasks by Status</h3>
          {(data?.tasksByStatus || []).map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{s.label}</span>
              <span className="badge badge-blue">{s.value}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>🏆 Top Influencers</h3>
          {(data?.topInfluencers || []).slice(0, 5).map((inf, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontSize: '0.875rem' }}>{inf.name}</span>
              <span className="badge badge-green">{inf.completed_tasks} tasks</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-4">
        <Link to="/admin/users" className="card" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
          <div style={{ fontWeight: 600 }}>Manage Users</div>
        </Link>
        <Link to="/admin/businesses" className="card" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏢</div>
          <div style={{ fontWeight: 600 }}>Businesses</div>
        </Link>
        <Link to="/admin/tasks" className="card" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
          <div style={{ fontWeight: 600 }}>Tasks</div>
        </Link>
        <Link to="/admin/payments" className="card" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
          <div style={{ fontWeight: 600 }}>Payments</div>
        </Link>
        <Link to="/admin/training" className="card" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📚</div>
          <div style={{ fontWeight: 600 }}>Training</div>
        </Link>
        <Link to="/admin/wellness" className="card" style={{ textAlign: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌿</div>
          <div style={{ fontWeight: 600 }}>Wellness</div>
        </Link>
      </div>
    </div>
  );
}
