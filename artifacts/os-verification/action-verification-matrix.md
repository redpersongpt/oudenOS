# redcore OS Action Verification Matrix

| Action ID | Tier | Proof Status | Readback | Rollback |
| --- | --- | --- | --- | --- |
| appx.disable-edge-default-nag | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| appx.disable-edge-preload | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| appx.disable-edge-updates | tier1 | partially verified on real Windows | registry, registry, service, service, service | snapshot |
| appx.remove-3d-apps | tier3 | not safely machine-verifiable yet | package, package, package | manual |
| appx.remove-alarms | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-camera | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-casual-games | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package, package | manual |
| appx.remove-clipchamp | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-consumer-bloat | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package, package, package, package | manual |
| appx.remove-copilot | tier3 | not safely machine-verifiable yet | registry, registry, package, package | manual |
| appx.remove-copilot-app | tier3 | not safely machine-verifiable yet | package, package, package | manual |
| appx.remove-cortana | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-edge | tier1 | not safely machine-verifiable yet | powershell-specialized | manual |
| appx.remove-edge-webview | tier1 | not safely machine-verifiable yet | powershell-specialized | manual |
| appx.remove-family-safety | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-feedback-hub | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-get-help | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-mail-calendar | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-maps | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-ms-extended-bloat | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package, package | manual |
| appx.remove-news | tier3 | not safely machine-verifiable yet | package, package | manual |
| appx.remove-oem-utilities | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package, package, package, package | manual |
| appx.remove-office-hub | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-outlook-new | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-power-automate | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-recall | tier3 | partially verified on real Windows | registry, registry | snapshot |
| appx.remove-shopping-amazon | tier3 | not safely machine-verifiable yet | package, package | manual |
| appx.remove-social-media | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package | manual |
| appx.remove-solitaire | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-sound-recorder | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-sticky-notes | tier3 | not safely machine-verifiable yet | package | manual |
| appx.remove-streaming-trials | tier3 | not safely machine-verifiable yet | package, package, package, package, package, package | manual |
| appx.remove-teams-consumer | tier3 | not safely machine-verifiable yet | package, package | manual |
| appx.remove-widgets | tier3 | not safely machine-verifiable yet | registry, package | manual |
| appx.remove-xbox-apps | tier3 | not safely machine-verifiable yet | package, package, package, package, package | manual |
| appx.remove-your-phone | tier3 | not safely machine-verifiable yet | package | manual |
| audio.disable-enhancements | tier2 | partially verified on real Windows | registry | snapshot |
| audio.exclusive-mode | tier2 | partially verified on real Windows | registry, registry | snapshot |
| cpu.aggressive-boost-mode | tier3 | blocked by profile by design | power | snapshot |
| cpu.disable-core-parking | tier3 | blocked by profile by design | power | snapshot |
| cpu.min-processor-state-100 | tier3 | blocked by profile by design | power, power | snapshot |
| cpu.win32-priority-separation | tier3 | partially verified on real Windows | registry | snapshot |
| display.disable-game-bar | tier2 | partially verified on real Windows | registry, registry, registry | snapshot |
| display.disable-pointer-acceleration | tier2 | partially verified on real Windows | registry, registry, registry | snapshot |
| gpu.disable-amd-services | tier3 | blocked by profile by design | registry, registry, registry | snapshot |
| gpu.disable-amd-telemetry | tier3 | blocked by profile by design | service | snapshot |
| gpu.disable-nvidia-container | tier3 | blocked by profile by design | service, service | snapshot |
| gpu.disable-nvidia-telemetry | tier3 | blocked by profile by design | service | snapshot |
| gpu.msi-mode | tier3 | requires reboot to verify fully | registry | snapshot |
| gpu.nvidia-disable-dynamic-pstate | tier3 | requires reboot to verify fully | registry | snapshot |
| gpu.tdr-delay | tier3 | partially verified on real Windows | registry, registry | snapshot |
| memory.disable-compression | tier3 | requires reboot to verify fully | powershell-specialized | snapshot |
| network.disable-llmnr | tier3 | expert-only / intentionally not broadly verified yet | registry | snapshot |
| network.disable-smbv1 | tier3 | requires reboot to verify fully | registry | snapshot |
| network.harden-windows-firewall-defaults | tier3 | partially verified on real Windows | registry, registry | snapshot |
| perf.clear-page-file-on-shutdown | tier3 | partially verified on real Windows | registry | snapshot |
| perf.csrss-high-priority | tier3 | requires reboot to verify fully | registry, registry | snapshot |
| perf.disable-auto-maintenance | tier3 | blocked by profile by design | registry | snapshot |
| perf.disable-auto-sign-on | tier3 | partially verified on real Windows | registry | snapshot |
| perf.disable-driver-updates-via-wu | tier3 | blocked by profile by design | registry | snapshot |
| perf.disable-fullscreen-optimizations | tier3 | blocked by profile by design | registry | snapshot |
| perf.disable-game-dvr | tier3 | partially verified on real Windows | registry, registry | snapshot |
| perf.disable-gamebar-presence | tier3 | partially verified on real Windows | registry | snapshot |
| perf.disable-page-combining | tier3 | requires reboot to verify fully | registry | snapshot |
| perf.disable-pointer-acceleration | tier3 | partially verified on real Windows | registry, registry, registry | snapshot |
| perf.disable-prefetch | tier3 | requires reboot to verify fully | registry, registry | snapshot |
| perf.disable-sticky-keys | tier3 | partially verified on real Windows | registry | snapshot |
| perf.disable-store-auto-updates | tier3 | blocked by profile by design | registry | snapshot |
| perf.disable-transparency | tier3 | partially verified on real Windows | registry | snapshot |
| perf.gpu-energy-driver-disable | tier3 | requires reboot to verify fully | registry | snapshot |
| perf.legacy-flip-presentation | tier3 | blocked by profile by design | registry, registry | snapshot |
| perf.mmcss-deep-tuning | tier3 | blocked by profile by design | registry, registry, registry, registry, registry, registry | snapshot |
| perf.mmcss-system-responsiveness | tier3 | requires reboot to verify fully | registry | snapshot |
| perf.ntfs-optimization | tier3 | requires reboot to verify fully | registry, registry, registry, registry | snapshot |
| perf.svchost-split-threshold | tier3 | requires reboot to verify fully | registry | snapshot |
| power.disable-device-power-saving | tier3 | blocked by profile by design | power | snapshot |
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
| privacy.disable-msrt | tier1 | blocked by profile by design | registry | snapshot |
| privacy.disable-notepad-ai | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-online-speech | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-online-tips | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-paint-ai | tier1 | partially verified on real Windows | registry, registry, registry, registry, registry | snapshot |
| privacy.disable-recall | tier1 | partially verified on real Windows | registry, registry, registry, registry | snapshot |
| privacy.disable-siuf | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-smartscreen | tier1 | blocked by profile by design | registry | snapshot |
| privacy.disable-tailored-experiences | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-telemetry | tier1 | partially verified on real Windows | registry, registry | snapshot |
| privacy.disable-tipc | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.disable-typing-insights | tier1 | partially verified on real Windows | registry | snapshot |
| privacy.powershell-telemetry-optout | tier1 | partially verified on real Windows | registry | snapshot |
| scheduler.mmcss-gaming-profile | tier3 | partially verified on real Windows | registry, registry, registry, registry, registry, registry, registry, registry | snapshot |
| security.disable-bitlocker-auto-encrypt | tier3 | partially verified on real Windows | registry | snapshot |
| security.disable-cpu-mitigations | tier3 | requires reboot to verify fully | none | snapshot |
| security.disable-defender-cloud | tier3 | expert-only / intentionally not broadly verified yet | registry, registry | snapshot |
| security.disable-defender-realtime | tier3 | requires reboot to verify fully | registry, registry, registry, registry, registry | snapshot |
| security.disable-delivery-optimization | tier3 | partially verified on real Windows | registry | snapshot |
| security.disable-hvci | tier3 | requires reboot to verify fully | registry | snapshot |
| security.disable-update-asap | tier3 | partially verified on real Windows | registry | snapshot |
| security.disable-vbs | tier3 | requires reboot to verify fully | registry, registry | snapshot |
| security.disable-vulnerable-driver-blocklist | tier3 | requires reboot to verify fully | registry | snapshot |
| security.full-defender-disable | tier3 | requires reboot to verify fully | service, service, service, service, service, service, service, service, service | snapshot |
| security.reduce-ssbd-mitigation | tier3 | requires reboot to verify fully | registry, registry | snapshot |
| services.disable-alljoyn-router | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-bluetooth-support | tier2 | blocked by profile by design | service | snapshot |
| services.disable-diagtrack | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-dmwappushservice | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-fax | tier2 | blocked by profile by design | service | snapshot |
| services.disable-geolocation | tier2 | blocked by profile by design | service | snapshot |
| services.disable-map-services | tier2 | blocked by profile by design | service, service | snapshot |
| services.disable-mixed-reality | tier2 | partially verified on real Windows | service, service | snapshot |
| services.disable-phone-service | tier2 | blocked by profile by design | service | snapshot |
| services.disable-print-spooler | tier1 | blocked by profile by design | service | snapshot |
| services.disable-push-notifications | tier2 | requires reboot to verify fully | service | snapshot |
| services.disable-remote-services | tier1 | blocked by profile by design | registry, service, service, service | snapshot |
| services.disable-retaildemo | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-secondary-logon | tier2 | blocked by profile by design | service | snapshot |
| services.disable-sleep-study | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-smart-card | tier2 | blocked by profile by design | service, service | snapshot |
| services.disable-sysmain | tier2 | blocked by profile by design | service | snapshot |
| services.disable-tiledatamodelsvc | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-touch-keyboard | tier2 | blocked by profile by design | service | snapshot |
| services.disable-wallet-service | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-wer-service | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-wisvc | tier2 | partially verified on real Windows | service | snapshot |
| services.disable-wmp-network-sharing | tier2 | partially verified on real Windows | service | snapshot |
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
| shell.remove-cast-to-device | tier1 | partially verified on real Windows | registry | snapshot |
| shell.remove-edit-with-paint3d | tier1 | partially verified on real Windows | registry, registry, registry | snapshot |
| shell.remove-troubleshoot-compatibility | tier1 | blocked by profile by design | registry | snapshot |
| shell.show-file-extensions | tier1 | partially verified on real Windows | registry | snapshot |
| shell.show-hidden-files | tier1 | partially verified on real Windows | registry | snapshot |
| shutdown.decrease-shutdown-time | tier2 | partially verified on real Windows | registry, registry | snapshot |
| shutdown.force-end-apps | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-automatic-maintenance | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-autoplay | tier2 | partially verified on real Windows | registry, registry | snapshot |
| startup.disable-background-apps | tier2 | partially verified on real Windows | registry, registry | snapshot |
| startup.disable-cloud-notifications | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-cortana | tier2 | partially verified on real Windows | registry | snapshot |
| startup.disable-gamebar-presence | tier2 | blocked by profile by design | registry | snapshot |
| startup.enable-game-mode | tier2 | partially verified on real Windows | registry | snapshot |
| storage.disable-indexing | tier2 | partially verified on real Windows | service | snapshot |
| storage.disable-last-access | tier3 | partially verified on real Windows | registry | snapshot |
| storage.enable-write-caching | tier3 | partially verified on real Windows | registry, registry | snapshot |
| system.defer-feature-updates | tier3 | blocked by profile by design | registry, registry | snapshot |
| system.disable-update-auto-restart | tier3 | blocked by profile by design | registry | snapshot |
| tasks.disable-app-suggestion-tasks | tier2 | partially verified on real Windows | task, task, task | snapshot |
| tasks.disable-chkdsk-tasks | tier2 | blocked by profile by design | task | snapshot |
| tasks.disable-cloud-content-tasks | tier2 | partially verified on real Windows | task, task | snapshot |
| tasks.disable-defender-tasks | tier2 | expert-only / intentionally not broadly verified yet | task, task, task, task | snapshot |
| tasks.disable-defrag-tasks | tier2 | blocked by profile by design | task | snapshot |
| tasks.disable-device-census | tier2 | partially verified on real Windows | task, task | snapshot |
| tasks.disable-diagnostic-tasks | tier2 | partially verified on real Windows | task, task, task, task | snapshot |
| tasks.disable-dotnet-tasks | tier2 | blocked by profile by design | task, task | snapshot |
| tasks.disable-feedback-tasks | tier2 | partially verified on real Windows | task, task | snapshot |
| tasks.disable-flighting-tasks | tier2 | partially verified on real Windows | task, task, task | snapshot |
| tasks.disable-maintenance-tasks | tier2 | blocked by profile by design | task, task | snapshot |
| tasks.disable-maps-tasks | tier2 | blocked by profile by design | task, task | snapshot |
| tasks.disable-onedrive-tasks | tier2 | blocked by profile by design | task, task | snapshot |
| tasks.disable-power-efficiency-tasks | tier2 | partially verified on real Windows | task | snapshot |
| tasks.disable-speech-tasks | tier2 | partially verified on real Windows | task, task | snapshot |
| tasks.disable-telemetry-tasks | tier2 | partially verified on real Windows | task, task, task, task, task, task, task | snapshot |
| tasks.disable-update-tasks | tier2 | blocked by profile by design | task, task, task, task, task | snapshot |
