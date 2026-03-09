import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './CreateProjectPage.css';

export default function CreateProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', category: '', faculty: '', github_url: '', live_url: '',
  });
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/faculties')]).then(([cRes, fRes]) => {
      setCategories(cRes.data);
      setFaculties(fRes.data);
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => { if (value) data.append(key, value); });
    if (file) data.append('file', file);

    try {
      const res = await api.post('/projects', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit project. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-page">
      <div className="create-container">
        <div className="create-header">
          <h1>Submit Your Project</h1>
          <p>Share your innovation with the UCU community</p>
        </div>

        <div className="create-card">
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="create-form" encType="multipart/form-data">
            <div className="form-group">
              <label>Project Title <span className="required">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="My Awesome Project"
                required
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label>Description <span className="required">*</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what your project does, the problem it solves, and the technologies used…"
                required
                rows={5}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category <span className="required">*</span></label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Faculty <span className="required">*</span></label>
                <select
                  value={form.faculty}
                  onChange={e => setForm({ ...form, faculty: e.target.value })}
                  required
                >
                  <option value="">Select faculty…</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>GitHub URL</label>
                <input
                  type="url"
                  value={form.github_url}
                  onChange={e => setForm({ ...form, github_url: e.target.value })}
                  placeholder="https://github.com/user/repo"
                />
              </div>
              <div className="form-group">
                <label>Live Demo URL</label>
                <input
                  type="url"
                  value={form.live_url}
                  onChange={e => setForm({ ...form, live_url: e.target.value })}
                  placeholder="https://myproject.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Attachment (optional)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="project-file"
                  onChange={e => setFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg"
                />
                <label htmlFor="project-file" className="file-label">
                  {file ? `📎 ${file.name}` : '📎 Choose file (PDF, DOC, ZIP, image)'}
                </label>
              </div>
            </div>

            <div className="create-actions">
              <button type="button" className="btn-cancel" onClick={() => navigate('/projects')}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Submitting…' : '🚀 Submit Project'}
              </button>
            </div>
          </form>
        </div>

        <div className="create-info">
          <span>ℹ️</span>
          <p>Your project will be reviewed by an admin before it appears in the public listing.</p>
        </div>
      </div>
    </div>
  );
}
