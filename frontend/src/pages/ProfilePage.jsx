import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ProfilePage.css';

export default function ProfilePage() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = user?.id === parseInt(id, 10);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/users/${id}/projects`),
    ])
      .then(([pRes, prRes]) => {
        setProfile(pRes.data);
        setForm({ name: pRes.data.name, email: pRes.data.email });
        setProjects(prRes.data);
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaveLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put(`/users/${id}`, form);
      setProfile(res.data);
      if (isOwner) updateUser({ ...user, name: res.data.name, email: res.data.email });
      setEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaveLoading(false);
    }
  }

  if (loading) return <div className="profile-loading">Loading profile…</div>;
  if (!profile) return <div className="profile-error">{error || 'Profile not found.'}</div>;

  return (
    <div className="profile-page">
      <div className="profile-container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="profile-card">
          <div className="profile-avatar">
            {profile.name?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            {editing ? (
              <form onSubmit={handleSave} className="profile-edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="profile-edit-actions">
                  <button type="submit" className="btn-save" disabled={saveLoading}>
                    {saveLoading ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="profile-name">{profile.name}</h1>
                <p className="profile-email">{profile.email}</p>
                {profile.faculty_name && (
                  <span className="profile-faculty">{profile.faculty_name}</span>
                )}
                <div className="profile-badges">
                  <span className={`badge badge-role ${profile.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                    {profile.role === 'admin' ? '⚡ Admin' : '👤 User'}
                  </span>
                  <span className="badge badge-projects">{projects.length} Projects</span>
                </div>
                {isOwner && (
                  <button className="btn-edit-profile" onClick={() => setEditing(true)}>
                    ✏️ Edit Profile
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="profile-projects">
          <h2 className="section-title">
            {isOwner ? 'My Projects' : `${profile.name}'s Projects`}
          </h2>

          {projects.length === 0 ? (
            <div className="empty-projects">
              <span>📂</span>
              <p>No projects yet.</p>
              {isOwner && <Link to="/projects/new" className="btn-new-project">Submit Your First Project</Link>}
            </div>
          ) : (
            <div className="profile-projects-grid">
              {projects.map(p => (
                <Link to={`/projects/${p.id}`} key={p.id} className="profile-project-card">
                  <div className="ppc-header">
                    <span className={`ppc-status status-${p.status}`}>{p.status}</span>
                    {p.category_name && <span className="ppc-category">{p.category_name}</span>}
                  </div>
                  <h3 className="ppc-title">{p.title}</h3>
                  <p className="ppc-desc">
                    {p.description?.length > 100 ? p.description.slice(0, 100) + '…' : p.description}
                  </p>
                  <span className="ppc-date">{new Date(p.created_at).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
