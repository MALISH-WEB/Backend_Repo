import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './StudentProgressPage.css';

const COMPETENCY_LABELS = {
  ip_configuration: 'IP Configuration',
  network_topology: 'Network Topology',
  connectivity_testing: 'Connectivity Testing',
  subnetting: 'Subnetting',
};

const SCENARIO_ICONS = {
  ip_config: '🖥️',
  subnetting: '🔢',
  connectivity: '📡',
};

function ScoreRing({ score }) {
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  return (
    <div className="score-ring-sm" style={{ borderColor: color, color }}>
      {score}%
    </div>
  );
}

export default function StudentProgressPage() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get(`/labs/progress/${studentId}`)
      .then(res => setProgress(res.data))
      .catch(() => setError('Failed to load progress data.'))
      .finally(() => setLoading(false));
  }, [studentId, user, navigate]);

  // Aggregate competencies across all labs
  const skillMap = {};
  progress.forEach(p => {
    (p.skills || []).forEach(s => {
      skillMap[s] = skillMap[s] || { count: 0, totalScore: 0 };
      skillMap[s].count += 1;
      skillMap[s].totalScore += Number(p.accuracy);
    });
  });
  const skills = Object.entries(skillMap).map(([key, v]) => ({
    key,
    label: COMPETENCY_LABELS[key] || key,
    avgScore: Math.round(v.totalScore / v.count),
    labCount: v.count,
  }));

  const overallAvg = progress.length
    ? Math.round(progress.reduce((s, p) => s + Number(p.accuracy), 0) / progress.length)
    : 0;

  return (
    <div className="progress-page">
      <div className="progress-hero">
        <h1>📊 My Competency Report</h1>
        <p>Track your networking skills and lab performance</p>
      </div>

      <div className="progress-container">
        {loading && <div className="loading-state">Loading progress…</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <>
            {/* Summary cards */}
            <div className="summary-cards">
              <div className="summary-card">
                <div className="summary-value">{progress.length}</div>
                <div className="summary-label">Labs Completed</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">{overallAvg}%</div>
                <div className="summary-label">Average Score</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">{skills.length}</div>
                <div className="summary-label">Skills Practised</div>
              </div>
            </div>

            {/* Skills matrix */}
            {skills.length > 0 && (
              <section className="progress-section">
                <h2>Competency Matrix</h2>
                <div className="skills-grid">
                  {skills.map(s => (
                    <div key={s.key} className="skill-card">
                      <div className="skill-name">{s.label}</div>
                      <div className="skill-bar-wrap">
                        <div
                          className="skill-bar"
                          style={{
                            width: `${s.avgScore}%`,
                            background: s.avgScore >= 80 ? '#16a34a' : s.avgScore >= 50 ? '#d97706' : '#dc2626',
                          }}
                        />
                      </div>
                      <span className="skill-score">{s.avgScore}%</span>
                      <span className="skill-count">{s.labCount} lab{s.labCount > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Per-lab history */}
            <section className="progress-section">
              <div className="section-header">
                <h2>Lab History</h2>
                <Link to="/labs" className="btn-primary-sm">+ Try More Labs</Link>
              </div>

              {progress.length === 0 && (
                <div className="empty-state">
                  <span>🧪</span>
                  <p>No labs completed yet. <Link to="/labs">Explore available labs →</Link></p>
                </div>
              )}

              <div className="lab-history">
                {progress.map(p => (
                  <div key={p.id} className="history-card">
                    <div className="history-icon">
                      {SCENARIO_ICONS[p.scenario_type] || '🔬'}
                    </div>
                    <div className="history-body">
                      <div className="history-title">{p.lab_title}</div>
                      <div className="history-meta">
                        <span>Task Completion: {p.task_completion}%</span>
                        <span>Attempts: {p.attempts}</span>
                        <span>{new Date(p.assessed_at).toLocaleDateString()}</span>
                      </div>
                      {(p.skills || []).length > 0 && (
                        <div className="history-skills">
                          {p.skills.map(s => (
                            <span key={s} className="skill-tag">
                              {COMPETENCY_LABELS[s] || s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ScoreRing score={Number(p.accuracy)} />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
