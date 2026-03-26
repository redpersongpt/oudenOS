import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the cloud-api module to avoid fetch issues in tests
vi.mock("@/lib/cloud-api", () => ({
  setApiTokens: vi.fn(),
  clearApiTokens: vi.fn(),
  configureApiClient: vi.fn(),
}));

// Import after mock
const { useAuthStore } = await import("@/stores/auth-store");

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  tier: "free" as const,
  subscriptionStatus: "active" as const,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it("setAuth populates user + tokens + isAuthenticated", () => {
    useAuthStore.getState().setAuth(mockUser, "access-tok", "refresh-tok");
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe("access-tok");
    expect(state.refreshToken).toBe("refresh-tok");
  });

  it("clearAuth resets all fields", () => {
    useAuthStore.getState().setAuth(mockUser, "access-tok", "refresh-tok");
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  it("updateTokens replaces only tokens, keeps user", () => {
    useAuthStore.getState().setAuth(mockUser, "old-access", "old-refresh");
    useAuthStore.getState().updateTokens("new-access", "new-refresh");
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe("new-access");
    expect(state.refreshToken).toBe("new-refresh");
    expect(state.isAuthenticated).toBe(true);
  });
});
