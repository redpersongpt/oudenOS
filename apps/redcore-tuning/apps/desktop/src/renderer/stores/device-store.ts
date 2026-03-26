// ─── Device Profile Store ───────────────────────────────────────────────────

import { create } from "zustand";
import type { DeviceProfile } from "@redcore/shared-schema/device";

interface DeviceState {
  profile: DeviceProfile | null;
  scanning: boolean;
  scanProgress: number;
  scanPhase: string;
  setProfile: (profile: DeviceProfile) => void;
  setScanProgress: (progress: number, phase: string) => void;
  setScanning: (scanning: boolean) => void;
  reset: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  profile: null,
  scanning: false,
  scanProgress: 0,
  scanPhase: "",
  setProfile: (profile) => set({ profile, scanning: false, scanProgress: 100 }),
  setScanProgress: (scanProgress, scanPhase) => set({ scanProgress, scanPhase }),
  setScanning: (scanning) => set({ scanning }),
  reset: () => set({ profile: null, scanning: false, scanProgress: 0, scanPhase: "" }),
}));
