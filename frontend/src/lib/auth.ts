export type Role = 'team' | 'admin';

export interface SessionInfo {
  id: string;
  role: Role;
  name: string;
}

const TOKEN_KEY = 'genie_token';
const SESSION_KEY = 'genie_session';

export function saveSession(token: string, session: SessionInfo): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): SessionInfo | null {
  const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionInfo;
  } catch {
    return null;
  }
}
