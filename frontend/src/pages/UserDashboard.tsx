import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { clearSession, getSession } from '../lib/auth';
import { socket } from '../lib/socket';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type SubmissionState = 'idle' | 'pending' | 'correct' | 'incorrect';

function buildImageProxyUrl(rawUrl: string, download = false): string {
  const url = new URL('/api/media/image', API_BASE);
  url.searchParams.set('url', rawUrl);
  if (download) {
    url.searchParams.set('download', '1');
  }
  return url.toString();
}

function buildWeservUrl(rawUrl: string): string {
  const remote = new URL(rawUrl);
  return `https://images.weserv.nl/?url=${encodeURIComponent(`${remote.host}${remote.pathname}${remote.search}`)}&output=jpg`;
}

type Question = {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string | null;
  startingScore: number | null;
  reductionAmount: number | null;
  minimumScore: number | null;
} | null;
type BoardRow = { id: string; name: string; totalScore: number };

export function UserDashboard() {
  const session = useMemo(() => getSession(), []);
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question>(null);
  const [leaderboard, setLeaderboard] = useState<BoardRow[]>([]);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [questionImageSrc, setQuestionImageSrc] = useState<string | null>(null);
  const [imageFallbackStep, setImageFallbackStep] = useState(0);

  useEffect(() => {
    if (!question?.imageUrl) {
      setQuestionImageSrc(null);
      setImageFallbackStep(0);
      return;
    }

    setQuestionImageSrc(buildImageProxyUrl(question.imageUrl));
    setImageFallbackStep(0);
  }, [question?.imageUrl]);

  useEffect(() => {
    if (!session || session.role !== 'team') {
      navigate('/dashboard/auth');
      return;
    }

    void api.getQuestion().then((data) => setQuestion(data.question));
    void api.getLeaderboard().then((data) => setLeaderboard(data.leaderboard));
    void api.getSubmissionStatus().then((data) => {
      setSubmissionState(data.status);

      if (data.status === 'pending') {
        setMessage('Your answer is awaiting admin review.');
      } else if (data.status === 'correct') {
        setMessage(`Your answer was marked correct. Score awarded: ${data.submission?.awardedScore ?? 0}`);
      } else if (data.status === 'incorrect') {
        setMessage('Your previous answer was marked incorrect. Try again.');
      }
    });

    socket.connect();
    socket.emit('leaderboard:join');
    socket.emit('team:join', session.id);
    socket.on('question:update', (incomingQuestion: Question) => {
      setQuestion(incomingQuestion);
      setAnswer('');
      setSubmissionState('idle');
      setMessage('A new question has arrived from the lamp.');
    });
    socket.on('leaderboard:update', (rows: BoardRow[]) => setLeaderboard(rows));
    socket.on('submission:result', (result: { isCorrect: boolean; awardedScore: number | null; canSubmit: boolean }) => {
      if (result.isCorrect) {
        setSubmissionState('correct');
        setMessage(`Your answer was marked correct. Score awarded: ${result.awardedScore ?? 0}`);
        setAnswer('');
        return;
      }

      setSubmissionState(result.canSubmit ? 'incorrect' : 'pending');
      setMessage('Your answer was marked incorrect. You can submit another answer.');
    });

    return () => {
      socket.off('question:update');
      socket.off('leaderboard:update');
      socket.off('submission:result');
      socket.emit('team:leave', session.id);
      socket.emit('leaderboard:leave');
      socket.disconnect();
    };
  }, [navigate, session]);

  function handleImageError() {
    if (!question?.imageUrl) {
      return;
    }

    if (imageFallbackStep === 0) {
      setQuestionImageSrc(question.imageUrl);
      setImageFallbackStep(1);
      return;
    }

    if (imageFallbackStep === 1) {
      setQuestionImageSrc(buildWeservUrl(question.imageUrl));
      setImageFallbackStep(2);
      return;
    }

    setQuestionImageSrc(null);
    setMessage('Image preview is blocked by the source site. Use Download Image to open it directly.');
  }

  async function submitAnswer() {
    setMessage('');
    if (!session) {
      setMessage('Session lost. Please login again.');
      return;
    }
    try {
      await api.submitAnswer(answer);
      setSubmissionState('pending');
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
          {question?.imageUrl && (
            <div className="question-image-wrap">
              {questionImageSrc ? (
                <img className="question-image" src={questionImageSrc} alt={question.title} onError={handleImageError} />
              ) : (
                <p className="status-text">Preview unavailable for this image source.</p>
              )}
              <a className="ghost-btn" href={buildImageProxyUrl(question.imageUrl, true)} target="_blank" rel="noreferrer">
                Download Image
              </a>
            </div>
          )}
        </article>

        <article className="glow-card">
          <span className="label">Your Answer</span>
          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write your answer with clarity and courage..."
            rows={8}
            disabled={!question || submissionState === 'pending' || submissionState === 'correct'}
          />
          <button
            className="gold-btn"
            disabled={!question || !answer.trim() || submissionState === 'pending' || submissionState === 'correct'}
            onClick={submitAnswer}
          >
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
