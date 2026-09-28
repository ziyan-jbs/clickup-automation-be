export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  email: string;
}

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  email: string;
  iss: string;
  aud: string;
  exp: number;
}
