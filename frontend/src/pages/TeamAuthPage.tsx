import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { saveSession } from '../lib/auth';

export function TeamAuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <main className="page form-page">
      <section className="glow-card auth-card">
        <h2>{isRegister ? 'Summon Your Team' : 'Team Login'}</h2>
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
