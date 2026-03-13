const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type QuestionDto = {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string | null;
  startingScore: number | null;
  reductionAmount: number | null;
  minimumScore: number | null;
};

type QuestionUpdatePayload = {
  title: string;
  prompt: string;
  imageUrl: string | null;
  startingScore: number | null;
  reductionAmount: number | null;
  minimumScore: number | null;
};

function getToken(): string | null {
  return sessionStorage.getItem('genie_token') ?? localStorage.getItem('genie_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error ?? 'Request failed');
  }

  return (await response.json()) as T;
}

export const api = {
  teamRegister: (name: string, password: string) =>
    request<{ token: string; team: { id: string; name: string } }>('api/auth/team/register', {
      method: 'POST',
      body: JSON.stringify({ name, password })
    }),
  teamLogin: (name: string, password: string) =>
    request<{ token: string; team: { id: string; name: string } }>('api/auth/team/login', {
      method: 'POST',
      body: JSON.stringify({ name, password })
    }),
  adminLogin: (username: string, password: string) =>
    request<{ token: string; admin: { id: string; username: string } }>('api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getPublicLeaderboard: () =>
    request<{ leaderboard: Array<{ id: string; name: string; totalScore: number }> }>('api/public/leaderboard'),
  getQuestion: () => request<{ question: QuestionDto | null }>('api/user/question'),
  getSubmissionStatus: () =>
    request<{
      status: 'idle' | 'pending' | 'correct' | 'incorrect';
      canSubmit: boolean;
      submission: {
        id: string;
        isCorrect: boolean | null;
        awardedScore: number | null;
        createdAt: string;
      } | null;
    }>('api/user/submission-status'),
  submitAnswer: (answer: string) =>
    request<{ submissionId: string; status: 'pending'; canSubmit: false }>('api/user/submit', {
      method: 'POST',
      body: JSON.stringify({ answer })
    }),
  getLeaderboard: () =>
    request<{ leaderboard: Array<{ id: string; name: string; totalScore: number }> }>('api/user/leaderboard'),
  updateQuestion: (payload: QuestionUpdatePayload) =>
    request<{
      question: QuestionDto;
      submissions: Array<{
        id: string;
        answer: string;
        isCorrect: boolean | null;
        awardedScore: number | null;
        createdAt: string;
        team: { name: string };
      }>;
    }>('api/admin/question', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  getSubmissions: () =>
    request<{
      submissions: Array<{
        id: string;
        answer: string;
        isCorrect: boolean | null;
        awardedScore: number | null;
        createdAt: string;
        team: { name: string };
      }>;
    }>('api/admin/submissions'),
  clearTeams: () =>
    request<{
      success: boolean;
      deletedTeams: number;
      submissions: Array<{
        id: string;
        answer: string;
        isCorrect: boolean | null;
        awardedScore: number | null;
        createdAt: string;
        team: { name: string };
      }>;
      leaderboard: Array<{ id: string; name: string; totalScore: number }>;
    }>('api/admin/teams', {
      method: 'DELETE'
    }),
  scoreSubmission: (id: string, isCorrect: boolean) =>
    request<{
      success: boolean;
      submissions: Array<{
        id: string;
        answer: string;
        isCorrect: boolean | null;
        awardedScore: number | null;
        createdAt: string;
        team: { name: string };
      }>;
      leaderboard: Array<{ id: string; name: string; totalScore: number }>;
    }>(`api/admin/submissions/${id}/score`, {
      method: 'PATCH',
      body: JSON.stringify({ isCorrect })
    }),
  getScoringConfig: () =>
    request<{ config: { startingScore: number; reductionAmount: number; minimumScore: number } }>('api/admin/scoring-config'),
  updateScoringConfig: (startingScore: number, reductionAmount: number, minimumScore: number) =>
    request<{ config: { startingScore: number; reductionAmount: number; minimumScore: number } }>('api/admin/scoring-config', {
      method: 'PATCH',
      body: JSON.stringify({ startingScore, reductionAmount, minimumScore })
    })
};
