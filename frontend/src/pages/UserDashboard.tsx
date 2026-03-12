import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearSession, getSession } from '../lib/auth';
import { socket } from '../lib/socket';

type Question = { id: string; title: string; prompt: string } | null;
type BoardRow = { id: string; name: string; totalScore: number };

export function UserDashboard() {
  const session = useMemo(() => getSession(), []);
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question>(null);
  const [leaderboard, setLeaderboard] = useState<BoardRow[]>([]);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session || session.role !== 'team') {
      navigate('/dashboard/auth');
      return;
    }

    void api.getQuestion().then((data) => setQuestion(data.question));
    void api.getLeaderboard().then((data) => setLeaderboard(data.leaderboard));

    socket.connect();
    socket.emit('leaderboard:join');
    socket.on('question:update', (incomingQuestion: Question) => {
      setQuestion(incomingQuestion);
      setAnswer('');
      setMessage('A new question has arrived from the lamp.');
    });
    socket.on('leaderboard:update', (rows: BoardRow[]) => setLeaderboard(rows));

    return () => {
      socket.off('question:update');
      socket.off('leaderboard:update');
      socket.emit('leaderboard:leave');
      socket.disconnect();
    };
  }, [navigate, session]);

  async function submitAnswer() {
    setMessage('');
    if (!session) {
      setMessage('Session lost. Please login again.');
      return;
    }
    try {
      await api.submitAnswer(answer);
      setMessage('Answer submitted. Awaiting judgement from the Genie Council.');
      setAnswer('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed');
    }
  }

  function logout() {
    clearSession();
    navigate('/dashboard/auth');
  }

  return (
    <main className="page dashboard-page">
      <header className="top-header glow-card">
        <div>
          <span className="label">Team</span>
          <h2>{session?.name ?? 'Unknown Team'}</h2>
          <span className="label">Signed in as {session?.name ?? 'Unknown Team'}</span>
        </div>
        <button className="ghost-btn" onClick={logout}>
          Exit
        </button>
      </header>

      <section className="grid-two">
        <article className="glow-card question-card">
          <span className="label">Current Question</span>
          <h3>{question?.title ?? 'Awaiting the next magical challenge'}</h3>
          <p>{question?.prompt ?? 'The lamp is silent for now.'}</p>
        </article>

        <article className="glow-card">
          <span className="label">Your Answer</span>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write your answer with clarity and courage..."
            rows={8}
            disabled={!question}
          />
          <button className="gold-btn" disabled={!question || !answer.trim()} onClick={submitAnswer}>
            Submit Answer
          </button>
          {message && <p className="status-text">{message}</p>}
        </article>
      </section>

      <section className="glow-card leaderboard-card">
        <div className="leaderboard-title-row">
          <span className="label">Leaderboard</span>
          <span className="lamp-icon">Lamp</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, index) => (
              <tr key={row.id} className={row.name === session?.name ? 'highlight-row' : ''}>
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td>{row.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
