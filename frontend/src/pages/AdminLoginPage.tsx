import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { saveSession } from '../lib/auth';

export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.adminLogin(username, password);
      saveSession(response.token, { id: response.admin.id, role: 'admin', name: response.admin.username });
      navigate('/admin');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Admin login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page form-page">
      <section className="glow-card auth-card">
        <h2>Admin Chamber</h2>
        <form onSubmit={handleSubmit} className="stack-gap">
          <label className="field-label">
            Username
            <input
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label className="field-label">
            Password
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="gold-btn" disabled={loading}>
            {loading ? 'Opening Portal...' : 'Enter Admin Panel'}
          </button>
        </form>
      </section>
    </main>
  );
}
