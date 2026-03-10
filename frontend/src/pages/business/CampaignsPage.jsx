import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

export default function CampaignsPage() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [applications, setApplications] = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const msg = location.state?.msg || '';
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewMsgType, setReviewMsgType] = useState('success');

  useEffect(() => {
    api.get('/tasks/my').then(r => setTasks(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function loadApplications(taskId) {
    setAppLoading(true);
    try {
      const res = await api.get(`/tasks/${taskId}/applications`);
      setApplications(res.data);
    } catch { setApplications([]); } finally { setAppLoading(false); }
  }

  function openTask(task) {
    setSelected(task);
    setReviewMsg('');
    loadApplications(task.id);
  }

  async function respondToApp(appId, status) {
    try {
      await api.put(`/tasks/${selected.id}/applications/${appId}`, { status });
      setReviewMsg(`Application ${status}!`);
      setReviewMsgType('success');
      loadApplications(selected.id);
    } catch (err) {
      setReviewMsg(err.response?.data?.message || 'Failed');
      setReviewMsgType('error');
    }
  }

  async function reviewSubmission(status) {
    try {
      await api.put(`/tasks/${selected.id}/review-submission`, { status });
      setReviewMsg(status === 'approved' ? 'Submission approved! Payment released! 💰' : 'Submission rejected.');
      setReviewMsgType(status === 'approved' ? 'success' : 'error');
      const res = await api.get('/tasks/my');
      setTasks(res.data);
    } catch (err) {
      setReviewMsg(err.response?.data?.message || 'Failed');
      setReviewMsgType('error');
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>📦 My Campaigns</h1>
          <p>Manage your promotional tasks and influencer submissions</p>
        </div>
        <Link to="/business/tasks/new" className="btn btn-primary">+ Post Task</Link>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      {selected ? (
        <div>
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }} onClick={() => setSelected(null)}>← Back</button>
          {reviewMsg && <div className={`alert alert-${reviewMsgType}`}>{reviewMsg}</div>}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontWeight: 700 }}>{selected.title}</h2>
                <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem' }}>{selected.description}</p>
              </div>
              <span className={`badge ${selected.status === 'completed' ? 'badge-green' : selected.status === 'open' ? 'badge-blue' : 'badge-yellow'}`}>{selected.status}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span>💰 Budget: UGX {Number(selected.budget).toLocaleString()}</span>
              {selected.deadline && <span>📅 Due: {selected.deadline}</span>}
              {selected.platform && <span>📱 {selected.platform}</span>}
              {selected.niche && <span>🎯 {selected.niche}</span>}
            </div>
            {selected.status === 'submitted' && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-primary btn-sm" onClick={() => reviewSubmission('approved')}>✓ Approve & Pay</button>
                <button className="btn btn-danger btn-sm" onClick={() => reviewSubmission('rejected')}>✗ Reject Submission</button>
              </div>
            )}
          </div>

          <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>Applications ({applications.length})</h3>
          {appLoading ? <div className="loading"><div className="spinner" /></div> : (
            applications.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📭</div><p>No applications yet</p></div>
            ) : (
              <div className="grid-2">
                {applications.map(app => (
                  <div key={app.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{app.influencer_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{app.influencer_email}</div>
                      </div>
                      <span className={`badge ${app.status === 'accepted' ? 'badge-green' : app.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{app.status}</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {app.niche && <span className="badge badge-purple">{app.niche}</span>}
                      {app.follower_count > 0 && <span className="badge badge-blue">{app.follower_count.toLocaleString()} followers</span>}
                      {app.location && <span className="badge badge-gray">📍 {app.location}</span>}
                    </div>
                    {app.message && <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.75rem' }}>{app.message}</p>}
                    {app.status === 'pending' && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => respondToApp(app.id, 'accepted')}>Accept</button>
                        <button className="btn btn-danger btn-sm" onClick={() => respondToApp(app.id, 'rejected')}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : (
        tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No tasks yet. <Link to="/business/tasks/new">Post your first task</Link></p>
          </div>
        ) : (
          <div className="grid-2">
            {tasks.map(t => (
              <div key={t.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openTask(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 className="card-title">{t.title}</h3>
                  <span className={`badge ${t.status === 'completed' ? 'badge-green' : t.status === 'open' ? 'badge-blue' : t.status === 'submitted' ? 'badge-yellow' : 'badge-gray'}`}>{t.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--gray-500)', flexWrap: 'wrap' }}>
                  <span>💰 UGX {Number(t.budget).toLocaleString()}</span>
                  {t.deadline && <span>📅 {t.deadline}</span>}
                  {t.assigned_count > 0 && <span>👤 {t.assigned_count} assigned</span>}
                  {t.pending_submissions > 0 && <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>⚠ {t.pending_submissions} review needed</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
