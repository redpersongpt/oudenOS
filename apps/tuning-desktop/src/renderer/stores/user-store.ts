// ─── User Store ───────────────────────────────────────────────────────────────
// Thin wrapper around auth-store + cloudApi for profile/subscription data.

import { create } from "zustand";
import { cloudApi, setApiTokens, clearApiTokens, type UserProfile, type SubscriptionDetails } from "@/lib/cloud-api";

// Re-export compatible type aliases
export type CloudUser = UserProfile;
export type CloudSubscription = SubscriptionDetails;
export interface CloudPreferences {
  telemetry: boolean;
  autoUpdate: boolean;
  notifications: boolean;
}
export interface ConnectedAccount {
  provider: string;
  providerId: string;
}
export interface MachineActivation {
  id: string;
  name: string;
  status: "active" | "revoked";
  lastSeen: string;
}

interface UserStoreState {
  // Auth
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Data
  user: CloudUser | null;
  subscription: CloudSubscription | null;
  preferences: CloudPreferences | null;
  connectedAccounts: ConnectedAccount[];
  machines: MachineActivation[];

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { displayName?: string }) => Promise<void>;
  fetchSubscription: () => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserStoreState>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  user: null,
  subscription: null,
  preferences: null,
  connectedAccounts: [],
  machines: [],

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await cloudApi.auth.login({ email, password });
      setApiTokens(result.accessToken, result.refreshToken);
      set({ isAuthenticated: true, user: result.user });
      await get().fetchProfile();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Login failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const result = await cloudApi.auth.register({ email, password, displayName });
      setApiTokens(result.accessToken, result.refreshToken);
      set({
        isAuthenticated: true,
        user: result.user,
        subscription: { tier: "free", status: "active", currentPeriodEnd: null, cancelAtPeriodEnd: false, paymentMethod: null },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Registration failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    clearApiTokens();
    set({
      isAuthenticated: false,
      user: null,
      subscription: null,
      preferences: null,
      connectedAccounts: [],
      machines: [],
    });
  },

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await cloudApi.auth.me();
      set({
        user: data,
        isAuthenticated: true,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load profile" });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (_data) => {
    // TODO: Add updateProfile endpoint to cloudApi
  },

  fetchSubscription: async () => {
    const sub = await cloudApi.subscription.get();
    set({ subscription: sub });
  },

  clearError: () => set({ error: null }),
}));
