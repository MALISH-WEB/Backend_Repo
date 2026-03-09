import { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminPages.css';

const ROLES = ['user', 'admin'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  function loadUsers() {
    setLoading(true);
    api.get('/admin/users')
      .then(res => setUsers(res.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleRoleChange(userId, newRole) {
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Role updated.');
    } catch {
      setError('Failed to update role.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(userId) {
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      showToast('User deleted.');
    } catch {
      setError('Failed to delete user.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>User Management</h1>
          <p>{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>

        {toast && <div className="toast">{toast}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="loading-state">Loading users…</div>}

        {!loading && !error && (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Faculty</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-mini-avatar">{u.name?.charAt(0).toUpperCase()}</div>
                        <span className="user-name">{u.name}</span>
                      </div>
                    </td>
                    <td className="user-email">{u.email}</td>
                    <td>{u.faculty_name || '—'}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className={`role-select role-${u.role}`}
                        disabled={actionLoading}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn-delete-sm"
                        onClick={() => setDeleteConfirm(u.id)}
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete User</h3>
            <p>Are you sure you want to delete this user? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-reject" onClick={() => handleDelete(deleteConfirm)} disabled={actionLoading}>
                {actionLoading ? 'Deleting…' : 'Delete User'}
              </button>
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
