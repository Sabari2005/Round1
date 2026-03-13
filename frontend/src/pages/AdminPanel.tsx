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
  const [status, setStatus] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isClearingUsers, setIsClearingUsers] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [config, setConfig] = useState({ startingScore: 100, reductionAmount: 10, minimumScore: 50 });

  useEffect(() => {
    if (!session || session.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    void api.getSubmissions().then((data) => setSubmissions(data.submissions));
    void api.getScoringConfig().then((data) => setConfig(data.config));

    socket.connect();
    socket.on('submission:new', () => {
      void api.getSubmissions().then((data) => setSubmissions(data.submissions));
    });
    socket.on('submission:update', (rows: Submission[]) => {
      setSubmissions(rows);
    });
    socket.on('question:update', () => {
      setSubmissions([]);
    });

    return () => {
      socket.off('submission:new');
      socket.off('submission:update');
      socket.off('question:update');
      socket.disconnect();
    };
  }, [navigate, session]);

  async function updateQuestion(event: FormEvent) {
    event.preventDefault();
    if (isBroadcasting) {
      return;
    }

    setIsBroadcasting(true);
    setStatus('');
    try {
      const parseOptionalNumber = (value: string): number | null => {
        const trimmed = value.trim();
        if (!trimmed) {
          return null;
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed)) {
          throw new Error('Question scoring fields must be valid numbers');
        }
        return parsed;
      };

      const response = await api.updateQuestion({
        title,
        prompt,
        imageUrl: imageUrl.trim() || null,
        startingScore: parseOptionalNumber(questionScoring.startingScore),
        reductionAmount: parseOptionalNumber(questionScoring.reductionAmount),
        minimumScore: parseOptionalNumber(questionScoring.minimumScore)
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
      setStatus('Submission scoring updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to score submission');
    } finally {
      setGradingSubmissionId(null);
    }
  }

  async function updateConfig(event: FormEvent) {
    event.preventDefault();
    setStatus('');
    try {
      await api.updateScoringConfig(config.startingScore, config.reductionAmount, config.minimumScore);
      setStatus('Scoring configuration saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save scoring config');
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
      <header className="top-header glow-card">
        <div>
          <span className="label">Admin</span>
          <h2>{session?.name}</h2>
        </div>
        <button className="ghost-btn" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="grid-two">
        <form className="glow-card stack-gap" onSubmit={updateQuestion}>
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
          <span className="label">Question-Specific Scoring (optional)</span>
          <label className="field-label">
            Starting Score
            <input
              type="number"
              min={1}
              placeholder="Uses global config when left blank"
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
              placeholder="Uses global config when left blank"
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
              placeholder="Uses global config when left blank"
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

        <form className="glow-card stack-gap" onSubmit={updateConfig}>
          <span className="label">Scoring Configuration</span>
          <label className="field-label">
            Starting Score
            <input
              type="number"
              min={50}
              value={config.startingScore}
              onChange={(event) => setConfig((prev) => ({ ...prev, startingScore: Number(event.target.value) }))}
            />
          </label>
          <label className="field-label">
            Reduction Amount
            <input
              type="number"
              min={1}
              value={config.reductionAmount}
              onChange={(event) => setConfig((prev) => ({ ...prev, reductionAmount: Number(event.target.value) }))}
            />
          </label>
          <label className="field-label">
            Minimum Score
            <input
              type="number"
              min={1}
              value={config.minimumScore}
              onChange={(event) => setConfig((prev) => ({ ...prev, minimumScore: Number(event.target.value) }))}
            />
          </label>
          <button className="gold-btn">Save Scoring Rules</button>
        </form>

        <section className="glow-card stack-gap">
          <span className="label">Database Control</span>
          <p className="status-text">Delete all registered team users and remove their submissions.</p>
          <button className="ghost-btn" disabled={isClearingUsers} onClick={clearUsers}>
            {isClearingUsers ? 'Clearing Users...' : 'Clear All Users'}
          </button>
        </section>
      </section>

      <section className="glow-card submissions-card">
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
        </div>
      </section>

      {status && <p className="status-text centered">{status}</p>}
    </main>
  );
}
