import { type FormEvent, type MouseEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { saveSession } from '../lib/auth';

type AuthParticle = {
  id: number;
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  createdAt: number;
};

export function TeamAuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cursorDust, setCursorDust] = useState({ x: 0, y: 0, visible: false });
  const [particles, setParticles] = useState<AuthParticle[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((particle) => now - particle.createdAt < 650));
    }, 80);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function handleCursorMove(event: MouseEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const now = Date.now();

    setCursorDust({ x, y, visible: true });

    setParticles((prev) => {
      const fresh = prev.filter((particle) => now - particle.createdAt < 650);
      const particle: AuthParticle = {
        id: now + Math.floor(Math.random() * 100000),
        x,
        y,
        size: 1.4 + Math.random() * 1.6,
        dx: (Math.random() - 0.5) * 16,
        dy: (Math.random() - 0.5) * 16,
        createdAt: now
      };

      return [...fresh, particle].slice(-28);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isRegister ? await api.teamRegister(name, password) : await api.teamLogin(name, password);
      saveSession(response.token, { id: response.team.id, role: 'team', name: response.team.name });
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="page form-page auth-magic-page"
      onMouseMove={handleCursorMove}
      onMouseEnter={() => setCursorDust((prev) => ({ ...prev, visible: true }))}
      onMouseLeave={() => setCursorDust((prev) => ({ ...prev, visible: false }))}
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="auth-cursor-particle"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            ['--dx' as string]: `${particle.dx}px`,
            ['--dy' as string]: `${particle.dy}px`
          }}
          aria-hidden="true"
        />
      ))}
      <span
        className={`auth-cursor-dust${cursorDust.visible ? ' active' : ''}`}
        style={{ left: cursorDust.x, top: cursorDust.y }}
        aria-hidden="true"
      />

      <section className="glow-card auth-card auth-scroll-card">
        <p className="label">Genie Entry Chamber</p>
        <h2>{isRegister ? 'Summon Your Team' : 'Team Login'}</h2>
        <p className="status-text">Step forward with your team identity and begin the trial.</p>
        <form onSubmit={handleSubmit} className="stack-gap">
          <label className="field-label">
            Team Name
            <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
          </label>
          <label className="field-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="gold-btn" disabled={loading}>
            {loading ? 'Casting...' : isRegister ? 'Register Team' : 'Enter Dashboard'}
          </button>
        </form>
        <button className="ghost-btn" onClick={() => setIsRegister((prev) => !prev)}>
          {isRegister ? 'Already have a team? Login' : 'Need an account? Register'}
        </button>
      </section>
    </main>
  );
}
