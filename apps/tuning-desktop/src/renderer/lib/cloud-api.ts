// ─── Cloud API Client ─────────────────────────────────────────────────────────
// JWT-authenticated HTTP client for the redcore cloud API.
// Handles automatic token refresh on 401 and network error normalization.

/* eslint-disable @typescript-eslint/no-explicit-any */
const _configuredUrl: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "";

if (_configuredUrl && !_configuredUrl.startsWith("https://") && !_configuredUrl.startsWith("http://localhost")) {
  throw new Error(`VITE_API_URL must use HTTPS, got: ${_configuredUrl}`);
}

const RAW_BASE_URL: string = _configuredUrl || "https://api.redcoreos.net";
const BASE_URL: string = RAW_BASE_URL.endsWith("/v1")
  ? RAW_BASE_URL
  : `${RAW_BASE_URL.replace(/\/$/, "")}/v1`;

export interface CloudApiError {
  status: number;
  message: string;
  code?: string;
}

export class CloudApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "CloudApiRequestError";
    this.status = status;
    this.code = code;
  }
}

// ─── Token storage (module-level to avoid circular deps with auth store) ──────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onTokenRefreshed: ((access: string, refresh: string) => void) | null = null;
let _onAuthError: (() => void) | null = null;

export function configureApiClient(opts: {
  onTokenRefreshed: (access: string, refresh: string) => void;
  onAuthError: () => void;
}) {
  _onTokenRefreshed = opts.onTokenRefreshed;
  _onAuthError = opts.onAuthError;
}

export function setApiTokens(access: string, refresh: string) {
  _accessToken = access;
  _refreshToken = refresh;
}

export function clearApiTokens() {
  _accessToken = null;
  _refreshToken = null;
}

// ─── In-flight refresh de-duplication ─────────────────────────────────────────

let _refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!_refreshToken) return false;
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const resp = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: _refreshToken }),
      });
      if (!resp.ok) return false;
      const data = (await resp.json()) as { accessToken: string; refreshToken: string };
      _accessToken = data.accessToken;
      _refreshToken = data.refreshToken;
      _onTokenRefreshed?.(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ─── Core request ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new CloudApiRequestError(0, "Network error — check your connection");
  }

  // Auto-refresh on 401
  if (resp.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(method, path, body, false);
    } else {
      _onAuthError?.();
      throw new CloudApiRequestError(401, "Session expired — please sign in again");
    }
  }

  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    let code: string | undefined;
    try {
      const err = (await resp.json()) as { error?: string; message?: string; code?: string };
      message = err.error ?? err.message ?? message;
      code = err.code;
    } catch {
      // ignore parse errors
    }
    throw new CloudApiRequestError(resp.status, message, code);
  }

  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

// ─── Typed API surface ────────────────────────────────────────────────────────

export interface AuthLoginRequest { email: string; password: string }
export interface AuthRegisterRequest { email: string; password: string; displayName?: string }
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  tier: "free" | "premium" | "expert";
  subscriptionStatus: "active" | "past_due" | "cancelled" | "expired" | "trialing";
  createdAt?: string;
  avatarUrl?: string | null;
  emailVerified?: string | boolean | null;
  role?: string;
}
export interface SubscriptionDetails {
  tier: "free" | "premium" | "expert";
  status: "active" | "past_due" | "cancelled" | "expired" | "trialing";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: { brand: string; last4: string } | null;
}
interface SubscriptionStatusResponse {
  tier: SubscriptionDetails["tier"];
  status: SubscriptionDetails["status"];
  subscription?: Partial<SubscriptionDetails> | null;
}
export interface CloudPreferences {
  telemetryEnabled?: boolean;
  autoUpdate?: boolean;
  notificationsEnabled?: boolean;
  autoBackup?: boolean;
  showRiskWarnings?: boolean;
  expertMode?: boolean;
  logLevel?: "error" | "warn" | "info" | "debug";
  extra?: Record<string, unknown>;
}
export interface ConnectedAccount {
  id?: string;
  provider: string;
  providerEmail?: string | null;
  createdAt?: string;
}
export interface MachineActivation {
  id: string;
  machineFingerprint?: string;
  hostname?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
  status: "active" | "revoked";
  activatedAt?: string;
  lastSeenAt?: string;
}
export interface ProfileResponse {
  user: UserProfile;
  subscription: SubscriptionDetails;
  preferences: CloudPreferences | null;
  connectedAccounts: ConnectedAccount[];
  machines?: MachineActivation[];
}

