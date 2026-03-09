import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/notifications/${userId}`)
      .then(res => setNotifications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  async function markRead(id) {
    try {
      await api.put(`/notifications/read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => api.put(`/notifications/read/${n.id}`).catch(() => {})));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notif-page">
      <div className="notif-container">
        <div className="notif-header">
          <h1>Notifications {unreadCount > 0 && <span className="unread-badge">{unreadCount} new</span>}</h1>
          {unreadCount > 0 && (
            <button className="btn-mark-all" onClick={markAllRead}>Mark all as read</button>
          )}
        </div>

        {loading && <div className="notif-loading">Loading…</div>}

        {!loading && notifications.length === 0 && (
          <div className="notif-empty">
            <span>🔔</span>
            <p>No notifications yet.</p>
          </div>
        )}

        <div className="notif-list">
          {notifications.map(n => (
            <div key={n.id} className={`notif-item ${n.is_read ? 'read' : 'unread'}`}>
              <div className="notif-content">
                <p className="notif-message">{n.message}</p>
                <span className="notif-time">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              {!n.is_read && (
                <button className="btn-mark-read" onClick={() => markRead(n.id)}>✓</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
