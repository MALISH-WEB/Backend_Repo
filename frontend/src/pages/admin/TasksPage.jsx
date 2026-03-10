import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/tasks').then(r => setTasks(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>📋 All Tasks</h1>
        <p>Monitor all promotional tasks on the platform</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Business</th><th>Budget</th><th>Platform</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td>{t.business_name || t.business_owner}</td>
                  <td>UGX {Number(t.budget).toLocaleString()}</td>
                  <td>{t.platform || '—'}</td>
                  <td><span className={`badge ${t.status === 'completed' ? 'badge-green' : t.status === 'open' ? 'badge-blue' : 'badge-yellow'}`}>{t.status}</span></td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
