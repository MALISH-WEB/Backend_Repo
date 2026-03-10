import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const r = await api.get('/users/me');
      setProfile(r.data);
      setForm({
        name: r.data.name,
        bio: r.data.profile?.bio || r.data.profile?.description || '',
        location: r.data.profile?.location || '',
        niche: r.data.profile?.niche || '',
        instagram: r.data.profile?.instagram || '',
        tiktok: r.data.profile?.tiktok || '',
        youtube: r.data.profile?.youtube || '',
        twitter: r.data.profile?.twitter || '',
        follower_count: r.data.profile?.follower_count || '',
        engagement_rate: r.data.profile?.engagement_rate || '',
        business_name: r.data.profile?.business_name || '',
        industry: r.data.profile?.industry || '',
        website: r.data.profile?.website || '',
      });
    } catch { /**/ } finally { setLoading(false); }
  }

  async function save(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.put('/users/me', form);
      setMsg('Profile updated! ✅');
      updateUser({ ...user, name: form.name });
      setEditing(false);
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed to update'); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!profile) return <div className="page"><div className="alert alert-error">Could not load profile</div></div>;

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>👤 My Profile</h1>
          <p>{profile.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {profile.is_verified && <span className="badge badge-green">✅ Verified</span>}
          <span className={`badge ${profile.role === 'admin' ? 'badge-purple' : profile.role === 'business' ? 'badge-blue' : 'badge-green'}`}>{profile.role}</span>
        </div>
      </div>

      {msg && <div className={`alert ${msg.includes('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      {editing ? (
        <div className="card">
          <form onSubmit={save}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            {profile.role === 'influencer' && (
              <>
                <div className="form-group"><label>Bio</label><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
                <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div className="form-group"><label>Niche</label><input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} /></div>
                <div className="grid-2">
                  <div className="form-group"><label>Instagram</label><input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@handle" /></div>
                  <div className="form-group"><label>TikTok</label><input value={form.tiktok} onChange={e => setForm({ ...form, tiktok: e.target.value })} placeholder="@handle" /></div>
                  <div className="form-group"><label>YouTube</label><input value={form.youtube} onChange={e => setForm({ ...form, youtube: e.target.value })} /></div>
                  <div className="form-group"><label>Twitter</label><input value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} placeholder="@handle" /></div>
                </div>
                <div className="grid-2">
                  <div className="form-group"><label>Followers</label><input type="number" value={form.follower_count} onChange={e => setForm({ ...form, follower_count: e.target.value })} /></div>
                  <div className="form-group"><label>Engagement Rate (%)</label><input type="number" step="0.01" value={form.engagement_rate} onChange={e => setForm({ ...form, engagement_rate: e.target.value })} /></div>
                </div>
              </>
            )}
            {profile.role === 'business' && (
              <>
                <div className="form-group"><label>Business Name</label><input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} /></div>
                <div className="form-group"><label>About</label><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
                <div className="form-group"><label>Industry</label><input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></div>
                <div className="form-group"><label>Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div className="form-group"><label>Website</label><input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>{profile.name}</h2>
              {profile.profile?.bio && <p style={{ color: 'var(--gray-600)', marginTop: '0.25rem' }}>{profile.profile.bio}</p>}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit Profile</button>
          </div>

          {profile.role === 'influencer' && profile.profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {profile.profile.location && <div><span style={{ fontWeight: 600 }}>📍 Location:</span> {profile.profile.location}</div>}
              {profile.profile.niche && <div><span style={{ fontWeight: 600 }}>🎯 Niche:</span> {profile.profile.niche}</div>}
              {profile.profile.follower_count > 0 && <div><span style={{ fontWeight: 600 }}>👥 Followers:</span> {Number(profile.profile.follower_count).toLocaleString()}</div>}
              {profile.profile.engagement_rate > 0 && <div><span style={{ fontWeight: 600 }}>📊 Engagement:</span> {profile.profile.engagement_rate}%</div>}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {profile.profile.instagram && <a href={`https://instagram.com/${profile.profile.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="badge badge-purple">📸 Instagram</a>}
                {profile.profile.tiktok && <span className="badge badge-blue">🎵 TikTok</span>}
                {profile.profile.youtube && <span className="badge badge-red">▶ YouTube</span>}
                {profile.profile.twitter && <span className="badge badge-gray">🐦 Twitter</span>}
              </div>
            </div>
          )}

          {profile.role === 'business' && profile.profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {profile.profile.business_name && <div><span style={{ fontWeight: 600 }}>🏢 Business:</span> {profile.profile.business_name}</div>}
              {profile.profile.industry && <div><span style={{ fontWeight: 600 }}>🏭 Industry:</span> {profile.profile.industry}</div>}
              {profile.profile.location && <div><span style={{ fontWeight: 600 }}>📍 Location:</span> {profile.profile.location}</div>}
              {profile.profile.website && <div><span style={{ fontWeight: 600 }}>🌐 Website:</span> <a href={profile.profile.website} target="_blank" rel="noreferrer">{profile.profile.website}</a></div>}
              {profile.profile.is_approved ? <span className="badge badge-green">✅ Approved Business</span> : <span className="badge badge-yellow">⏳ Pending Approval</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
