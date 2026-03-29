// ─── User Store ───────────────────────────────────────────────────────────────
// Thin wrapper around auth-store + cloudApi for profile/subscription data.

import { create } from "zustand";
import {
  cloudApi,
  setApiTokens,
  clearApiTokens,
  type UserProfile,
  type SubscriptionDetails,
  type ConnectedAccount,
  type MachineActivation,
  type CloudPreferences,
} from "@/lib/cloud-api";
import { useLicenseStore } from "@/stores/license-store";

// Re-export compatible type aliases
export type CloudUser = UserProfile;
export type CloudSubscription = SubscriptionDetails;
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
      useLicenseStore.getState().setLicense({
        tier: result.user.tier,
        status: result.user.subscriptionStatus,
        expiresAt: null,
        deviceBound: false,
        deviceId: null,
        lastValidatedAt: new Date().toISOString(),
        offlineGraceDays: 0,
        offlineDaysRemaining: 0,
        features: [],
      });
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
      useLicenseStore.getState().setLicense({
        tier: result.user.tier,
        status: result.user.subscriptionStatus,
        expiresAt: null,
        deviceBound: false,
        deviceId: null,
        lastValidatedAt: new Date().toISOString(),
        offlineGraceDays: 0,
        offlineDaysRemaining: 0,
        features: [],
      });
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
    try {
      await cloudApi.auth.logout();
    } catch {
      // ignore network/logout failures and clear local state anyway
    }
    clearApiTokens();
    useLicenseStore.setState({ license: null });
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
        user: data.user,
        subscription: data.subscription,
        preferences: data.preferences,
        connectedAccounts: data.connectedAccounts,
        machines: data.machines ?? [],
        isAuthenticated: true,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load profile" });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await cloudApi.users.updateProfile(data);
      set({ user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update profile" });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSubscription: async () => {
    const sub = await cloudApi.subscription.get();
    set({ subscription: sub });
  },

  clearError: () => set({ error: null }),
}));
