import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function BusinessDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/business'),
      api.get('/tasks/my'),
      api.get('/subscriptions/my'),
    ]).then(([aRes, tRes, sRes]) => {
      setAnalytics(aRes.data);
      setTasks(tRes.data.slice(0, 5));
      setSubscription(sRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const stats = analytics?.stats || {};

  return (
    <div className="page">
      <div className="page-header">
        <h1>📊 Business Dashboard</h1>
        <p>Welcome back, {user?.name}! Manage your campaigns</p>
      </div>

      {!subscription && (
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          💡 Subscribe to access all features. Plans start at UGX 8,000/month.
          <Link to="/business/subscription" style={{ marginLeft: '0.5rem', fontWeight: 600 }}>Subscribe now →</Link>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div>
            <div className="stat-value">{stats.total_tasks || 0}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value">{stats.completed || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">📤</div>
          <div>
            <div className="stat-value">{stats.open || 0}</div>
            <div className="stat-label">Active Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">💰</div>
          <div>
            <div className="stat-value">UGX {Number(stats.total_spend || 0).toLocaleString()}</div>
            <div className="stat-label">Total Spend</div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>🚀 Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/business/tasks/new" className="btn btn-primary btn-lg">+ Post New Task</Link>
            <Link to="/business/campaigns" className="btn btn-secondary">View All Campaigns</Link>
            <Link to="/business/subscription" className="btn btn-secondary">
              {subscription ? `${subscription.plan} plan — renew` : 'Subscribe to a plan'}
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>📦 Recent Tasks</h3>
          {tasks.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📭</div><p>No tasks yet. <Link to="/business/tasks/new">Post your first task</Link></p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>UGX {Number(t.budget).toLocaleString()}</div>
                  </div>
                  <span className={`badge ${t.status === 'completed' ? 'badge-green' : t.status === 'open' ? 'badge-blue' : 'badge-yellow'}`}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
