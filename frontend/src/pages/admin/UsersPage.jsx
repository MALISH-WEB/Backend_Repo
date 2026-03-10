import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const r = await api.get('/admin/users'); setUsers(r.data); }
    catch { /**/ } finally { setLoading(false); }
  }

  async function verify(userId, verified) {
    try {
      await api.put(`/admin/users/${userId}/verify`, { verified });
      setMsg(`User ${verified ? 'verified' : 'unverified'}`);
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
  }

  async function activate(userId, active) {
    try {
      await api.put(`/admin/users/${userId}/activate`, { active });
      setMsg(`User ${active ? 'activated' : 'deactivated'}`);
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
  }

  async function deleteUser(userId) {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setMsg('User deleted');
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>👥 Users</h1>
        <p>Manage platform users</p>
      </div>
      {msg && <div className="alert alert-info">{msg}</div>}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Active</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-purple' : u.role === 'business' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span></td>
                  <td>{u.is_verified ? '✅' : '❌'}</td>
                  <td>{u.is_active ? '✅' : '❌'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => verify(u.id, !u.is_verified)}>
                        {u.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => activate(u.id, !u.is_active)}>
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                      {u.role !== 'admin' && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
