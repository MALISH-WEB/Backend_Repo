import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function SubmitProofPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ proof_url: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/tasks/${id}/submit`, form);
      navigate('/tasks', { state: { msg: 'Proof submitted successfully! 🎉' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit proof');
    } finally { setLoading(false); }
  }

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1>📤 Submit Proof</h1>
        <p>Provide evidence that you completed the promotional task</p>
      </div>
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Proof URL (link to your post)</label>
            <input type="url" value={form.proof_url} onChange={e => setForm({ ...form, proof_url: e.target.value })} placeholder="https://instagram.com/p/..." required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what you did…" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit Proof'}
          </button>
        </form>
      </div>
    </div>
  );
}
