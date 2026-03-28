// ─── Auth & SaaS Types ────────────────────────────────────────────────────────
// Shared request/response shapes for the cloud auth + subscription API.
// Used by both the main process (IPC handlers) and renderer (cloud-api client).

import type { SubscriptionTier, SubscriptionStatus } from "./license.js";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

// ─── Auth requests / responses ────────────────────────────────────────────────

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface AuthRefreshRequest {
  refreshToken: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface SubscriptionDetails {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: { brand: string; last4: string } | null;
}

export interface LicenseActivateRequest {
  token: string;
}

export interface LicenseActivateResponse {
  success: boolean;
}

// ─── IPC envelope ─────────────────────────────────────────────────────────────
// All auth IPC handlers return this shape so the renderer can check errors
// without parsing status codes.

export interface IpcResult<T> {
  data?: T;
  error?: string;
  status?: number;
}
