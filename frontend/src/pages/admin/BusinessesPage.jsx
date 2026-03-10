import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const r = await api.get('/admin/businesses'); setBusinesses(r.data); }
    catch { /**/ } finally { setLoading(false); }
  }

  async function approve(userId, approved) {
    try {
      await api.put(`/admin/businesses/${userId}/approve`, { approved });
      setMsg(`Business ${approved ? 'approved' : 'approval revoked'}`);
      load();
    } catch (err) { setMsg(err.response?.data?.message || 'Failed'); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏢 Businesses</h1>
        <p>Approve and manage business accounts</p>
      </div>
      {msg && <div className="alert alert-info">{msg}</div>}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business Name</th><th>Owner</th><th>Industry</th><th>Location</th><th>Approved</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.business_name}</td>
                  <td>{b.name}</td>
                  <td>{b.industry || '—'}</td>
                  <td>{b.location || '—'}</td>
                  <td>{b.is_approved ? '✅' : '❌'}</td>
                  <td>
                    <button className={`btn btn-sm ${b.is_approved ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => approve(b.id, !b.is_approved)}>
                      {b.is_approved ? 'Revoke' : 'Approve'}
                    </button>
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
