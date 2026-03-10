import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--off-white)' }}>
      {/* Hero */}
      <div style={{ background: 'var(--gradient)', color: '#fff', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💧</div>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem' }}>Drizzle</h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: 600, margin: '0 auto 2rem' }}>
          Transform social media addiction into income, digital skills, and healthier online habits.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-lg" style={{ background: '#fff', color: 'var(--blue)', fontWeight: 700 }}>Get Started Free</Link>
          <Link to="/login" className="btn btn-lg" style={{ border: '2px solid rgba(255,255,255,0.6)', color: '#fff', background: 'transparent' }}>Sign In</Link>
        </div>
      </div>

      {/* Features */}
      <div className="container" style={{ padding: '4rem 1.5rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Why Drizzle?</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-500)', marginBottom: '3rem' }}>Everything you need to earn, learn and grow online</p>

        <div className="grid-3">
          {[
            { icon: '💰', title: 'Earn from Social Media', desc: 'Get paid by local businesses to promote their products and services on your social media accounts.' },
            { icon: '📚', title: 'Learn Digital Skills', desc: 'Access free training modules on content creation, branding, digital marketing and entrepreneurship.' },
            { icon: '🌿', title: 'Healthy Digital Habits', desc: 'Receive wellness alerts, screen-time reminders and mental health tips to maintain balance.' },
            { icon: '🏢', title: 'For Businesses', desc: 'Connect with verified local influencers to promote your brand affordably and track campaign performance.' },
            { icon: '🔒', title: 'Secure Payments', desc: 'Earnings are held in escrow and released automatically when work is approved. 7% platform commission.' },
            { icon: '🎯', title: 'Smart Matching', desc: 'Our algorithm matches influencers with businesses based on niche, location and engagement.' },
          ].map(f => (
            <div key={f.title} className="card">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'var(--gradient-soft)', padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>Ready to start earning?</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: '2rem' }}>Join thousands of young creators turning their passion into income</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg">Join as Creator</Link>
          <Link to="/register" className="btn btn-outline btn-lg">Register as Business</Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)', fontSize: '0.875rem', borderTop: '1px solid var(--gray-100)' }}>
        © {new Date().getFullYear()} Drizzle · Empowering Youth Through Digital Skills
      </footer>
    </div>
  );
}
