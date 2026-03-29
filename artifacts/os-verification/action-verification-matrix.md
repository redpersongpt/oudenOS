# redcore OS Action Verification Matrix

| Action ID | Tier | Proof Status | Readback | Rollback |
| --- | --- | --- | --- | --- |
| appx.disable-edge-default-nag | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| appx.disable-edge-preload | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| appx.disable-edge-updates | tier1 | partially verified on real Windows | registry, registry, service, service, service | snapshot |
| appx.remove-alarms | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-camera | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-casual-games | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package, package | manual |
| appx.remove-consumer-bloat | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package, package, package, package | manual |
| appx.remove-copilot-app | tier3 | not safely machine-verifiable yet | package, package, package | manual |
| appx.remove-cortana | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-edge | tier1 | not safely machine-verifiable yet | powershell-specialized | manual |
| appx.remove-edge-webview | tier1 | not safely machine-verifiable yet | powershell-specialized | manual |
| appx.remove-feedback-hub | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-get-help | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-mail-calendar | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-maps | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-ms-extended-bloat | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package | manual |
| appx.remove-oem-utilities | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package | manual |
| appx.remove-office-hub | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-power-automate | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-shopping-amazon | tier3 | not safely machine-verifiable yet | package, package | manual |
| appx.remove-social-media | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package | manual |
| appx.remove-solitaire | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-sound-recorder | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-sticky-notes | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-streaming-trials | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package | manual |
| appx.remove-widgets | tier3 | not safely machine-verifiable yet | registry, package | manual |
| appx.remove-xbox-apps | tier3 | not safely machine-verifiable yet | package, package, package, package, package | manual |
| appx.remove-your-phone | tier3 | not safely machine-verifiable yet | package | manual |
| audio.disable-enhancements | tier2 | partially verified on real Windows | registry | snapshot |
| audio.exclusive-mode | tier2 | partially verified on real Windows | registry, registry | snapshot |
| cpu.aggressive-boost-mode | tier3 | blocked by profile by design | power | snapshot |
| cpu.disable-core-parking | tier3 | blocked by profile by design | power | snapshot |
| cpu.disable-dynamic-tick | tier3 | requires reboot to verify fully | bcd, bcd | snapshot |
| cpu.global-timer-resolution | tier3 | requires reboot to verify fully | registry | snapshot |
| cpu.min-processor-state-100 | tier3 | blocked by profile by design | power, power | snapshot |
| cpu.win32-priority-separation | tier3 | partially verified on real Windows | registry | snapshot |
| display.disable-game-bar | tier2 | partially verified on real Windows | registry, registry, registry | snapshot |
| display.disable-pointer-acceleration | tier2 | partially verified on real Windows | registry, registry, registry | snapshot |
| gpu.disable-amd-services | tier3 | blocked by profile by design | registry, registry, registry | snapshot |
| gpu.disable-amd-telemetry | tier3 | blocked by profile by design | service | snapshot |
| gpu.disable-hags | tier3 | requires reboot to verify fully | registry | snapshot |
| gpu.disable-nvidia-container | tier3 | blocked by profile by design | service, service | snapshot |
| gpu.disable-nvidia-telemetry | tier3 | blocked by profile by design | service | snapshot |
| gpu.msi-mode | tier3 | requires reboot to verify fully | registry | snapshot |
| gpu.nvidia-disable-dynamic-pstate | tier3 | requires reboot to verify fully | registry | snapshot |
| gpu.tdr-delay | tier3 | partially verified on real Windows | registry, registry | snapshot |
| memory.disable-compression | tier3 | requires reboot to verify fully | powershell-specialized | snapshot |
| network.disable-ipv6 | tier3 | requires reboot to verify fully | registry | snapshot |
| network.disable-llmnr | tier3 | blocked by profile by design | registry | snapshot |
| network.disable-nagle | tier3 | partially verified on real Windows | registry, registry | snapshot |
| network.disable-netbios | tier3 | requires reboot to verify fully | registry, registry | snapshot |
| network.disable-offloading | tier3 | expert-only / intentionally not broadly verified yet | powershell-specialized | snapshot |
| network.disable-teredo | tier3 | partially verified on real Windows | registry, powershell | snapshot |
| network.rss-queues-2 | tier3 | partially verified on real Windows | registry | snapshot |
| network.tcp-autotuning-normal | tier3 | partially verified on real Windows | powershell-specialized | snapshot |
| perf.disable-driver-updates-via-wu | tier3 | blocked by profile by design | registry | snapshot |
| perf.disable-fault-tolerant-heap | tier3 | partially verified on real Windows | registry | snapshot |
| perf.disable-fullscreen-optimizations | tier3 | blocked by profile by design | registry | snapshot |
| perf.disable-game-dvr | tier3 | partially verified on real Windows | registry, registry | snapshot |
| perf.disable-paging-executive | tier3 | requires reboot to verify fully | registry | snapshot |
| perf.disable-service-host-split | tier3 | requires reboot to verify fully | registry | snapshot |
| perf.disable-sleep-study | tier2 | partially verified on real Windows | service | snapshot |
| perf.disable-sticky-keys | tier3 | partially verified on real Windows | registry | snapshot |
| perf.disable-transparency | tier3 | partially verified on real Windows | registry | snapshot |
| perf.gpu-energy-driver-disable | tier3 | requires reboot to verify fully | registry | snapshot |
| perf.mmcss-system-responsiveness | tier3 | requires reboot to verify fully | registry | snapshot |
| power.disable-fast-startup | tier3 | partially verified on real Windows | registry | snapshot |
| power.disable-hibernation | tier3 | partially verified on real Windows | registry | snapshot |
| power.disable-modern-standby | tier3 | requires reboot to verify fully | registry | snapshot |
| power.disable-pcie-link-state-pm | tier3 | blocked by profile by design | power | snapshot |
| power.disable-usb-selective-suspend | tier3 | blocked by profile by design | power | snapshot |
| power.high-performance-plan | tier3 | blocked by profile by design | power, power | snapshot |
| privacy.block-app-reprovisioning | tier1 | partially verified on real Windows | powershell-specialized | snapshot |
| privacy.disable-activity-feed | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| privacy.disable-advertising-id | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-ai-svc-autostart | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-app-launch-tracking | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-ceip | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-click-to-do | tier1 | partially verified on real Windows | registry, registry | snapshot |
| privacy.disable-clipboard-history | tier1 | partially verified on real Windows | registry, registry | snapshot |
| privacy.disable-cloud-content | tier1 | partially verified on real Windows | registry, registry, registry, registry | snapshot |
| privacy.disable-device-monitoring | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-edge-ai | tier1 | partially verified on real Windows | registry, registry, registry, registry, registry, registry | snapshot |
| privacy.disable-error-reporting | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-find-my-device | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-harvest-contacts | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-input-personalization | tier1 | partially verified on real Windows | registry, registry | snapshot |
| privacy.disable-location | tier1 | blocked by profile by design | registry | snapshot |
| privacy.disable-notepad-ai | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-online-speech | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-online-tips | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-paint-ai | tier1 | partially verified on real Windows | registry, registry, registry, registry, registry | snapshot |
| privacy.disable-recall | tier1 | partially verified on real Windows | registry, registry, registry, registry | snapshot |
| privacy.disable-siuf | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-smart-app-control | tier1 | requires reboot to verify fully | registry | snapshot |
| privacy.disable-smartscreen | tier1 | blocked by profile by design | registry | snapshot |
| privacy.disable-tailored-experiences | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-telemetry | tier1 | partially verified on real Windows | registry, registry | snapshot |
| privacy.disable-tipc | tier1 | partially verified on real Windows | registry | snapshot |
| scheduler.mmcss-gaming-profile | tier3 | partially verified on real Windows | registry, registry, registry, registry, registry, registry, registry, registry | snapshot |
| security.disable-bitlocker-auto-encrypt | tier3 | partially verified on real Windows | registry | snapshot |
| security.disable-delivery-optimization | tier3 | partially verified on real Windows | registry | snapshot |
| security.disable-hvci | tier3 | requires reboot to verify fully | registry | snapshot |
| security.disable-update-asap | tier3 | partially verified on real Windows | registry | snapshot |
| security.reduce-ssbd-mitigation | tier3 | requires reboot to verify fully | registry, registry | snapshot |
| services.disable-print-spooler | tier1 | blocked by profile by design | service | snapshot |
| services.disable-remote-services | tier1 | blocked by profile by design | registry, service, service, service | snapshot |
| services.disable-sysmain | tier2 | blocked by profile by design | service | snapshot |
| services.disable-xbox-services | tier2 | blocked by profile by design | service, service, service, service | snapshot |
| shell.disable-account-notifications | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| shell.disable-content-delivery | tier1 | partially verified on real Windows | registry, registry, registry, registry, registry, registry, registry, registry | snapshot |
| shell.disable-copilot | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| shell.disable-desktop-spotlight | tier1 | partially verified on real Windows | registry | snapshot |
| shell.disable-edge-ads | tier1 | partially verified on real Windows | registry, registry, registry, registry, registry, registry, registry, registry, registry, registry, registry | snapshot |
| shell.disable-lock-screen-tips | tier1 | partially verified on real Windows | registry, registry | snapshot |
| shell.disable-meet-now | tier1 | partially verified on real Windows | registry | snapshot |
| shell.disable-phone-link-suggestions | tier1 | partially verified on real Windows | registry | snapshot |
| shell.disable-search-highlights | tier1 | partially verified on real Windows | registry | snapshot |
| shell.disable-search-history | tier1 | partially verified on real Windows | registry | snapshot |
| shell.disable-settings-ads | tier1 | partially verified on real Windows | registry | snapshot |
| shell.disable-start-menu-suggestions | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| shell.disable-suggested-notifications | tier1 | partially verified on real Windows | registry, registry | snapshot |
| shell.disable-sync-provider-ads | tier1 | partially verified on real Windows | registry | snapshot |
| shell.disable-web-search | tier1 | partially verified on real Windows | registry | snapshot |
| shell.enable-end-task | tier1 | partially verified on real Windows | registry | snapshot |
| shell.explorer-default-this-pc | tier1 | partially verified on real Windows | registry | snapshot |
| shell.hide-chat-icon | tier1 | partially verified on real Windows | registry | snapshot |
| shell.hide-task-view | tier1 | partially verified on real Windows | registry | snapshot |
| shell.hide-widgets-button | tier1 | partially verified on real Windows | registry | snapshot |
| shell.reduce-search-box | tier1 | blocked by profile by design | registry | snapshot |
| shell.restore-classic-context-menu | tier1 | requires reboot to verify fully | registry | snapshot |
| shell.show-file-extensions | tier1 | partially verified on real Windows | registry | snapshot |
| shell.show-hidden-files | tier1 | partially verified on real Windows | registry | snapshot |
| shutdown.decrease-shutdown-time | tier2 | partially verified on real Windows | registry, registry, registry | snapshot |
| shutdown.force-end-apps | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-automatic-maintenance | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-autoplay | tier2 | partially verified on real Windows | registry, registry | snapshot |
| startup.disable-background-apps | tier2 | partially verified on real Windows | registry, registry | snapshot |
| startup.disable-cloud-notifications | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-cortana | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-gamebar-presence | tier2 | blocked by profile by design | registry | snapshot |
| startup.enable-game-mode | tier2 | partially verified on real Windows | registry | snapshot |
| storage.disable-8dot3-filenames | tier3 | requires reboot to verify fully | registry | snapshot |
| storage.disable-indexing | tier2 | partially verified on real Windows | service | snapshot |
| storage.disable-last-access | tier3 | partially verified on real Windows | registry | snapshot |
| storage.enable-write-caching | tier3 | partially verified on real Windows | registry, registry | snapshot |
| system.defer-feature-updates | tier3 | blocked by profile by design | registry, registry | snapshot |
| system.disable-update-auto-restart | tier3 | blocked by profile by design | registry | snapshot |
| system.disable-windows-update | tier3 | requires reboot to verify fully | registry, registry, registry, registry, service, service, service | snapshot |
| tasks.disable-onedrive-tasks | tier2 | blocked by profile by design | task, task | snapshot |
| tasks.disable-telemetry-tasks | tier2 | partially verified on real Windows | task, task, task, task, task | snapshot |
| tasks.disable-update-orchestrator | tier2 | blocked by profile by design | task, task, task | snapshot |
