import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function SubscriptionPage() {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/subscriptions/my').then(r => setCurrent(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function subscribe(plan) {
    setSubscribing(plan);
    setMsg('');
    try {
      await api.post('/subscriptions', { plan });
      setMsg(`Successfully subscribed to ${plan} plan! 🎉`);
      const res = await api.get('/subscriptions/my');
      setCurrent(res.data);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Subscription failed');
    } finally { setSubscribing(null); }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const plans = [
    {
      id: 'basic', name: 'Basic', price: 'UGX 8,000/mo',
      features: ['Post up to 5 tasks/month', 'Basic influencer matching', 'Standard analytics', 'Email support'],
      color: 'blue',
    },
    {
      id: 'premium', name: 'Premium', price: 'UGX 17,000/mo',
      features: ['Unlimited tasks', 'Priority influencer matching', 'Advanced analytics', 'Premium visibility boost', 'Priority support'],
      color: 'purple',
    },
  ];

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>⭐ Subscription Plans</h1>
        <p>Choose a plan that fits your business needs</p>
      </div>

      {current && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          ✅ You are currently on the <strong>{current.plan}</strong> plan. Expires: {current.expires_at}
        </div>
      )}

      {msg && <div className={`alert ${msg.includes('🎉') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      <div className="grid-2">
        {plans.map(plan => (
          <div key={plan.id} className="card" style={{ border: current?.plan === plan.id ? '2px solid var(--blue)' : '1px solid var(--gray-100)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <span className={`badge badge-${plan.color}`}>{plan.name}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: plan.color === 'purple' ? 'var(--purple)' : 'var(--blue)', marginBottom: '1rem' }}>
              {plan.price}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {plan.features.map(f => (
                <li key={f} style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>✓ {f}</li>
              ))}
            </ul>
            <button
              className={`btn btn-${plan.id === 'premium' ? 'primary' : 'outline'} btn-lg`}
              style={{ width: '100%' }}
              disabled={subscribing === plan.id || current?.plan === plan.id}
              onClick={() => subscribe(plan.id)}>
              {subscribing === plan.id ? 'Processing…' : current?.plan === plan.id ? 'Current Plan' : `Subscribe to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '2rem', background: 'var(--gradient-soft)' }}>
        <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>💰 Revenue Model</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
          <p>• 7% commission deducted from each completed task payment</p>
          <p>• Basic plan: UGX 8,000/month for standard features</p>
          <p>• Premium plan: UGX 17,000/month for premium visibility & unlimited tasks</p>
        </div>
      </div>
    </div>
  );
}
