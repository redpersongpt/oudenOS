// ─── Auth State Store ────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  configureApiClient,
  setApiTokens,
  clearApiTokens,
} from "@/lib/cloud-api";
import type { UserProfile } from "@/lib/cloud-api";

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        setApiTokens(accessToken, refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      updateTokens: (accessToken, refreshToken) => {
        setApiTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        clearApiTokens();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "redcore-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-hydrate API client tokens after store loads from localStorage
        if (state?.accessToken && state.refreshToken) {
          setApiTokens(state.accessToken, state.refreshToken);
        }
      },
    },
  ),
);

// Wire up API client callbacks (called once on app init)
export function initAuthClient() {
  configureApiClient({
    onTokenRefreshed: (access, refresh) => {
      useAuthStore.getState().updateTokens(access, refresh);
    },
    onAuthError: () => {
      useAuthStore.getState().clearAuth();
    },
  });

  // Re-hydrate tokens if already persisted
  const state = useAuthStore.getState();
  if (state.accessToken && state.refreshToken) {
    setApiTokens(state.accessToken, state.refreshToken);
  }
}
