import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function WellnessAdminPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', type: 'tips' });
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const r = await api.get('/wellness'); setAlerts(r.data); }
    catch { /**/ } finally { setLoading(false); }
  }

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/wellness', form);
      setMsg('Alert created!');
      setForm({ title: '', message: '', type: 'tips' });
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
  }

  async function toggle(id, is_active) {
    try { await api.put(`/wellness/${id}`, { is_active: !is_active }); load(); }
    catch { /**/ }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>🌿 Wellness Alerts</h1>
        <p>Manage mental health and screen-time content</p>
      </div>

      <div className="grid-2">
        <div>
          {msg && <div className="alert alert-success">{msg}</div>}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Create Alert</h3>
            <form onSubmit={create}>
              <div className="form-group">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="tips">Wellness Tips</option>
                  <option value="screen_time">Screen Time</option>
                  <option value="mental_health">Mental Health</option>
                  <option value="checkin">Check-in</option>
                </select>
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary">Create Alert</button>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Active Alerts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map(a => (
                <div key={a.id} style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.title}</div>
                      <span className="badge badge-purple" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>{a.type}</span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggle(a.id, a.is_active)}>
                      {a.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '0.5rem' }}>{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
