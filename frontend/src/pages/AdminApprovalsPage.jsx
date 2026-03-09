import { useState, useEffect } from 'react';
import api from '../services/api';
import './AdminPages.css';

export default function AdminApprovalsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  function loadProjects() {
    setLoading(true);
    api.get('/approvals/pending')
      .then(res => setProjects(res.data))
      .catch(() => setError('Failed to load pending projects.'))
      .finally(() => setLoading(false));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleApprove(id) {
    setActionLoading(true);
    try {
      await api.put(`/approvals/approve/${id}`);
      setProjects(prev => prev.filter(p => p.id !== id));
      showToast('Project approved!');
    } catch {
      setError('Failed to approve project.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.put(`/approvals/reject/${rejectModal}`, { reason: rejectReason });
      setProjects(prev => prev.filter(p => p.id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
      showToast('Project rejected.');
    } catch {
      setError('Failed to reject project.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Pending Approvals</h1>
          <p>{projects.length} project{projects.length !== 1 ? 's' : ''} awaiting review</p>
        </div>

        {toast && <div className="toast">{toast}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {loading && <div className="loading-state">Loading pending projects…</div>}

        {!loading && projects.length === 0 && !error && (
          <div className="empty-state">
            <span>✅</span>
            <p>All caught up! No pending projects.</p>
          </div>
        )}

        <div className="approvals-list">
          {projects.map(p => (
            <div key={p.id} className="approval-card">
              <div className="approval-header">
                <div>
                  <h3 className="approval-title">{p.title}</h3>
                  <div className="approval-meta">
                    <span>by {p.user_name || 'Unknown'}</span>
                    {p.category_name && <span className="dot">·</span>}
                    {p.category_name && <span>{p.category_name}</span>}
                    {p.faculty_name && <span className="dot">·</span>}
                    {p.faculty_name && <span>{p.faculty_name}</span>}
                    <span className="dot">·</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <p className="approval-desc">{p.description}</p>
              <div className="approval-links">
                {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
                {p.live_url && <a href={p.live_url} target="_blank" rel="noopener noreferrer">Live Demo ↗</a>}
              </div>
              <div className="approval-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(p.id)}
                  disabled={actionLoading}
                >
                  ✓ Approve
                </button>
                <button
                  className="btn-reject"
                  onClick={() => setRejectModal(p.id)}
                  disabled={actionLoading}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Reject Project</h3>
            <p>Please provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete description, missing links…"
              rows={4}
            />
            <div className="modal-actions">
              <button className="btn-reject" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
              <button className="btn-cancel" onClick={() => { setRejectModal(null); setRejectReason(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
