import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './LabListPage.css';

const SCENARIO_LABELS = {
  ip_config: 'IP Configuration',
  subnetting: 'Subnetting',
  connectivity: 'Connectivity Testing',
};

const SCENARIO_ICONS = {
  ip_config: '🖥️',
  subnetting: '🔢',
  connectivity: '📡',
};

export default function LabListPage() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/labs')
      .then(res => setLabs(res.data))
      .catch(() => setError('Failed to load labs. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="lab-list-page">
      <div className="lab-list-hero">
        <h1>🔬 Virtual Networking Lab</h1>
        <p>
          Hands-on networking experiments aligned with Uganda&apos;s
          Competency-Based Curriculum (CBC)
        </p>
      </div>

      <div className="lab-list-container">
        <div className="lab-list-header">
          <h2>Available Labs</h2>
          <Link to="/labs/teacher" className="btn btn-primary-sm">
            + Create Lab
          </Link>
        </div>

        {loading && <div className="loading-state">Loading labs…</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && labs.length === 0 && (
          <div className="empty-state">
            <span>🧪</span>
            <p>No labs available yet. A teacher can create one using the button above.</p>
          </div>
        )}

        <div className="labs-grid">
          {labs.map(lab => (
            <div key={lab.id} className="lab-card">
              <div className="lab-card-icon">
                {SCENARIO_ICONS[lab.scenario_type] || '🔬'}
              </div>
              <div className="lab-card-body">
                <span className="lab-badge">{SCENARIO_LABELS[lab.scenario_type] || lab.scenario_type}</span>
                <h3>{lab.title}</h3>
                <p className="lab-description">
                  {lab.description?.length > 120
                    ? lab.description.slice(0, 120) + '…'
                    : lab.description}
                </p>
                <div className="lab-meta">
                  {lab.teacher_name && (
                    <span>👤 {lab.teacher_name}</span>
                  )}
                  <span>📅 {new Date(lab.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <Link to={`/labs/${lab.id}`} className="btn btn-primary-sm lab-start-btn">
                Start Lab →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
