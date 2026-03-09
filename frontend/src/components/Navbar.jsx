import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get(`/notifications/${user.id}`)
      .then(res => {
        const notifications = res.data;
        setUnread(notifications.filter(n => !n.is_read).length);
      })
      .catch(() => {});
  }, [user, location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/projects" className="navbar-brand">
          <span className="brand-icon">🚀</span>
          UCU Innovators
        </Link>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/projects" className="nav-link" onClick={() => setMenuOpen(false)}>Projects</Link>

          {user && (
            <>
              <Link to="/projects/new" className="nav-link" onClick={() => setMenuOpen(false)}>+ Submit</Link>
              <Link to={`/profile/${user.id}`} className="nav-link" onClick={() => setMenuOpen(false)}>Profile</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <div className="nav-dropdown">
              <button className="nav-link dropdown-toggle">Admin ▾</button>
              <div className="dropdown-menu">
                <Link to="/admin/approvals" className="dropdown-item" onClick={() => setMenuOpen(false)}>Approvals</Link>
                <Link to="/admin/users" className="dropdown-item" onClick={() => setMenuOpen(false)}>Users</Link>
                <Link to="/admin/analytics" className="dropdown-item" onClick={() => setMenuOpen(false)}>Analytics</Link>
              </div>
            </div>
          )}

          {user ? (
            <div className="nav-right">
              <Link to={`/notifications/${user.id}`} className="notif-btn" title="Notifications" onClick={() => setMenuOpen(false)}>
                🔔
                {unread > 0 && <span className="notif-badge">{unread}</span>}
              </Link>
              <button onClick={handleLogout} className="btn btn-outline-sm">Logout</button>
            </div>
          ) : (
            <div className="nav-right">
              <Link to="/login" className="btn btn-outline-sm" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-primary-sm" onClick={() => setMenuOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
