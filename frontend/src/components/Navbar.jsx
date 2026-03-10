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
    api.get('/notifications')
      .then(res => setUnread(res.data.filter(n => !n.is_read).length))
      .catch(() => {});
  }, [user, location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const dashboardPath = user?.role === 'business' ? '/business/dashboard'
    : user?.role === 'admin' ? '/admin/dashboard'
    : '/dashboard';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={user ? dashboardPath : '/'} className="navbar-brand">
          <span className="brand-logo">💧</span>
          Drizzle
        </Link>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {user?.role === 'influencer' && (
            <>
              <Link to="/tasks" className="nav-link" onClick={() => setMenuOpen(false)}>Tasks</Link>
              <Link to="/dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/training" className="nav-link" onClick={() => setMenuOpen(false)}>Training</Link>
              <Link to="/wellness" className="nav-link" onClick={() => setMenuOpen(false)}>Wellness</Link>
              <Link to="/wallet" className="nav-link" onClick={() => setMenuOpen(false)}>Wallet</Link>
            </>
          )}

          {user?.role === 'business' && (
            <>
              <Link to="/business/dashboard" className="nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/business/tasks/new" className="nav-link" onClick={() => setMenuOpen(false)}>+ Post Task</Link>
              <Link to="/business/campaigns" className="nav-link" onClick={() => setMenuOpen(false)}>Campaigns</Link>
            </>
          )}

          {user?.role === 'admin' && (
            <div className="nav-dropdown">
              <button className="nav-link dropdown-toggle">Admin ▾</button>
              <div className="dropdown-menu">
                <Link to="/admin/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link to="/admin/users" className="dropdown-item" onClick={() => setMenuOpen(false)}>Users</Link>
                <Link to="/admin/businesses" className="dropdown-item" onClick={() => setMenuOpen(false)}>Businesses</Link>
                <Link to="/admin/tasks" className="dropdown-item" onClick={() => setMenuOpen(false)}>Tasks</Link>
                <Link to="/admin/payments" className="dropdown-item" onClick={() => setMenuOpen(false)}>Payments</Link>
                <Link to="/admin/training" className="dropdown-item" onClick={() => setMenuOpen(false)}>Training</Link>
                <Link to="/admin/wellness" className="dropdown-item" onClick={() => setMenuOpen(false)}>Wellness</Link>
              </div>
            </div>
          )}

          {user ? (
            <div className="nav-right">
              <Link to="/notifications" className="notif-btn" title="Notifications" onClick={() => setMenuOpen(false)}>
                🔔
                {unread > 0 && <span className="notif-badge">{unread}</span>}
              </Link>
              <Link to="/profile" className="nav-link" onClick={() => setMenuOpen(false)}>Profile</Link>
              <button onClick={handleLogout} className="btn btn-outline-sm">Logout</button>
            </div>
          ) : (
            <div className="nav-right">
              <Link to="/login" className="btn btn-outline-sm" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-primary-sm" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
