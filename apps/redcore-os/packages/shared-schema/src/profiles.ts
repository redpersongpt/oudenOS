// ─── Machine & Workload Profiles ─────────────────────────────────────────────

export type MachineProfile =
  | "gaming_desktop"
  | "budget_desktop"
  | "highend_workstation"
  | "office_laptop"
  | "gaming_laptop"
  | "low_spec_system"
  | "vm_cautious"
  | "work_pc";

export interface ProfileClassification {
  primary: MachineProfile;
  confidence: number;
  scores: Record<MachineProfile, number>;
  signals: ProfileSignal[];
  workIndicators: WorkIndicator[];
  preservationFlags: PreservationFlag[];
}

export interface ProfileSignal {
  factor: string;
  value: string;
  weight: number;
  favoredProfile: MachineProfile;
}

// ─── Work PC Detection ──────────────────────────────────────────────────────

export interface WorkIndicator {
  type: "domain_joined" | "group_policy" | "managed_updates" | "vpn_detected"
    | "office_installed" | "teams_detected" | "mapped_drives" | "print_queue"
    | "rdp_enabled" | "certificate_store" | "enterprise_browser" | "mdm_enrolled";
  detected: boolean;
  detail: string;
}

// ─── Preservation Flags ─────────────────────────────────────────────────────
// Work PC safety: these are services/features that MUST NOT be disabled.

export type PreservationFlag =
  | "print_spooler"
  | "rdp_server"
  | "rdp_client"
  | "remote_registry"
  | "smb_server"
  | "smb_client"
  | "dns_client"
  | "dhcp_client"
  | "group_policy_client"
  | "windows_update"
  | "wmi_service"
  | "certificate_services"
  | "vpn_services"
  | "network_discovery"
  | "workstation_service"
  | "lanman_server";

export const PROFILE_META: Record<MachineProfile, {
  label: string;
  tagline: string;
  strategy: string;
  accentColor: string;
}> = {
  gaming_desktop: {
    label: "Gaming Desktop",
    tagline: "High-performance stationary system built for competitive gaming",
    strategy: "Aggressive cleanup, latency-focused tuning, maximum performance",
    accentColor: "red",
  },
  budget_desktop: {
    label: "Budget Desktop",
    tagline: "Efficient system focused on responsiveness and resource conservation",
    strategy: "Cleanup-first, startup reduction, memory relief, safe optimizations",
    accentColor: "blue",
  },
  highend_workstation: {
    label: "High-end Workstation",
    tagline: "Precision system optimized for sustained throughput and stability",
    strategy: "Stability priority, creator-friendly, controlled performance gains",
    accentColor: "amber",
  },
  office_laptop: {
    label: "Office Laptop",
    tagline: "Mobile system optimized for reliability, battery, and quiet operation",
    strategy: "Battery-aware, thermal-conscious, conservative privacy cleanup",
    accentColor: "sky",
  },
  gaming_laptop: {
    label: "Gaming Laptop",
    tagline: "Thermally constrained high-performance mobile system",
    strategy: "Plugged-in vs battery modes, thermal management, careful power tuning",
    accentColor: "orange",
  },
  low_spec_system: {
    label: "Low-spec System",
    tagline: "Resource-constrained system needing cleanup and memory relief",
    strategy: "Resource recovery, background elimination, lightweight tuning only",
    accentColor: "yellow",
  },
  vm_cautious: {
    label: "Virtual Machine",
    tagline: "Virtualized environment with limited hardware access",
    strategy: "Analyze-only, most hardware tweaks blocked, software cleanup only",
    accentColor: "green",
  },
  work_pc: {
    label: "Work PC",
    tagline: "Business machine optimized for reliability while preserving enterprise workflows",
    strategy: "Conservative cleanup, preserve printing/RDP/domain/shares, work-safe tuning",
    accentColor: "indigo",
  },
};
