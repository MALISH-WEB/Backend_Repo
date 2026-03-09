import { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminPages.css';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-page"><div className="admin-container"><div className="loading-state">Loading analytics…</div></div></div>;
  if (error) return <div className="admin-page"><div className="admin-container"><div className="alert alert-error">{error}</div></div></div>;
  if (!data) return null;

  const { counts, byCategory, byFaculty, monthly, topCreators } = data;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Analytics Dashboard</h1>
          <p>Platform statistics and insights</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📁</span>
            <div className="stat-value">{counts?.totalProjects ?? 0}</div>
            <div className="stat-label">Total Projects</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div className="stat-value">{counts?.approvedProjects ?? 0}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⏳</span>
            <div className="stat-value">{counts?.pendingProjects ?? 0}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div className="stat-value">{counts?.totalUsers ?? 0}</div>
            <div className="stat-label">Users</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💬</span>
            <div className="stat-value">{counts?.totalComments ?? 0}</div>
            <div className="stat-label">Comments</div>
          </div>
        </div>

        <div className="analytics-row">
          {byCategory?.length > 0 && (
            <div className="analytics-card">
              <h3>Projects by Category</h3>
              <div className="bar-list">
                {byCategory.map((item, i) => {
                  const max = Math.max(...byCategory.map(x => x.count));
                  return (
                    <div key={i} className="bar-item">
                      <span className="bar-label">{item.name || item.category_name || 'Unknown'}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} />
                      </div>
                      <span className="bar-count">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {byFaculty?.length > 0 && (
            <div className="analytics-card">
              <h3>Projects by Faculty</h3>
              <div className="bar-list">
                {byFaculty.map((item, i) => {
                  const max = Math.max(...byFaculty.map(x => x.count));
                  return (
                    <div key={i} className="bar-item">
                      <span className="bar-label">{item.name || item.faculty_name || 'Unknown'}</span>
                      <div className="bar-track">
                        <div className="bar-fill bar-fill-green" style={{ width: `${(item.count / max) * 100}%` }} />
                      </div>
                      <span className="bar-count">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {monthly?.length > 0 && (
          <div className="analytics-card analytics-full">
            <h3>Monthly Submissions</h3>
            <div className="monthly-chart">
              {monthly.map((item, i) => {
                const max = Math.max(...monthly.map(x => x.count));
                return (
                  <div key={i} className="monthly-bar-col">
                    <div className="monthly-bar-wrapper">
                      <div
                        className="monthly-bar"
                        style={{ height: `${max > 0 ? (item.count / max) * 100 : 0}%` }}
                        title={`${item.count} projects`}
                      />
                    </div>
                    <span className="monthly-label">{item.month}</span>
                    <span className="monthly-count">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {topCreators?.length > 0 && (
          <div className="analytics-card analytics-full">
            <h3>Top Contributors</h3>
            <div className="creators-list">
              {topCreators.map((creator, i) => (
                <div key={i} className="creator-item">
                  <div className="creator-rank">#{i + 1}</div>
                  <div className="creator-avatar">{creator.name?.charAt(0).toUpperCase()}</div>
                  <div className="creator-info">
                    <span className="creator-name">{creator.name}</span>
                    <span className="creator-email">{creator.email}</span>
                  </div>
                  <div className="creator-count">{creator.project_count} projects</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
