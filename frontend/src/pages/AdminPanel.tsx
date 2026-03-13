import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearSession, getSession } from '../lib/auth';
import { socket } from '../lib/socket';

type Submission = {
  id: string;
  answer: string;
  isCorrect: boolean | null;
  awardedScore: number | null;
  createdAt: string;
  team: { name: string };
};

type LeaderboardRow = {
  id: string;
  name: string;
  totalScore: number;
};

type DustParticle = {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  size: number;
  dx: number;
  dy: number;
};

export function AdminPanel() {
  const navigate = useNavigate();
  const session = useMemo(() => getSession(), []);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [questionScoring, setQuestionScoring] = useState({
    startingScore: '',
    reductionAmount: '',
    minimumScore: ''
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [activeTab, setActiveTab] = useState<'submissions' | 'leaderboard'>('submissions');
  const [status, setStatus] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isClearingUsers, setIsClearingUsers] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [cursorDust, setCursorDust] = useState({ x: 0, y: 0, visible: false });
  const [particles, setParticles] = useState<DustParticle[]>([]);

  const pendingCount = submissions.length;
  const totalTeams = leaderboard.length;
  const topTeam = leaderboard[0];

  useEffect(() => {
    if (!session || session.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    void api.getSubmissions().then((data) => setSubmissions(data.submissions));
    void api.getLeaderboard().then((data) => setLeaderboard(data.leaderboard));
    socket.connect();
    socket.emit('leaderboard:join');
    socket.on('submission:new', () => {
      void api.getSubmissions().then((data) => setSubmissions(data.submissions));
    });
    socket.on('submission:update', (rows: Submission[]) => {
      setSubmissions(rows);
    });
    socket.on('question:update', () => {
      setSubmissions([]);
    });
    socket.on('leaderboard:update', (rows: LeaderboardRow[]) => {
      setLeaderboard(rows);
    });

    return () => {
      socket.off('submission:new');
      socket.off('submission:update');
      socket.off('question:update');
      socket.off('leaderboard:update');
      socket.emit('leaderboard:leave');
      socket.disconnect();
    };
  }, [navigate, session]);

  useEffect(() => {
    function handleWindowMove(event: MouseEvent) {
      const x = event.clientX;
      const y = event.clientY;
      const now = Date.now();

      setCursorDust({ x, y, visible: true });
      setParticles((prev) => {
        const fresh = prev.filter((particle) => now - particle.createdAt < 700);
        const particle: DustParticle = {
          id: now + Math.floor(Math.random() * 100000),
          x,
          y,
          createdAt: now,
          size: 1.8 + Math.random() * 2.2,
          dx: (Math.random() - 0.5) * 24,
          dy: (Math.random() - 0.5) * 24
        };

        return [...fresh, particle].slice(-48);
      });
    }

    function handleWindowLeave() {
      setCursorDust((prev) => ({ ...prev, visible: false }));
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((particle) => now - particle.createdAt < 700));
    }, 90);

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseout', handleWindowLeave);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseout', handleWindowLeave);
      window.clearInterval(timer);
    };
  }, []);

  async function updateQuestion(event: FormEvent) {
    event.preventDefault();
    if (isBroadcasting) {
      return;
    }

    setIsBroadcasting(true);
    setStatus('');
    try {
      const parseRequiredNumber = (value: string, fieldName: string): number => {
        const trimmed = value.trim();
        if (!trimmed) {
          throw new Error(`${fieldName} is required for each question`);
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
          throw new Error(`${fieldName} must be a valid number`);
        }
        return parsed;
      };

      const response = await api.updateQuestion({
        title,
        prompt,
        imageUrl: imageUrl.trim() || null,
        startingScore: parseRequiredNumber(questionScoring.startingScore, 'Starting score'),
        reductionAmount: parseRequiredNumber(questionScoring.reductionAmount, 'Reduction amount'),
        minimumScore: parseRequiredNumber(questionScoring.minimumScore, 'Minimum score')
      });
      setTitle('');
      setPrompt('');
      setImageUrl('');
      setQuestionScoring({ startingScore: '', reductionAmount: '', minimumScore: '' });
      setSubmissions(response.submissions);
      setStatus('Question updated and broadcasted live.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update question');
    } finally {
      setIsBroadcasting(false);
    }
  }

  async function markSubmission(id: string, isCorrect: boolean) {
    if (gradingSubmissionId) {
      return;
    }

    setGradingSubmissionId(id);
    setStatus('');
    try {
      const response = await api.scoreSubmission(id, isCorrect);
      setSubmissions(response.submissions);
      setLeaderboard(response.leaderboard);
      setStatus('Submission scoring updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to score submission');
    } finally {
      setGradingSubmissionId(null);
    }
  }

  async function clearUsers() {
    if (isClearingUsers) {
      return;
    }

    const confirmed = window.confirm('This will delete all team users and all their submissions. Continue?');
    if (!confirmed) {
      return;
    }

    setIsClearingUsers(true);
    setStatus('');
    try {
      const response = await api.clearTeams();
      setSubmissions(response.submissions);
      setLeaderboard(response.leaderboard);
      setStatus(`Cleared ${response.deletedTeams} team users.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to clear users');
    } finally {
      setIsClearingUsers(false);
    }
  }

  function logout() {
    clearSession();
    navigate('/admin/login');
  }

  return (
    <main className="page admin-page">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="cursor-particle"
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

      <div
        className={`cursor-dust${cursorDust.visible ? ' active' : ''}`}
        style={{ left: cursorDust.x, top: cursorDust.y }}
        aria-hidden="true"
      />

      <header className="top-header glow-card">
        <div>
          <span className="label">Admin</span>
          <h2>{session?.name}</h2>
          <span className="label">Control center for questions, grading, and rankings</span>
        </div>
        <button className="ghost-btn" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="admin-summary-grid">
        <article className="glow-card admin-summary-card">
          <span className="label">Pending Reviews</span>
          <strong className="admin-metric">{pendingCount}</strong>
          <p>Submissions waiting for your grading decision.</p>
        </article>
        <article className="glow-card admin-summary-card">
          <span className="label">Registered Teams</span>
          <strong className="admin-metric">{totalTeams}</strong>
          <p>Teams currently visible on the leaderboard.</p>
        </article>
        <article className="glow-card admin-summary-card">
          <span className="label">Top Team</span>
          <strong className="admin-metric">{topTeam ? topTeam.name : '--'}</strong>
          <p>{topTeam ? `${topTeam.totalScore} points` : 'No scores yet'}</p>
        </article>
      </section>

      <section className="grid-two">
        <form className="glow-card stack-gap admin-control-card" onSubmit={updateQuestion}>
          <span className="label">Active Question Control</span>
          <input
            placeholder="Question title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <textarea
            placeholder="Question prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={6}
            required
          />
          <input
            placeholder="Image URL (optional)"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
          <span className="label">Question Scoring (set per question)</span>
          <label className="field-label">
            Starting Score
            <input
              type="number"
              min={1}
              required
              placeholder="Set score for first correct team"
              value={questionScoring.startingScore}
              onChange={(event) =>
                setQuestionScoring((prev) => ({
                  ...prev,
                  startingScore: event.target.value
                }))
              }
            />
          </label>
          <label className="field-label">
            Reduction Amount
            <input
              type="number"
              min={1}
              required
              placeholder="Points reduced per next correct team"
              value={questionScoring.reductionAmount}
              onChange={(event) =>
                setQuestionScoring((prev) => ({
                  ...prev,
                  reductionAmount: event.target.value
                }))
              }
            />
          </label>
          <label className="field-label">
            Minimum Score
            <input
              type="number"
              min={1}
              required
              placeholder="Lowest score limit for correct answers"
              value={questionScoring.minimumScore}
              onChange={(event) =>
                setQuestionScoring((prev) => ({
                  ...prev,
                  minimumScore: event.target.value
                }))
              }
            />
          </label>
          <button className="gold-btn" disabled={isBroadcasting}>
            {isBroadcasting ? 'Broadcasting...' : 'Broadcast New Question'}
          </button>
        </form>

        <section className="glow-card submissions-card admin-side-panel">
          <div className="admin-tab-row">
            <button
              className={activeTab === 'submissions' ? 'gold-btn' : 'ghost-btn'}
              onClick={() => setActiveTab('submissions')}
              type="button"
            >
              Submitted Answers
            </button>
            <button
              className={activeTab === 'leaderboard' ? 'gold-btn' : 'ghost-btn'}
              onClick={() => setActiveTab('leaderboard')}
              type="button"
            >
              Leaderboard
            </button>
          </div>

          {activeTab === 'submissions' ? (
            <>
              <span className="label">Submitted Answers</span>
              <div className="submission-list">
                {submissions.map((submission) => (
                  <article key={submission.id} className="submission-item">
                    <header>
                      <strong>{submission.team.name}</strong>
                      <span>{new Date(submission.createdAt).toLocaleTimeString()}</span>
                    </header>
                    <p>{submission.answer}</p>
                    <div className="submission-actions">
                      <button
                        className="gold-btn"
                        disabled={gradingSubmissionId !== null}
                        onClick={() => markSubmission(submission.id, true)}
                      >
                        {gradingSubmissionId === submission.id ? 'Grading...' : 'Mark Correct'}
                      </button>
                      <button
                        className="ghost-btn"
                        disabled={gradingSubmissionId !== null}
                        onClick={() => markSubmission(submission.id, false)}
                      >
                        Mark Incorrect
                      </button>
                      <span className="score-pill">{submission.awardedScore ?? 0} pts</span>
                    </div>
                  </article>
                ))}
                {submissions.length === 0 && (
                  <p className="status-text">No pending submissions for the active question.</p>
                )}
              </div>
            </>
          ) : (
            <section className="leaderboard-card admin-leaderboard-panel">
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
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leaderboard.length === 0 && <p className="status-text">Leaderboard is empty right now.</p>}
            </section>
          )}
        </section>
      </section>

      <section className="glow-card stack-gap">
        <span className="label">Database Control</span>
        <p className="status-text">Delete all registered team users and remove their submissions.</p>
        <button className="ghost-btn" disabled={isClearingUsers} onClick={clearUsers}>
          {isClearingUsers ? 'Clearing Users...' : 'Clear All Users'}
        </button>
      </section>

      {status && <p className="status-text centered">{status}</p>}
    </main>
  );
}
