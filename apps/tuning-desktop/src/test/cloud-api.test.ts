import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setApiTokens,
  clearApiTokens,
  configureApiClient,
  CloudApiRequestError,
} from "@/lib/cloud-api";

describe("cloud-api — token management", () => {
  it("setApiTokens / clearApiTokens don't throw", () => {
    expect(() => setApiTokens("acc", "ref")).not.toThrow();
    expect(() => clearApiTokens()).not.toThrow();
  });

  it("configureApiClient accepts callbacks without throwing", () => {
    expect(() =>
      configureApiClient({
        onTokenRefreshed: vi.fn(),
        onAuthError: vi.fn(),
      }),
    ).not.toThrow();
  });
});

describe("CloudApiRequestError", () => {
  it("is an Error with status and optional code", () => {
    const err = new CloudApiRequestError(404, "Not found", "NOT_FOUND");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("CloudApiRequestError");
  });

  it("works without code", () => {
    const err = new CloudApiRequestError(500, "Server error");
    expect(err.code).toBeUndefined();
  });
});

describe("cloud-api — request behavior (mocked fetch)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearApiTokens();
  });

  it("throws CloudApiRequestError on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: "Validation failed", code: "INVALID_INPUT" }),
    } as Response);

    const { cloudApi } = await import("@/lib/cloud-api");
    await expect(cloudApi.auth.login({ email: "x@x.com", password: "wrong" })).rejects.toMatchObject({
      status: 422,
      message: "Validation failed",
      code: "INVALID_INPUT",
    });
  });

  it("throws network error when fetch rejects", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const { cloudApi } = await import("@/lib/cloud-api");
    await expect(cloudApi.auth.me()).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("Network error"),
    });
  });

  it("calls onAuthError and throws on 401 when no refresh token", async () => {
    const onAuthError = vi.fn();
    configureApiClient({ onTokenRefreshed: vi.fn(), onAuthError });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    const { cloudApi } = await import("@/lib/cloud-api");
    await expect(cloudApi.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(onAuthError).toHaveBeenCalled();
  });

  it("returns parsed JSON on 200", async () => {
    const profile = {
      user: {
        id: "u1",
        email: "a@b.com",
        name: "Test User",
        tier: "free",
        subscriptionStatus: "active",
        createdAt: "2026-01-01T00:00:00Z",
      },
      subscription: {
        tier: "free",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        paymentMethod: null,
      },
      preferences: null,
      connectedAccounts: [],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => profile,
    } as Response);

    setApiTokens("valid-token", "refresh-token");
    const { cloudApi: api } = await import("@/lib/cloud-api");
    const result = await api.auth.me();
    expect(result).toEqual({
      user: {
        id: "u1",
        email: "a@b.com",
        displayName: "Test User",
        tier: "free",
        subscriptionStatus: "active",
        createdAt: "2026-01-01T00:00:00Z",
        avatarUrl: null,
        emailVerified: null,
        role: undefined,
      },
      subscription: profile.subscription,
      preferences: null,
      connectedAccounts: [],
      machines: [],
    });
  });
});