type RawUserProfile = Partial<UserProfile> & {
  id: string;
  email: string;
  name?: string | null;
  displayName?: string | null;
};

type RawProfileResponse = {
  user: RawUserProfile;
  subscription?: Partial<SubscriptionDetails> | null;
  preferences?: CloudPreferences | null;
  connectedAccounts?: ConnectedAccount[];
  machines?: MachineActivation[];
};

function normalizeUserProfile(user: RawUserProfile): UserProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? user.name ?? null,
    tier: user.tier ?? "free",
    subscriptionStatus: user.subscriptionStatus ?? "active",
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl ?? null,
    emailVerified: user.emailVerified ?? null,
    role: user.role,
  };
}

function normalizeSubscription(
  subscription?: Partial<SubscriptionDetails> | null,
): SubscriptionDetails {
  return {
    tier: subscription?.tier ?? "free",
    status: subscription?.status ?? "expired",
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    paymentMethod: subscription?.paymentMethod ?? null,
  };
}

function normalizeProfileResponse(data: RawProfileResponse): ProfileResponse {
  return {
    user: normalizeUserProfile(data.user),
    subscription: normalizeSubscription(data.subscription),
    preferences: data.preferences ?? null,
    connectedAccounts: data.connectedAccounts ?? [],
    machines: data.machines ?? [],
  };
}

export const cloudApi = {
  auth: {
    login: async (data: AuthLoginRequest) => {
      const response = await request<{
        accessToken: string;
        refreshToken: string;
        user: RawUserProfile;
      }>("POST", "/auth/login", data);
      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: normalizeUserProfile(response.user),
      } satisfies AuthResponse;
    },
    register: async (data: AuthRegisterRequest) => {
      const response = await request<{
        accessToken: string;
        refreshToken: string;
        user: RawUserProfile;
      }>("POST", "/auth/register", {
        email: data.email,
        password: data.password,
        name: data.displayName,
      });
      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: normalizeUserProfile(response.user),
      } satisfies AuthResponse;
    },
    me: async () => {
      const response = await request<RawProfileResponse>("GET", "/users/me");
      return normalizeProfileResponse(response);
    },
    logout: () =>
      request<void>("POST", "/auth/logout"),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>(
        "POST", "/auth/refresh", { refreshToken }
      ),
    forgotPassword: (email: string) =>
      request<{ message: string }>("POST", "/auth/forgot-password", { email }),
  },
  users: {
    updateProfile: async (data: { displayName?: string }) => {
      const response = await request<{ user: RawUserProfile }>("PATCH", "/users/me", {
        name: data.displayName,
      });
      return normalizeUserProfile(response.user);
    },
    deleteAccount: (data: { confirmation: "DELETE MY ACCOUNT"; password?: string }) =>
      request<{ ok: true }>("DELETE", "/users/me", data),
  },
  subscription: {
    get: async () => {
      const response = await request<SubscriptionStatusResponse>("GET", "/subscription/status");
      return normalizeSubscription(
        response.subscription ?? {
          tier: response.tier,
          status: response.status,
        },
      );
    },
    checkout: (data: { tier: "premium" | "expert"; billingPeriod: "monthly" | "annual" }) =>
      request<{ checkoutUrl: string; sessionId: string }>("POST", "/subscription/checkout", data),
    portal: () =>
      request<{ portalUrl: string }>("POST", "/subscription/portal"),
    activate: (token: string) =>
      request<{ success: boolean }>("POST", "/license/activate", { token }),
    deactivate: () =>
      request<{ success: boolean }>("POST", "/license/deactivate"),
  },
};
