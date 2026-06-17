// English UI strings — source of truth and fallback for any key missing in tr.ts.
// Dot-namespaced flat keys. Questionnaire/playbook *content* is not here; it is
// localized via the data overlays (questionnaire-tr / playbook-tr).

export const en: Record<string, string> = {
  // Title bar / window
  "titlebar.brand": "OUDEN · OS",
  "titlebar.minimize": "Minimize",
  "titlebar.close": "Close",
  "lang.toggle": "Language",

  // Sidebar rail
  "rail.setup": "SETUP",
  "nav.welcome": "WELCOME",
  "nav.assessment": "ASSESSMENT",
  "nav.profile": "PROFILE",
  "nav.preservation": "PRESERVATION",
  "nav.playbook-strategy": "STRATEGY",
  "nav.playbook-review": "PLAN",
  "nav.personalization": "PERSONALIZE",
  "nav.final-review": "REVIEW",
  "nav.execution": "APPLY",
  "nav.reboot-resume": "REBOOT",
  "nav.report": "COMPLETE",
  "nav.donation": "SUPPORT",
  "nav.handoff": "NEXT STEPS",

  // Bottom bar
  "bar.back": "BACK",
  "cta.welcome": "BEGIN",
  "cta.playbook-strategy": "REVIEW",
  "cta.playbook-review": "PERSONALIZE",
  "cta.final-review": "APPLY",
  "cta.report": "NEXT STEPS",
  "cta.profile": "CONFIGURE",
  "cta.default": "CONTINUE",

  // Welcome screen
  "welcome.os": "Operating system",
  "welcome.tagline.0": "Make changes you can explain.",
  "welcome.tagline.1": "Keep what matters. Cut the rest.",
  "welcome.tagline.2": "Clear tradeoffs. No guesswork.",
  "welcome.tagline.3": "Measure it before you trust it.",
  "welcome.feature.0": "Remove clutter",
  "welcome.feature.1": "Reduce tracking",
  "welcome.feature.2": "Faster startup",
  "welcome.feature.3": "Lower latency",
  "welcome.feature.4": "Steadier frame times",
  "welcome.feature.5": "Cleaner system",
  "welcome.preview.title": "macOS preview",
  "welcome.preview.body":
    "Every screen and question here is exactly what the Windows app shows. This Mac build only previews the interface — it never changes anything on your computer. oudenOS applies tweaks on Windows only.",
  "welcome.admin.title": "Administrator access required",
  "welcome.admin.body": "Run the app as administrator to apply all changes.",
  "welcome.cta": "Start assessment",
  "welcome.footer": "Rollback available · stays on this machine",
};
