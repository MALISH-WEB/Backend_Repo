import { useState, useEffect } from 'react';
import api from '../../services/api';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

export default function WellnessPage() {
  const [alerts, setAlerts] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [mood, setMood] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([api.get('/wellness'), api.get('/wellness/checkins')])
      .then(([aRes, cRes]) => { setAlerts(aRes.data); setCheckins(cRes.data); })
      .catch(() => { setLoadError('Could not load wellness content. Please try again.'); })
      .finally(() => setLoading(false));
  }, []);

  async function submitCheckin(e) {
    e.preventDefault();
    if (!mood) return setMsg('Please select your mood');
    setSubmitting(true);
    setMsg('');
    try {
      await api.post('/wellness/checkin', { mood, notes });
      setMsg('Check-in recorded! Take care of yourself 💙');
      setMood(null);
      setNotes('');
      const res = await api.get('/wellness/checkins');
      setCheckins(res.data);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to record check-in');
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (loadError) return <div className="page"><div className="alert alert-error">{loadError}</div></div>;

  const typeIcons = { screen_time: '📱', mental_health: '💙', tips: '💡', checkin: '✅' };
  const typeLabels = { screen_time: 'Screen Time', mental_health: 'Mental Health', tips: 'Wellness Tips', checkin: 'Daily Check-in' };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🌿 Wellness Hub</h1>
        <p>Take care of your mental health and build healthy digital habits</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>😊 Daily Check-in</h3>
        {msg && <div className={`alert ${msg.includes('💙') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
        <form onSubmit={submitCheckin}>
          <p style={{ marginBottom: '1rem', color: 'var(--gray-600)', fontSize: '0.9rem' }}>How are you feeling today?</p>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {MOODS.map(m => (
              <button type="button" key={m.value}
                onClick={() => setMood(m.value)}
                style={{
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius)', border: '2px solid',
                  borderColor: mood === m.value ? 'var(--blue)' : 'var(--gray-200)',
                  background: mood === m.value ? '#EFF6FF' : '#fff',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', minWidth: 70
                }}>
                <div style={{ fontSize: '1.75rem' }}>{m.emoji}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', color: mood === m.value ? 'var(--blue)' : 'var(--gray-500)' }}>{m.label}</div>
              </button>
            ))}
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="How was your day? Any thoughts to share…" style={{ minHeight: 70 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Recording…' : 'Submit Check-in'}
          </button>
        </form>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        {alerts.map(alert => (
          <div key={alert.id} className="wellness-card">
            <div className="type-badge">{typeIcons[alert.type]} {typeLabels[alert.type]}</div>
            <h3>{alert.title}</h3>
            <p>{alert.message}</p>
          </div>
        ))}
      </div>

      {checkins.length > 0 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>📅 Recent Check-ins</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {checkins.slice(0, 7).map(c => {
              const moodData = MOODS.find(m => m.value === c.mood);
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{moodData?.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{moodData?.label}</div>
                    {c.notes && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{c.notes}</div>}
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--gray-400)' }}>{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
