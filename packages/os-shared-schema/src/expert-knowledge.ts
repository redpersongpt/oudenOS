// ─── Expert Knowledge Base ──────────────────────────────────────────────────
// Sourced from valleyofdoom/PC-Tuning, Win11Debloat, Oneclick V8.3.
// Used by both redcore-Tuning and redcore-OS for tooltips, rationales, and
// expert explanations throughout the UI.
//
// Structure: category → topic → { title, explanation, whyItMatters, risk, source }

export interface ExpertNote {
  title: string;
  explanation: string;
  whyItMatters: string;
  risk: "safe" | "low" | "medium" | "high" | "extreme";
  source: string;
  antiCheatNote?: string;
  laptopNote?: string;
  workPcNote?: string;
}

export const EXPERT_KNOWLEDGE: Record<string, Record<string, ExpertNote>> = {

  // ── BIOS / HARDWARE ──────────────────────────────────────────────────────

  bios: {
    rebar: {
      title: "Resizable BAR (ReBAR)",
      explanation: "ReBAR allows the CPU to access the entire GPU VRAM in one mapping instead of 256MB chunks. Requires GPT/UEFI mode and 'Above 4G Decoding' enabled in BIOS.",
      whyItMatters: "Can improve GPU performance by 5-10% in some games, but can also cause regression in others. Always benchmark individually.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §1.3",
    },
    hyperThreading: {
      title: "Hyper-Threading / SMT",
      explanation: "Multiple execution threads per physical core increase contention on processor resources. If you have enough cores for your workload, disabling HT/SMT can reduce latency jitter.",
      whyItMatters: "Disabling increases overclocking potential due to lower temperatures. Some games benefit, some regress. Never disable idle states while HT/SMT is enabled.",
      risk: "medium",
      source: "valleyofdoom/PC-Tuning §1.4",
    },
    virtualization: {
      title: "Virtualization / SVM Mode",
      explanation: "Virtualization adds memory access latency (documented in AMD EPYC tuning guides). BCLK can fluctuate with SVM enabled.",
      whyItMatters: "Disabling removes a measurable latency penalty. But Vanguard/FACEIT anticheats require Memory Integrity (HVCI), which needs virtualization.",
      risk: "medium",
      source: "valleyofdoom/PC-Tuning §1.6",
      antiCheatNote: "Required by Vanguard, FACEIT anticheats",
    },
    tpm: {
      title: "TPM (Trusted Platform Module)",
      explanation: "TPM can cause SMIs (System Management Interrupts) — high-priority unmaskable hardware interrupts that force the CPU to suspend ALL other activity including the OS.",
      whyItMatters: "SMIs are invisible to the OS and profiling tools. They introduce unpredictable latency spikes that can cause micro-stutter.",
      risk: "medium",
      source: "valleyofdoom/PC-Tuning §1.8",
      antiCheatNote: "Required by Vanguard/FACEIT on Windows 11",
    },
    legacyUsb: {
      title: "Legacy USB Support",
      explanation: "Legacy USB emulation causes SMIs (same mechanism as TPM). USB legacy support exists for pre-boot compatibility with USB keyboards/mice.",
      whyItMatters: "Disabling eliminates a common source of SMI-induced latency spikes. Only re-enable temporarily for OS installation or BIOS access.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §1.12",
      laptopNote: "Must remain enabled on some laptops for keyboard to work in BIOS",
    },
    spreadSpectrum: {
      title: "Spread Spectrum",
      explanation: "Spread Spectrum intentionally varies the base clock (BCLK) frequency to reduce electromagnetic interference. This causes BCLK deviation from target.",
      whyItMatters: "Your BCLK should be exactly 100.00 MHz, not 99.97 MHz. Deviation affects all frequencies derived from BCLK including memory and CPU clock.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §1.11",
    },
    oemAutoInstall: {
      title: "OEM Software Auto-Install",
      explanation: "ASUS Armoury Crate, Gigabyte Control Center, and MSI Center have BIOS-level autorun options that silently install bloatware on every fresh Windows install.",
      whyItMatters: "These install vendor monitoring software, RGB controllers, and update services that run in the background. Disable them in BIOS before installing Windows.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §1.17",
    },
  },

  // ── CPU / SCHEDULING ─────────────────────────────────────────────────────

  cpu: {
    win32PrioritySeparation: {
      title: "Thread Priority Scheduling (Win32PrioritySeparation)",
      explanation: "This registry key controls foreground thread quantum (time slice) boosting. It reads only the first 6 bits — values above 63 simply recycle. The key controls both quantum length and foreground priority boost magnitude.",
      whyItMatters: "Value 38 (0x26) = Short quantum, Variable length, 3:1 foreground ratio. This gives the active window's threads 3× the CPU time slice of background threads, improving responsiveness for games and active applications.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §5.1",
    },
    coreParking: {
      title: "CPU Core Parking",
      explanation: "Windows parks (powers down) idle CPU cores to save energy. When a game suddenly needs more threads, the OS must unpark cores — this takes 1-5ms.",
      whyItMatters: "That 1-5ms unpark delay causes micro-stutter in frame-sensitive workloads. Disabling core parking keeps all cores active and eliminates this class of latency spike.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §9",
      laptopNote: "Increases power consumption and heat. Not recommended for battery-powered use.",
    },
    dynamicTick: {
      title: "Dynamic Tick & Platform Timer",
      explanation: "Dynamic tick allows Windows to skip timer interrupts during idle periods. This creates variable timer resolution that causes inconsistent frame pacing in latency-sensitive workloads.",
      whyItMatters: "Disabling forces a fixed timer interrupt interval, providing the most consistent timing behavior. Combined with platform timer (HPET/TSC), this eliminates timer-induced jitter.",
      risk: "medium",
      source: "valleyofdoom/PC-Tuning §4.1",
      laptopNote: "Significantly increases power consumption. Blocks battery-saving mechanisms.",
    },
    timerResolution: {
      title: "Global Timer Resolution",
      explanation: "Starting with Windows 10 2004, timer resolution requests became per-process only. The GlobalTimerResolutionRequests key (Windows 11+ only) restores the pre-2004 global behavior where one process raising timer resolution benefits all processes.",
      whyItMatters: "Without this, background processes stay at 15.625ms resolution even while a game requests 0.5ms. This causes inconsistent scheduling for background audio, networking, and system tasks.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §10.2",
    },
    timerMicroAdjust: {
      title: "Timer Resolution Micro-Adjustment",
      explanation: "Research shows 0.500ms is NOT always the most precise timer resolution. Testing found that requesting 0.507ms gave consistently lower Sleep(1) deltas than 0.500ms on most systems.",
      whyItMatters: "The optimal resolution varies per system. Use micro-adjust benchmarking to find the sweet spot for your specific hardware. Run under load — idle benchmarks are misleading.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §10.3",
    },
    idleStates: {
      title: "CPU Idle States (C-States)",
      explanation: "Disabling idle states forces C-State 0 (no power gating). Microsoft recommends this for real-time performance devices. Eliminates delay when a CPU in a deep C-state receives a new task.",
      whyItMatters: "C-state exit latency adds microseconds to hundreds of microseconds of delay when a core wakes up. For competitive gaming, this matters. But it increases power and temperature significantly.",
      risk: "medium",
      source: "valleyofdoom/PC-Tuning §9",
      laptopNote: "Do NOT disable on laptops. Dramatically increases power consumption and heat.",
    },
    reservedCpuSets: {
      title: "Reserved CPU Sets",
      explanation: "Windows 10+ API that prevents the OS from routing ISRs, DPCs, and background threads to specific CPUs. This is a soft policy — CPU-intensive stress tests will still use reserved cores if needed.",
      whyItMatters: "Use to reserve E-Cores for background tasks so games default to P-Cores. Or reserve CPUs that have specific IRQ/DPC modules assigned. Always benchmark — even reserving E-Cores can regress performance.",
      risk: "medium",
      source: "valleyofdoom/PC-Tuning §16",
    },
  },

  // ── GPU ───────────────────────────────────────────────────────────────────

  gpu: {
    hags: {
      title: "Hardware Accelerated GPU Scheduling (HAGS)",
      explanation: "HAGS moves GPU memory management from the Windows kernel to the GPU's own scheduler. Required for DLSS Frame Generation on NVIDIA.",
      whyItMatters: "Can reduce latency in some scenarios but may cause issues with older games or drivers. Benchmark individually. If using DLSS Frame Gen, you need this enabled.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §2.1",
    },
    pStateLock: {
      title: "NVIDIA P-State Lock (Force P0)",
      explanation: "Forces the GPU to stay at maximum clock speeds (P-State 0) at all times, preventing dynamic frequency scaling during load transitions.",
      whyItMatters: "Eliminates 10-50ms clock ramping delay when the GPU transitions from idle to load. Useful for competitive gaming where frame time consistency matters more than power efficiency.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §3.17",
      laptopNote: "Increases idle temperatures and power. Not recommended for laptops on battery.",
    },
    nvidiaDriverStrip: {
      title: "NVIDIA Driver Stripping",
      explanation: "The full NVIDIA driver package includes telemetry, GeForce Experience, PhysX, HD Audio, USB-C, and other components most users don't need. Stripping to only Display.Driver reduces background services.",
      whyItMatters: "Fewer driver components = fewer background processes = less CPU overhead and fewer potential DPC/ISR sources. Clean driver install also avoids profile conflicts.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §13.1",
    },
    nvidiaContainerServices: {
      title: "NVIDIA Container Services",
      explanation: "NVDisplay.ContainerLocalSystem and NvContainerLocalSystem run background telemetry, overlay rendering (Alt+Z), driver update checks, and GeForce Experience features.",
      whyItMatters: "These services consume CPU and GPU resources even when you're not using the overlay. Disabling them reduces driver overhead but kills ShadowPlay, overlay, and auto-updates.",
      risk: "low",
      source: "Oneclick V8.3",
    },
    msi: {
      title: "Message Signaled Interrupts (MSI)",
      explanation: "MSIs are faster than line-based interrupts and resolve IRQ sharing — a common cause of high interrupt latency. Shared IRQ check: Win+R → msinfo32 → Conflicts/Sharing.",
      whyItMatters: "Enabling MSI for your GPU eliminates IRQ sharing overhead. NVIDIA selectively enables MSIs per architecture, so manual configuration may be needed for older cards.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §7",
    },
    fullscreenOptimizations: {
      title: "Fullscreen Optimizations",
      explanation: "Windows fullscreen optimizations route fullscreen applications through the DWM compositor using borderless windowed mode instead of true exclusive fullscreen.",
      whyItMatters: "This adds input lag and can cause frame pacing issues. Disabling globally forces games to use exclusive fullscreen when they request it, bypassing the compositor.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §3.8",
    },
  },

  // ── NETWORK ──────────────────────────────────────────────────────────────

  network: {
    nagle: {
      title: "Nagle's Algorithm (TCPNoDelay)",
      explanation: "Nagle's algorithm buffers small TCP packets to reduce network overhead by combining them into larger packets. This adds up to 200ms of delay for small game packets.",
      whyItMatters: "For gaming, every packet matters. Disabling Nagle sends small packets immediately instead of waiting for a buffer to fill. Set both TcpAckFrequency=1 and TCPNoDelay=1.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §11",
    },
    rss: {
      title: "Receive Side Scaling (RSS)",
      explanation: "RSS distributes NIC interrupt processing across multiple CPU cores. Research shows gaming workloads (~300KB/s) use at most 1-2 RSS queues. At 1Gbps, both queues are used.",
      whyItMatters: "Over-allocating RSS queues wastes CPU resources. 2 queues is sufficient for gaming. More doesn't help but reserves CPUs that could be doing useful work.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §6.6",
    },
    nicOffloading: {
      title: "NIC Offloading (Checksum, LSO, EEE)",
      explanation: "NIC offloading delegates packet processing (checksums, segmentation, power saving) to the network card hardware. This reduces CPU load but adds latency to each packet.",
      whyItMatters: "For competitive gaming and low-latency workloads, CPU-side processing is faster than NIC-side. But disabling offloading increases CPU usage during heavy network activity.",
      risk: "medium",
      source: "Oneclick V8.3 Network Tweaks",
      laptopNote: "May increase power consumption. Not recommended for battery use.",
      workPcNote: "May cause connectivity issues on managed networks. Test before deploying.",
    },
    qosDscp: {
      title: "QoS DSCP Tagging",
      explanation: "Setting DSCP 46 (Expedited Forwarding) on game packets tells routers to prioritize them. The 'Do not use NLA' registry fix ensures DSCP tagging works with multiple NICs or outside a domain.",
      whyItMatters: "If your router supports QoS, tagged packets get priority treatment. This reduces in-game latency spikes during network congestion.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §11.5",
    },
  },

  // ── POWER ────────────────────────────────────────────────────────────────

  power: {
    fastStartup: {
      title: "Fast Startup (Hiberboot)",
      explanation: "Fast Startup saves the kernel session to hibernation file on shutdown, then loads it on next boot. This creates a hybrid shutdown/hibernate state that isn't a true clean boot.",
      whyItMatters: "Disabling ensures every boot is a fresh kernel initialization. This prevents accumulated driver/service state issues and ensures tuning changes take full effect. Goal: limit power states to S0 (working) and S5 (soft off).",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §1.10",
    },
    modernStandby: {
      title: "Modern Standby (S0 Low Power Idle)",
      explanation: "Modern Standby keeps CPU, network, and peripherals partially active during sleep for background sync, notifications, and updates. PlatformAoAcOverride=0 forces legacy S3 sleep.",
      whyItMatters: "On desktops, Modern Standby wastes power for no benefit. On laptops, it causes battery drain during sleep. Disabling forces classic S3 sleep behavior with full component power-off.",
      risk: "medium",
      source: "Oneclick V8.3",
      laptopNote: "Disabling changes sleep behavior. Instant wake and background sync will no longer work.",
    },
    aspm: {
      title: "PCIe Active State Power Management (ASPM)",
      explanation: "ASPM transitions power down the PCIe bus between the CPU and devices (L0s, L1 states). Re-entering the active state adds 1-10μs typical, up to several ms in worst cases.",
      whyItMatters: "Disabling eliminates intermittent latency spikes from PCIe link re-activation. Every PCIe device (GPU, NVMe, NIC) is affected.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §1.7",
      laptopNote: "Significantly increases power consumption. Essential for battery life on laptops.",
    },
  },

  // ── SERVICES ─────────────────────────────────────────────────────────────

  services: {
    sysmain: {
      title: "SysMain (Superfetch)",
      explanation: "SysMain prefetches frequently used data into RAM to speed up application launches. On SSD-based systems, the benefit is negligible because SSD random read is already fast.",
      whyItMatters: "SysMain consumes CPU cycles for prefetch analysis and causes periodic disk I/O spikes. Microsoft lists it as a candidate for disabling on real-time performance devices.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §12.2",
    },
    wsearch: {
      title: "Windows Search (WSearch)",
      explanation: "Windows Search maintains a full-text index of files on all drives. The indexing process causes periodic notable CPU overhead and disk I/O.",
      whyItMatters: "If you use Everything Search (instant file search) or don't use Windows Search, the indexing service is pure overhead. Disabling eliminates background CPU and disk spikes.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §12.2",
    },
    dependencyWarning: {
      title: "Service Dependency Check",
      explanation: "ALWAYS run 'sc EnumDepend <service>' before disabling a service. Some services have hidden dependents that will break when the parent is disabled.",
      whyItMatters: "Blindly disabling services without checking dependencies is the #1 cause of post-optimization breakage. The dependency chain can be 3-4 levels deep.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §12.1",
    },
  },

  // ── SECURITY / MITIGATIONS ───────────────────────────────────────────────

  security: {
    hvci: {
      title: "HVCI (Memory Integrity)",
      explanation: "Hypervisor-Enforced Code Integrity uses the hypervisor to verify that all kernel-mode code is properly signed before execution. This adds overhead to every kernel-mode operation.",
      whyItMatters: "Tom's Hardware benchmarks confirmed performance impact. Disabling improves performance but reduces protection against kernel-mode rootkits. VBS/HVCI auto-re-enable when virtualization is enabled in BIOS.",
      risk: "high",
      source: "valleyofdoom/PC-Tuning §17",
      antiCheatNote: "Required by Vanguard, FACEIT anticheats",
    },
    spectreMeltdown: {
      title: "Spectre/Meltdown Mitigations",
      explanation: "CPU microcode patches that mitigate speculative execution vulnerabilities. On older architectures, these have significant performance impact. On newer architectures (Zen 4+), disabling can actually cause regression.",
      whyItMatters: "This is an age-old performance trick but must be benchmarked per-platform. Modern CPUs have mitigations built into silicon, making software mitigations less impactful.",
      risk: "high",
      source: "valleyofdoom/PC-Tuning §15",
      antiCheatNote: "FACEIT requires Meltdown mitigations enabled",
    },
  },

  // ── DISPLAY / INPUT ──────────────────────────────────────────────────────

  display: {
    pointerAcceleration: {
      title: "Mouse Pointer Acceleration",
      explanation: "Windows 'Enhance pointer precision' applies a non-linear acceleration curve to mouse movement. Fast movements move the cursor proportionally further than slow movements.",
      whyItMatters: "For gaming, you want raw 1:1 mouse input where physical movement maps directly to cursor movement. Disabling sets MouseSpeed=0 and both thresholds to 0.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §3.2",
    },
    gameDvr: {
      title: "Game DVR / Game Bar",
      explanation: "Game DVR silently records gameplay in the background (even when you're not streaming). GameBarPresenceWriter is a COM-activated process that monitors game presence for Xbox social features.",
      whyItMatters: "Background recording consumes GPU resources and increases frame times. The presence writer adds overhead to every game launch. Both can be safely disabled if you don't use Xbox Game Bar.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §3.7",
    },
    identityScaling: {
      title: "Display Scaling (Identity Mode)",
      explanation: "Setting Scaling=1 in registry does NOT guarantee identity scaling if a non-native resolution is set via GPU Control Panel. True identity scaling at non-native resolutions requires CRU (Custom Resolution Utility).",
      whyItMatters: "Incorrect scaling adds an extra processing step in the display pipeline, increasing output latency. For competitive gaming, every frame matters.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §3.18",
    },
  },

  // ── AUDIO ────────────────────────────────────────────────────────────────

  audio: {
    enhancements: {
      title: "Audio Enhancements",
      explanation: "Windows audio enhancements (spatial sound, equalizer, bass boost) add DSP processing to the audio pipeline. Benchmarks show minor but measurable CPU overhead.",
      whyItMatters: "Disabling removes unnecessary audio processing. Set Communications tab to 'Do nothing' to prevent automatic audio ducking during voice calls.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §19",
    },
    bufferSize: {
      title: "Audio Buffer Size",
      explanation: "Smaller audio buffers reduce audio latency but increase the risk of dropouts under CPU load. The minimum safe buffer depends on your system's DPC/ISR latency.",
      whyItMatters: "For music production and competitive gaming, lower audio latency is perceptible. Use LowAudioLatency tool to minimize buffer size, but monitor for dropouts.",
      risk: "low",
      source: "valleyofdoom/PC-Tuning §19",
    },
  },

  // ── STORAGE ──────────────────────────────────────────────────────────────

  storage: {
    eightDotThree: {
      title: "8.3 Filename Creation",
      explanation: "Windows creates a short 8.3-format filename for every file (compatibility with 16-bit programs). This adds overhead to every file creation operation and consumes disk space.",
      whyItMatters: "Disabling and stripping existing 8.3 names improves file system performance and frees disk space. Must be done before first boot for full effect on system files.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §2.3",
    },
    lastAccess: {
      title: "NTFS Last Access Timestamp",
      explanation: "Windows updates a timestamp on every file every time it is read. On SSDs this is trivial, but it still generates unnecessary write operations.",
      whyItMatters: "Disabling reduces disk write amplification. Minimal performance impact on modern SSDs but reduces unnecessary metadata writes.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §3.10",
    },
  },

  // ── EDGE / BROWSER ───────────────────────────────────────────────────────

  edge: {
    suppress: {
      title: "Edge Suppression (Registry Policies)",
      explanation: "Edge preloads at startup, runs startup boost to stay resident, and aggressively prompts to become the default browser. All of these can be disabled via registry policies without removing Edge.",
      whyItMatters: "Suppression reclaims 100-300MB of RAM and eliminates Edge background processes without breaking any Windows functionality. This is the recommended approach for most users.",
      risk: "safe",
      source: "Win11Debloat",
    },
    removal: {
      title: "Edge Force Removal",
      explanation: "Complete uninstall using setup.exe --force-uninstall. Removes the browser binary, AppX package, and provisioning entry. Some Windows features that open web links via Edge will fail.",
      whyItMatters: "This is the only way to fully eliminate Edge from the system. But it cannot be undone from within Windows — you must download Edge from microsoft.com to reinstall.",
      risk: "high",
      source: "Win11Debloat ForceRemoveEdge.ps1",
      workPcNote: "Never remove Edge on work PCs. IT policies may depend on it.",
    },
    webview2: {
      title: "Edge WebView2 Runtime",
      explanation: "WebView2 is a shared system component used by many modern apps to render web content. Teams, Widgets, some Electron apps, and Windows system dialogs depend on it.",
      whyItMatters: "Removing WebView2 WILL break applications. This is almost never recommended. Only consider if you are certain no app on your system uses it.",
      risk: "extreme",
      source: "Win11Debloat",
      workPcNote: "NEVER remove on work PCs. Teams and many enterprise apps require it.",
    },
  },

  // ── PRIVACY / AI ─────────────────────────────────────────────────────────

  privacy: {
    recall: {
      title: "Windows Recall",
      explanation: "Recall continuously captures screenshots of your activity for AI-powered search. Three policy keys control it: DisableAIDataAnalysis, AllowRecallEnablement, and TurnOffSavingSnapshots.",
      whyItMatters: "Recall stores a visual history of everything you do on screen. Even if encrypted, this creates a significant privacy and security surface. Disabling prevents any Recall data from being collected.",
      risk: "safe",
      source: "Win11Debloat",
    },
    telemetry: {
      title: "Windows Telemetry",
      explanation: "AllowTelemetry=0 sets diagnostic data to 'Required' (minimum). DiagTrack and dmwappushservice handle telemetry collection and transmission.",
      whyItMatters: "Reduces background network activity and data collection. The Required level still sends basic device data but eliminates detailed usage patterns, browsing history, and inking data.",
      risk: "safe",
      source: "valleyofdoom/PC-Tuning §3.2",
    },
  },
};
