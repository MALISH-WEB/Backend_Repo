import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AuthPages.css';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('influencer');
  const [form, setForm] = useState({ name: '', email: '', password: '', location: '', niche: '', business_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { ...form, role });
      login(res.data.user, res.data.token);
      navigate(role === 'business' ? '/business/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">💧</span>
          <div className="auth-brand">Drizzle</div>
          <h1>Create your account</h1>
          <p>Start earning or growing your brand today</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="role-selector">
          <div className={`role-option ${role === 'influencer' ? 'selected' : ''}`} onClick={() => setRole('influencer')}>
            <span className="role-option-icon">🎯</span>
            <span className="role-option-label">Influencer / Creator</span>
          </div>
          <div className={`role-option ${role === 'business' ? 'selected' : ''}`} onClick={() => setRole('business')}>
            <span className="role-option-icon">🏢</span>
            <span className="role-option-label">Business / SME</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required autoFocus />
          </div>

          {role === 'business' && (
            <div className="form-group">
              <label>Business Name</label>
              <input type="text" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="My Business Ltd" />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" required minLength={6} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Kampala, Uganda" />
          </div>

          {role === 'influencer' && (
            <div className="form-group">
              <label>Your Niche</label>
              <select value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })}>
                <option value="">Select niche…</option>
                <option>Lifestyle</option>
                <option>Fashion & Beauty</option>
                <option>Food & Drink</option>
                <option>Tech & Gaming</option>
                <option>Fitness & Health</option>
                <option>Travel</option>
                <option>Education</option>
                <option>Comedy & Entertainment</option>
                <option>Business & Finance</option>
                <option>Music & Arts</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Creating account…' : `Join as ${role === 'business' ? 'Business' : 'Creator'}`}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
