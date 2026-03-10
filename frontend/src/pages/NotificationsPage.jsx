import { useState, useEffect } from 'react';
import api from '../services/api';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try { const r = await api.get('/notifications'); setNotifs(r.data); }
    catch { /**/ } finally { setLoading(false); }
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setMsg('All marked as read');
      load();
    } catch { /**/ }
  }

  async function markRead(id) {
    try { await api.put(`/notifications/read/${id}`); load(); }
    catch { /**/ }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const unread = notifs.filter(n => !n.is_read);

  return (
    <div className="page" style={{ maxWidth: 700 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>🔔 Notifications</h1>
          <p>{unread.length > 0 ? `${unread.length} unread` : 'All caught up!'}</p>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>Mark all read</button>
        )}
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      {notifs.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🔔</div><p>No notifications</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifs.map(n => (
            <div key={n.id} style={{
              padding: '1rem 1.25rem', borderRadius: 'var(--radius)',
              background: n.is_read ? '#fff' : '#EFF6FF',
              border: '1px solid', borderColor: n.is_read ? 'var(--gray-100)' : '#BFDBFE',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem'
            }}>
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-800)', marginBottom: '0.25rem' }}>{n.message}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
              {!n.is_read && (
                <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }} onClick={() => markRead(n.id)}>Read</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
