import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function TrainingAdminPage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', category: '', content: '', duration_mins: 10, badge_label: '', sort_order: 0 });
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/training');
      setModules(r.data);
    } catch { /**/ } finally { setLoading(false); }
  }

  async function createModule(e) {
    e.preventDefault();
    try {
      await api.post('/training', form);
      setMsg('Module created!');
      setForm({ title: '', description: '', category: '', content: '', duration_mins: 10, badge_label: '', sort_order: 0 });
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
  }

  async function toggleActive(id, is_active) {
    try {
      await api.put(`/training/${id}`, { is_active: !is_active });
      load();
    } catch { /**/ }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>📚 Training Modules</h1>
        <p>Manage digital skills training content</p>
      </div>

      <div className="grid-2">
        <div>
          {msg && <div className="alert alert-success">{msg}</div>}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Add New Module</h3>
            <form onSubmit={createModule}>
              <div className="form-group">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Content Creation" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} style={{ minHeight: 120 }} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Duration (mins)</label>
                  <input type="number" value={form.duration_mins} onChange={e => setForm({ ...form, duration_mins: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Badge Label</label>
                  <input value={form.badge_label} onChange={e => setForm({ ...form, badge_label: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Create Module</button>
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Existing Modules ({modules.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {modules.map(m => (
                <div key={m.id} style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{m.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{m.category} · {m.duration_mins} mins</div>
                  </div>
                  <button className={`btn btn-sm ${m.is_active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleActive(m.id, m.is_active)}>
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
