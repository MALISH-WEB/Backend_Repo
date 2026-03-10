import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function TrainingPage() {
  const [modules, setModules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [marking, setMarking] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([api.get('/training'), api.get('/training/progress/summary')])
      .then(([mRes, sRes]) => { setModules(mRes.data); setSummary(sRes.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markComplete(moduleId) {
    setMarking(true);
    try {
      const res = await api.post(`/training/${moduleId}/complete`);
      setMsg(`🏅 ${res.data.message}`);
      const [mRes, sRes] = await Promise.all([api.get('/training'), api.get('/training/progress/summary')]);
      setModules(mRes.data);
      setSummary(sRes.data);
      if (selected?.id === moduleId) setSelected({ ...selected, completed: true });
    } catch { setMsg('Failed to mark complete'); } finally { setMarking(false); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const categoryColors = { 'Content Creation': 'blue', 'Branding': 'purple', 'Digital Marketing': 'green', 'Entrepreneurship': 'yellow' };

  return (
    <div className="page">
      <div className="page-header">
        <h1>📚 Digital Skills Training</h1>
        <p>Learn content creation, branding, marketing and entrepreneurship</p>
      </div>

      {summary && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Your Progress</div>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{summary.completed} of {summary.total} modules completed</div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--blue)' }}>{summary.percentage}%</div>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${summary.percentage}%` }} />
          </div>
          {summary.badges.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {summary.badges.map(b => <span key={b} className="badge badge-purple">🏅 {b}</span>)}
            </div>
          )}
        </div>
      )}

      {msg && <div className="alert alert-success">{msg}</div>}

      {selected ? (
        <div className="card">
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }} onClick={() => setSelected(null)}>← Back to modules</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontWeight: 700 }}>{selected.title}</h2>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{selected.description}</p>
            </div>
            {selected.completed && <span className="badge badge-green">✓ Completed</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {selected.category && <span className="badge badge-blue">{selected.category}</span>}
            <span className="badge badge-gray">⏱ {selected.duration_mins} mins</span>
            {selected.badge_label && <span className="badge badge-purple">🏅 {selected.badge_label}</span>}
          </div>
          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', padding: '1.5rem', whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.8 }}>
            {selected.content || 'Content coming soon…'}
          </div>
          {!selected.completed && (
            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => markComplete(selected.id)} disabled={marking}>
              {marking ? 'Marking…' : '✓ Mark as Complete'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {modules.map(mod => (
            <div key={mod.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelected(mod)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className={`badge badge-${categoryColors[mod.category] || 'blue'}`}>{mod.category}</span>
                {mod.completed && <span className="badge badge-green">✓ Done</span>}
              </div>
              <h3 className="card-title" style={{ marginBottom: '0.4rem' }}>{mod.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>{mod.description}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-gray">⏱ {mod.duration_mins} mins</span>
                {mod.badge_label && <span className="badge badge-purple">🏅 {mod.badge_label}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
