// ─── Shared Auth Types ──────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;
  role: string;
  type: "access";
  iss: string;
}

export interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
  iss: string;
}

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload;

export interface VerifiedAccessToken {
  userId: string;
  role: string;
}

export interface VerifiedRefreshToken {
  userId: string;
}

export interface AuthConfig {
  secret: string;
  issuer: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export const DEFAULT_AUTH_CONFIG: Omit<AuthConfig, "secret"> = {
  issuer: "redcore-platform",
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "30d",
};
