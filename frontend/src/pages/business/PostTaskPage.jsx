import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const NICHES = ['Lifestyle', 'Fashion & Beauty', 'Food & Drink', 'Tech & Gaming', 'Fitness & Health', 'Travel', 'Education', 'Comedy & Entertainment', 'Business & Finance', 'Music & Arts'];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'Facebook'];

export default function PostTaskPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', requirements: '', niche: '', budget: '', platform: '', deadline: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/tasks', form);
      navigate('/business/campaigns', { state: { msg: 'Task posted successfully! 🎉' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post task');
    } finally { setLoading(false); }
  }

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1>📣 Post a Promotion Task</h1>
        <p>Connect with influencers to promote your brand</p>
      </div>
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Task Title</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Promote our new café on Instagram" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What do you want influencers to do?" required />
          </div>
          <div className="form-group">
            <label>Requirements</label>
            <textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} placeholder="Minimum followers, posting guidelines, hashtags to use…" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Niche</label>
              <select value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })}>
                <option value="">Any niche</option>
                {NICHES.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Platform</label>
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                <option value="">Any platform</option>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Budget (UGX)</label>
              <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="50000" required min={0} />
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            💡 A 7% platform commission will be deducted from the task budget upon completion.
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Posting…' : 'Post Task'}
          </button>
        </form>
      </div>
    </div>
  );
}
