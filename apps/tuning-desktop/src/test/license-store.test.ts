import { describe, it, expect, beforeEach } from "vitest";
import { useLicenseStore } from "@/stores/license-store";
import type { LicenseState } from "@redcore/shared-schema/license";

const makeLicense = (tier: "free" | "premium", status: "active" | "expired" = "active"): LicenseState => ({
  tier,
  status,
  expiresAt: status === "active" ? "2027-01-01" : "2025-01-01",
  deviceBound: tier === "premium",
  deviceId: tier === "premium" ? "DEV-123" : null,
  lastValidatedAt: new Date().toISOString(),
  offlineGraceDays: 7,
  offlineDaysRemaining: 7,
  features: [],
});

describe("license-store", () => {
  beforeEach(() => {
    useLicenseStore.setState({ license: null });
  });

  it("isPremium returns false with no license", () => {
    expect(useLicenseStore.getState().isPremium()).toBe(false);
  });

  it("isPremium returns false for free tier", () => {
    useLicenseStore.getState().setLicense(makeLicense("free"));
    expect(useLicenseStore.getState().isPremium()).toBe(false);
  });

  it("isPremium returns true for active premium", () => {
    useLicenseStore.getState().setLicense(makeLicense("premium", "active"));
    expect(useLicenseStore.getState().isPremium()).toBe(true);
  });

  it("isPremium returns false for expired premium", () => {
    useLicenseStore.getState().setLicense(makeLicense("premium", "expired"));
    expect(useLicenseStore.getState().isPremium()).toBe(false);
  });

  describe("canAccess — tier gating", () => {
    it("returns false with no license", () => {
      expect(useLicenseStore.getState().canAccess("hardware_scan")).toBe(false);
    });

    it("free user can access free features", () => {
      useLicenseStore.getState().setLicense(makeLicense("free"));
      expect(useLicenseStore.getState().canAccess("hardware_scan")).toBe(true);
      expect(useLicenseStore.getState().canAccess("health_overview")).toBe(true);
      expect(useLicenseStore.getState().canAccess("basic_benchmark")).toBe(true);
    });

    it("free user cannot access premium features", () => {
      useLicenseStore.getState().setLicense(makeLicense("free"));
      expect(useLicenseStore.getState().canAccess("full_tuning_engine")).toBe(false);
      expect(useLicenseStore.getState().canAccess("thermal_analysis")).toBe(false);
      expect(useLicenseStore.getState().canAccess("reboot_resume")).toBe(false);
      expect(useLicenseStore.getState().canAccess("bottleneck_analysis")).toBe(false);
    });

    it("premium user can access all features", () => {
      useLicenseStore.getState().setLicense(makeLicense("premium", "active"));
      expect(useLicenseStore.getState().canAccess("hardware_scan")).toBe(true);
      expect(useLicenseStore.getState().canAccess("full_tuning_engine")).toBe(true);
      expect(useLicenseStore.getState().canAccess("benchmark_lab")).toBe(true);
      expect(useLicenseStore.getState().canAccess("rollback_center")).toBe(true);
      expect(useLicenseStore.getState().canAccess("app_install_hub")).toBe(true);
    });

    it("expired premium cannot access premium features", () => {
      useLicenseStore.getState().setLicense(makeLicense("premium", "expired"));
      expect(useLicenseStore.getState().canAccess("full_tuning_engine")).toBe(false);
    });

    it("returns false for unknown feature keys", () => {
      useLicenseStore.getState().setLicense(makeLicense("premium", "active"));
      expect(useLicenseStore.getState().canAccess("nonexistent_feature")).toBe(false);
    });
  });
});
