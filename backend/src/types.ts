export type UserRole = 'team' | 'admin';

export interface AuthPayload {
  sub: string;
  role: UserRole;
  name: string;
}

export interface AuthedRequest {
  user?: AuthPayload;
}
