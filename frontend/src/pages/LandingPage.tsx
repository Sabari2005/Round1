import { useNavigate } from 'react-router-dom';
import { LampEmblem } from '../components/LampEmblem';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="page landing-page">
      <div className="magic-bg" aria-hidden="true" />
      <LampEmblem />
      <h1 className="magic-title">Chronicles of the Golden Lamp</h1>
      <p className="magic-subtitle">
        Enter the chamber where wisdom becomes power and every answer can alter destiny.
      </p>
      <button className="gold-btn" onClick={() => navigate('/dashboard/auth')}>
        Enter The Platform
      </button>
      <button className="ghost-btn" onClick={() => navigate('/admin/login')}>
        Admin Portal
      </button>
    </main>
  );
}
