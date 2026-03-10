import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const NICHES = ['', 'Lifestyle', 'Fashion & Beauty', 'Food & Drink', 'Tech & Gaming', 'Fitness & Health', 'Travel', 'Education', 'Comedy & Entertainment', 'Business & Finance', 'Music & Arts'];
const PLATFORMS = ['', 'Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook'];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('browse');
  const [filters, setFilters] = useState({ niche: '', platform: '', search: '' });
  const [applying, setApplying] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadTasks();
    loadMyTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const params = {};
      if (filters.niche) params.niche = filters.niche;
      if (filters.platform) params.platform = filters.platform;
      if (filters.search) params.search = filters.search;
      const res = await api.get('/tasks', { params });
      setTasks(res.data);
    } catch { /**/ } finally { setLoading(false); }
  }

  async function loadMyTasks() {
    try {
      const res = await api.get('/tasks/my');
      setMyTasks(res.data);
    } catch { /**/ }
  }

  async function apply(taskId) {
    setApplying(taskId);
    setMsg('');
    try {
      await api.post(`/tasks/${taskId}/apply`, {});
      setMsg('Application submitted! ✅');
      loadMyTasks();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to apply');
    } finally { setApplying(null); }
  }

  const appliedIds = new Set(myTasks.map(t => t.task_id || t.id));

  return (
    <div className="page">
      <div className="page-header">
        <h1>💼 Tasks</h1>
        <p>Find promotional tasks and earn income</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse Tasks</button>
        <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => { setTab('my'); loadMyTasks(); }}>
          My Applications {myTasks.length > 0 && `(${myTasks.length})`}
        </button>
      </div>

      {msg && <div className={`alert ${msg.includes('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      {tab === 'browse' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Niche</label>
                <select value={filters.niche} onChange={e => setFilters({ ...filters, niche: e.target.value })}>
                  {NICHES.map(n => <option key={n} value={n}>{n || 'All niches'}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Platform</label>
                <select value={filters.platform} onChange={e => setFilters({ ...filters, platform: e.target.value })}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p || 'All platforms'}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Search</label>
                <input type="text" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="Search tasks…" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={loadTasks}>Search</button>
          </div>

          {loading ? <div className="loading"><div className="spinner" /></div> : (
            tasks.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">🔍</div><p>No tasks found</p></div>
            ) : (
              <div className="grid-2">
                {tasks.map(task => (
                  <div key={task.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h3 className="card-title">{task.title}</h3>
                      <span className="badge badge-blue">UGX {Number(task.budget).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginBottom: '0.75rem' }}>{task.description?.slice(0, 120)}…</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {task.niche && <span className="badge badge-purple">{task.niche}</span>}
                      {task.platform && <span className="badge badge-gray">{task.platform}</span>}
                      {task.deadline && <span className="badge badge-yellow">Due {task.deadline}</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>📦 {task.business_name || task.business_owner}</div>
                    {appliedIds.has(task.id) ? (
                      <button className="btn btn-secondary btn-sm" disabled>Applied ✓</button>
                    ) : (
                      <button className="btn btn-primary btn-sm" disabled={applying === task.id} onClick={() => apply(task.id)}>
                        {applying === task.id ? 'Applying…' : 'Apply Now'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {tab === 'my' && (
        myTasks.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📭</div><p>No applications yet</p></div>
        ) : (
          <div className="grid-2">
            {myTasks.map(t => (
              <div key={t.task_id || t.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 className="card-title">{t.title}</h3>
                  <span className={`badge ${t.application_status === 'accepted' ? 'badge-blue' : t.application_status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                    {t.application_status}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>{t.business_name}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Budget: UGX {Number(t.budget).toLocaleString()}</p>
                {t.application_status === 'accepted' && !t.submission_id && (
                  <Link to={`/tasks/${t.task_id || t.id}/submit`} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Submit Proof
                  </Link>
                )}
                {t.submission_status && (
                  <div style={{ marginTop: '0.5rem' }}>
                    Submission: <span className={`badge ${t.submission_status === 'approved' ? 'badge-green' : t.submission_status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{t.submission_status}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
