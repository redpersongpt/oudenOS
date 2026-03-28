// ─── @redcore/auth-core ──────────────────────────────────────────────────────
// Shared JWT authentication for the redcoreECO platform.

export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./tokens.js";

export { requireAuth, requireAdmin } from "./middleware.js";

export type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenPayload,
  VerifiedAccessToken,
  VerifiedRefreshToken,
  AuthConfig,
} from "./types.js";

export { DEFAULT_AUTH_CONFIG } from "./types.js";
