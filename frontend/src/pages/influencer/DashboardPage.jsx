import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function InfluencerDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/influencer'),
      api.get('/tasks/my'),
    ]).then(([aRes, tRes]) => {
      setAnalytics(aRes.data);
      setRecentTasks(tRes.data.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const stats = analytics?.stats || {};

  return (
    <div className="page">
      <div className="page-header">
        <h1>👋 Welcome back, {user?.name}!</h1>
        <p>Here&apos;s your performance overview</p>
      </div>

      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue">💰</div>
          <div>
            <div className="stat-value">UGX {Number(stats.total_earnings || 0).toLocaleString()}</div>
            <div className="stat-label">Total Earnings</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value">{stats.completed_tasks || 0}</div>
            <div className="stat-label">Completed Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📋</div>
          <div>
            <div className="stat-value">{stats.applied_tasks || 0}</div>
            <div className="stat-label">Total Applications</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">💼</div>
          <div>
            <div className="stat-value">UGX {Number(analytics?.wallet_balance || 0).toLocaleString()}</div>
            <div className="stat-label">Wallet Balance</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>🎯 Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/tasks" className="btn btn-primary btn-lg">Browse Available Tasks</Link>
            <Link to="/wallet" className="btn btn-secondary">View Wallet</Link>
            <Link to="/training" className="btn btn-secondary">Continue Training</Link>
            <Link to="/wellness" className="btn btn-secondary">Wellness Check-in</Link>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>📊 Recent Tasks</h3>
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>No tasks yet. <Link to="/tasks">Find a task</Link></p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTasks.map(t => (
                <div key={t.task_id || t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{t.business_name}</div>
                  </div>
                  <StatusBadge status={t.application_status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { pending: 'badge-yellow', accepted: 'badge-blue', rejected: 'badge-red', completed: 'badge-green' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}
