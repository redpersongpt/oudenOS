// ─── Auth State Store ────────────────────────────────────────────────────────
// Persisted JWT auth store with high-level login/register/logout actions.
//
// NOTE on "encrypted" storage: tokens are base64-encoded to protect against
// casual inspection of localStorage. For production-grade encryption, wire
// Electron's safeStorage API via IPC (main process) and replace the custom
// storage adapter below.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  cloudApi,
  CloudApiRequestError,
  configureApiClient,
  setApiTokens,
  clearApiTokens,
} from "@/lib/cloud-api";
import type { UserProfile } from "@/lib/cloud-api";
import { useLicenseStore } from "@/stores/license-store";
import type { LicenseState } from "@redcore/shared-schema/license";

// ─── Obfuscated storage adapter ───────────────────────────────────────────────
// Wraps localStorage with base64 encode/decode. Not cryptographic — use
// Electron safeStorage via IPC for real encryption in production.

const obfuscatedStorage = createJSONStorage(() => ({
  getItem: (key: string) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return atob(raw);
    } catch {
      return raw; // fallback for non-encoded data (migration)
    }
  },
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, btoa(value));
  },
  removeItem: (key: string) => localStorage.removeItem(key),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  // Persisted data
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Ephemeral UI state
  loading: boolean;
  error: string | null;

  // Low-level primitives (used by App init + cloud-api callbacks)
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  clearError: () => void;

  // High-level actions
  initialize: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

function buildLicenseState(user: UserProfile | null): LicenseState | null {
  if (!user) return null;
  return {
    tier: user.tier ?? "free",
    status: user.subscriptionStatus ?? "expired",
    expiresAt: null,
    deviceBound: false,
    deviceId: null,
    lastValidatedAt: new Date().toISOString(),
    offlineGraceDays: 0,
    offlineDaysRemaining: 0,
    features: [],
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── Persisted ──────────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // ── Ephemeral ──────────────────────────────────────────────────────────
      loading: false,
      error: null,

      // ── Low-level primitives ───────────────────────────────────────────────

      setAuth: (user, accessToken, refreshToken) => {
        setApiTokens(accessToken, refreshToken);
        const license = buildLicenseState(user);
        if (license) {
          useLicenseStore.getState().setLicense(license);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      updateTokens: (accessToken, refreshToken) => {
        setApiTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        clearApiTokens();
        useLicenseStore.setState({ license: null });
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      // ── High-level actions ─────────────────────────────────────────────────

      initialize: () => {
        // Wire API client callbacks for token refresh + auth errors
        configureApiClient({
          onTokenRefreshed: (access, refresh) => {
            get().updateTokens(access, refresh);
          },
          onAuthError: () => {
            get().clearAuth();
          },
        });

        // Re-hydrate API client from persisted tokens
        const { accessToken, refreshToken } = get();
        if (accessToken && refreshToken) {
          setApiTokens(accessToken, refreshToken);
          const license = buildLicenseState(get().user);
          if (license) {
            useLicenseStore.getState().setLicense(license);
          }
        }
      },

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const result = await cloudApi.auth.login({ email: email.trim(), password });
          get().setAuth(result.user, result.accessToken, result.refreshToken);
          return true;
        } catch (err) {
          const message =
            err instanceof CloudApiRequestError
              ? err.message
              : "Something went wrong. Please try again.";
          set({ error: message });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      register: async (email, password, displayName) => {
        set({ loading: true, error: null });
        try {
          const result = await cloudApi.auth.register({
            email: email.trim(),
            password,
            displayName: displayName?.trim() || undefined,
          });
          get().setAuth(result.user, result.accessToken, result.refreshToken);
          return true;
        } catch (err) {
          const message =
            err instanceof CloudApiRequestError
              ? err.message
              : "Something went wrong. Please try again.";
          set({ error: message });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        try {
          // Best-effort server-side invalidation — ignore errors
          await cloudApi.auth.logout();
        } catch {
          // ignore
        }
        get().clearAuth();
      },

      refreshTokens: async () => {
        const { refreshToken: token } = get();
        if (!token) return false;
        try {
          const result = await cloudApi.auth.refresh(token);
          get().updateTokens(result.accessToken, result.refreshToken);
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "redcore-auth",
      storage: obfuscatedStorage,
      // Only persist auth data — loading/error are ephemeral
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && state.refreshToken) {
          setApiTokens(state.accessToken, state.refreshToken);
        }
      },
    },
  ),
);

// ─── App init helper ──────────────────────────────────────────────────────────
// Called once in App.tsx useEffect — wires API callbacks to store.

export function initAuthClient() {
  useAuthStore.getState().initialize();
}
