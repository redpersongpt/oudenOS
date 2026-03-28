# UI ENHANCER CLAUDE — Automated UI/UX Quality Guardian

**I am UI Enhancer Claude, your always-on UI/UX quality guardian and design perfectionist.** My role is to continuously scan every UI component, page, animation, layout, and interaction in this project and ensure it meets Apple-grade professionalism standards. I work alongside Bug Hunter Claude but focus exclusively on visual quality, UX patterns, accessibility, animation polish, responsive behavior, and design consistency.

**CLI Claude: read this file before touching ANY UI code. It contains known UI issues, enhancement priorities, design rules, and UX recommendations that must inform your work.**

---

## MY TOOLS & METHODOLOGY

### MCP Servers I Use
- **context7** (`resolve-library-id` + `query-docs`): I look up live documentation for React, Framer Motion, Tailwind CSS, Recharts, Lucide React, and any other UI library before making recommendations. Always verify API usage against latest docs.

### Vibecosystem Agents I Coordinate With
- **frontend-dev** — Implementation partner for UI changes
- **code-reviewer** — Cross-reviews my UI recommendations for feasibility
- **qa-engineer** — Validates UI changes don't break functionality
- **architect** — Consults on component structure decisions
- **clean-arch-expert** — Ensures UI components follow clean architecture

### My Specialized Sub-Agents (from .agents/subagents/)
- **bughunter-ui-ux** — Finds broken layouts, dead handlers, missing states, accessibility violations
- **bughunter-typescript** — Catches type errors in React components, broken hooks, state issues

### Skills I Use (from .agents/skills/ and ~/.claude/skills/)
- **deep-scan** — Full parallel scan methodology
- **frontend-patterns** — React/Tailwind/Framer Motion best practices
- **animation-patterns** — Motion design patterns and spring configs
- **form-validation** — Form UX patterns

---

## DESIGN SYSTEM RULES — NON-NEGOTIABLE

### Color System (Dark-First)
```
Backgrounds:     bg-[#0a0a0f] → bg-[#12121a] → bg-[#1a1a25] → bg-[#222230]
Text Primary:    text-white/95
Text Secondary:  text-white/70
Text Tertiary:   text-white/50
Text Disabled:   text-white/30
Accent Primary:  #6366f1 (indigo-500) — CTAs, active states, focus rings
Accent Hover:    #818cf8 (indigo-400)
Success:         #22c55e (green-500, muted in dark)
Warning:         #f59e0b (amber-500, muted in dark)
Error:           #ef4444 (red-500, muted in dark)
Info:            #3b82f6 (blue-500, muted in dark)
```

**ECO-SITE overrides** (`apps/web` uses different tokens):
```
Accent:   #E8254B (brand red — not indigo)
Surface:  #1e1e22 (base), #252529 (card)
Border:   #38383e
Text:     #f0f0f4 primary, #a0a0ac secondary, #6a6a76 tertiary
```

VIOLATIONS TO CATCH:
- Any garish neon colors
- Any pure white (#fff) backgrounds in dark mode
- Any color that doesn't come from the token system
- Any text with contrast ratio below 4.5:1 (WCAG AA)
- Any accent color used inconsistently

### Typography
```
Font Stack:      'Inter', -apple-system, BlinkMacSystemFont, sans-serif
Code Font:       'JetBrains Mono', 'Fira Code', monospace
Scale:           xs(11px) sm(13px) base(14px) md(16px) lg(18px) xl(20px) 2xl(24px) 3xl(30px) 4xl(36px)
Weights:         400(body) 500(labels) 600(headings) 700(emphasis)
Line Heights:    1.25(headings) 1.5(body) 1.75(reading)
Letter Spacing:  -0.02em(large headings) normal(body)
```

VIOLATIONS TO CATCH:
- Any hardcoded font sizes not from the scale
- Any missing font-weight specification
- Any heading without proper letter-spacing
- Any body text with wrong line-height
- Comic Sans, Times New Roman, or any non-system serif font

### Spacing (4px Grid)
```
xs: 4px    sm: 8px    md: 12px    lg: 16px
xl: 24px   2xl: 32px  3xl: 48px   4xl: 64px
```

VIOLATIONS TO CATCH:
- Any spacing value not on the 4px grid
- Any inconsistent padding between similar components
- Any component with no breathing room (cramped layout)
- Any excessive whitespace that wastes screen real estate

### Border Radius
```
sm: 4px    md: 8px    lg: 12px    xl: 16px    full: 9999px
```

### Shadows (Layered, Subtle)
```
sm:   0 1px 2px rgba(0,0,0,0.3)
md:   0 4px 6px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)
lg:   0 10px 15px rgba(0,0,0,0.3), 0 4px 6px rgba(0,0,0,0.2)
xl:   0 20px 25px rgba(0,0,0,0.3), 0 8px 10px rgba(0,0,0,0.2)
glow: 0 0 20px rgba(99,102,241,0.15) — for accent elements
```

---

## ANIMATION RULES — FRAMER MOTION

### Spring Configs (MUST use these, never custom)
```typescript
const springs = {
  snappy:  { type: "spring", stiffness: 500, damping: 30 },
  smooth:  { type: "spring", stiffness: 300, damping: 25 },
  gentle:  { type: "spring", stiffness: 200, damping: 20 },
  bounce:  { type: "spring", stiffness: 400, damping: 15 },
}
```

### Required Animations
Every interactive element MUST have:
- **Hover state**: translateY(-1px) + shadow expansion OR background shift. Never nothing.
- **Press/Active state**: scale(0.97) or scale(0.98). Never nothing.
- **Focus state**: visible focus ring (2px accent outline, 2px offset). For keyboard nav.
- **Disabled state**: opacity 0.5, cursor-not-allowed, no hover effects.

Every page MUST have:
- **Enter animation**: fade + slide from right (10-15px), 200-250ms
- **Exit animation**: fade + slide to left, matched timing
- **Staggered children**: cards/list items enter with staggerChildren: 0.05

Every modal/dialog MUST have:
- **Backdrop**: fade to rgba(0,0,0,0.6) with backdrop-filter: blur(8px)
- **Content**: spring scale from 0.95 + opacity
- **Close**: reverse of open, slightly faster

Every loading state MUST have:
- **Skeleton**: shimmer animation (gradient slide left to right, 1.5s loop)
- **Spinner**: rotate animation, accent colored, centered
- **Progress bar**: smooth width transition with easing

VIOLATIONS TO CATCH:
- Any interactive element without hover/press states
- Any page without enter/exit animations
- Any modal without backdrop blur
- Any loading state without skeleton or spinner
- Any animation using duration instead of spring physics
- Any animation longer than 400ms (feels sluggish)
- Any animation shorter than 100ms (feels jarring)
- Any `transition` CSS when Framer Motion should be used
- Janky/stuttering animations (likely missing will-change or layout thrashing)

---

## RESPONSIVE RULES

Must look perfect at: 800px, 1024px, 1280px, 1440px, 1920px, 2560px

VIOLATIONS TO CATCH:
- Any horizontal scroll at any breakpoint
- Any content clipping or overflow
- Any text truncation without ellipsis or tooltip
- Any card grid that doesn't reflow (hardcoded columns)
- Any sidebar that doesn't collapse at narrow widths
- Any form that doesn't stack on narrow viewports
- Any font size that's too small below 1024px
- Any touch target smaller than 44x44px

---

## COMPONENT QUALITY CHECKLIST

For EVERY component, check:

### Buttons
- [ ] Has primary/secondary/ghost/danger variants
- [ ] Hover: lift + shadow or bg shift
- [ ] Press: scale(0.97)
- [ ] Loading: spinner replaces text, same width maintained
- [ ] Disabled: muted, no hover, cursor-not-allowed
- [ ] Focus: visible ring for keyboard nav
- [ ] Icon alignment: vertically centered with text

### Inputs
- [ ] Has focus ring animation
- [ ] Has error state with red border + shake animation
- [ ] Has label (never placeholder-only)
- [ ] Has clear button for search inputs
- [ ] Password inputs have show/hide toggle
- [ ] Proper padding (not cramped)

### Cards
- [ ] Consistent border-radius across all cards
- [ ] Hover state (lift or border highlight)
- [ ] Selected state (accent border or background)
- [ ] Loading state (skeleton matching layout)
- [ ] Proper content padding
- [ ] No content overflow

### Modals
- [ ] Backdrop blur + dark overlay
- [ ] Spring entrance animation
- [ ] Close on Escape key
- [ ] Close on backdrop click
- [ ] Focus trapped inside modal
- [ ] Proper max-width, centered

### Toasts/Notifications
- [ ] Slide in from top-right
- [ ] Auto-dismiss with progress bar
- [ ] Manual dismiss button
- [ ] Stack properly (don't overlap)
- [ ] Different styles for success/error/warning/info

### Tables
- [ ] Horizontal scroll on narrow viewports
- [ ] Sticky header on vertical scroll
- [ ] Row hover highlight
- [ ] Alternating row colors or divider lines
- [ ] Sortable columns with indicator

### Charts (Recharts)
- [ ] Custom colors matching design system (no defaults)
- [ ] Rounded bar corners
- [ ] Clean axes (minimal gridlines)
- [ ] Hover tooltips with proper styling
- [ ] Smooth animation on data load
- [ ] Responsive (no fixed width)
- [ ] Legend properly positioned

---

## UX PATTERNS TO ENFORCE

### Navigation
- Sidebar must have: icon + label, collapse animation, active indicator, section dividers
- Route transitions must use AnimatePresence
- Breadcrumbs for nested views
- Command palette (Cmd+K) for power users

### Forms
- Validate on blur, not on every keystroke
- Show inline errors below fields, not in alerts
- Disable submit until form is valid
- Show loading state on submit button
- Success: redirect or success toast, never alert()

### Empty States
- Every page must have a designed empty state
- Include: illustration/icon, descriptive message, CTA button
- Never show blank white/dark space

### Error States
- Every async operation must have error handling UI
- Show: what went wrong, suggested fix, retry button
- Never show raw error messages or stack traces to users

### Loading States
- Every async operation must show loading feedback within 200ms
- Use skeleton screens that match actual content layout
- Never block the entire UI for a single loading operation

---

## AI SLOP DETECTION — ZERO TOLERANCE

Immediately flag and report these AI-generated code smells:

- Generic Bootstrap/Material UI feel instead of custom design
- Placeholder text left in production ("Lorem ipsum", "TODO", "placeholder")
- Console.log statements in production code
- Commented-out code blocks
- Generic variable names (data, item, thing, stuff)
- Copy-pasted components with slight variations instead of proper abstraction
- Inline styles when Tailwind classes exist
- !important in CSS/Tailwind
- Any stock photo vibes or generic illustrations
- "Turbo Boost 300 FPS" or any gamery/edgy marketing copy
- Rainbow gradients, neon glows, or any non-premium visual effects
- Default browser form elements (unstyled selects, checkboxes, radios)
- Alert() or confirm() dialogs instead of custom modals
- Default scrollbars (should be thin, custom-styled)
- Any UI element that looks like it came from a template

---

## WHAT I SCAN FOR (EVERY RUN)

1. **Visual Consistency**: Same spacing, colors, typography, border-radius across all pages
2. **Animation Completeness**: Every interactive element has proper motion
3. **Responsive Behavior**: No breakage at any viewport size
4. **Accessibility**: Color contrast, focus management, ARIA labels, keyboard nav
5. **Component Quality**: Every component passes the checklist above
6. **Empty/Loading/Error States**: All three exist for every async operation
7. **AI Slop**: Zero tolerance for template-quality code
8. **Design System Compliance**: All values from tokens, no hardcoded magic numbers
9. **UX Patterns**: Forms, navigation, feedback all follow the rules above
10. **Performance**: No unnecessary re-renders, lazy loading, will-change hints
11. **Dead UI Code**: Unused components, unreachable routes, orphaned styles
12. **Overlapping Styles**: Conflicting Tailwind classes, specificity wars
13. **Icon Consistency**: Same icon library (Lucide), same sizes, same stroke width
14. **Copy Quality**: Premium, calm wording. No gamer-bro language. No exclamation marks in UI copy.

---

## OUTPUT FORMAT

When I find issues, I report them here in this format:

### [SEVERITY] Issue Title
- **File**: `path/to/file.tsx`
- **Line**: 42
- **Category**: Animation | Responsive | Accessibility | Consistency | AI Slop | UX Pattern | Performance
- **Description**: What's wrong
- **Expected**: What it should be
- **Fix**: Exact code change or approach

Severities:
- **CRITICAL**: Broken UI, crashes, completely non-functional
- **HIGH**: Visible to users, bad experience, missing key interactions
- **MEDIUM**: Inconsistency, minor UX issue, polish needed
- **LOW**: Nitpick, minor improvement, nice-to-have
- **TIP**: Not a bug, but a UX enhancement recommendation

---

## CURRENT SCAN RESULTS

*Last scan: 2026-03-28 (Round 4 — partial automated audit)*

---

### RESOLVED — UI Issues Fixed Across Rounds

| Issue | File | Fix Applied |
|-------|------|-------------|
| Donate page cards invisible (CRITICAL) | `apps/web/src/components/sections/DonateSection.tsx` | Added `.section-divide` + `.premium-card` to `globals.css` |
| glow-surface / glow-brand-edge missing (HIGH) | Various orphaned sections | Added both classes to `globals.css` |
| Download CTA linked to nonexistent .exe (CRITICAL) | `PricingSection.tsx:81` | Changed href to `/downloads` |
| ExecutionStep failed-count always 0 (CRITICAL) | `apps/os-desktop` ExecutionStep | Replaced stale `failed` state with derived `failCount` |

---

### OPEN — CRITICAL

*(None currently — all critical visual bugs fixed)*

---

### OPEN — HIGH

#### [HIGH] Stale License Tier in Sidebar and Profile Pages
- **Files**: `apps/tuning-desktop/src/renderer/components/layout/Sidebar.tsx:43`, `pages/profile/ProfilePage.tsx:17`, `pages/subscription/SubscriptionPage.tsx:45`
- **Category**: UX Pattern / State management
- **Description**: `useLicenseStore((s) => s.isPremium)()` is a Zustand anti-pattern. The selector extracts the function reference (always stable), so Zustand never triggers re-render on tier change. All three components show stale premium status until full page reload — even after the user just purchased.
- **Expected**: Tier badge and feature gates update immediately after license change event.
- **Fix**: Change to `useLicenseStore((s) => s.isPremium())` (call inside selector, not outside).

#### [HIGH] Intelligence Safety Warnings Never Show
- **File**: `apps/tuning-desktop/src/renderer/pages/wizard/steps/ProfileStep.tsx:124`
- **Category**: UX Pattern / Data mismatch
- **Description**: `profile?.warningNotes ?? []` always returns `[]` because Rust returns `"warnings"` not `"warningNotes"`. The warning section in the wizard is permanently empty, hiding per-archetype safety information (e.g., "Registry changes may not persist across VM resets").
- **Expected**: Safety warnings visible in the wizard profile step.
- **Fix**: Rename Rust field from `"warnings"` to `"warningNotes"` in `intelligence.rs:697`.

---

### OPEN — MEDIUM

#### [MEDIUM] os-desktop Wizard Missing RebootResume and Handoff Steps
- **Files**: Missing: `apps/os-desktop/src/renderer/pages/wizard/steps/RebootResumeStep.tsx`, `HandoffStep.tsx`
- **Category**: UX Pattern / Incompleteness
- **Description**: The OS wizard currently ends at Report step. The spec calls for a RebootResume step (conditional reboot prompt) and a Handoff step (CTA to redcore-Tuning). Without HandoffStep, the Tuning CTA is embedded in ReportStep — poor separation of concerns.
- **Expected**: 13-step wizard: ... → execution → reboot-resume → report → handoff

#### [MEDIUM] PlaybookStrategyStep Not Wired
- **File**: `apps/os-desktop/src/renderer/pages/wizard/steps/PlaybookStrategyStep.tsx`
- **Category**: UX Pattern / Incompleteness
- **Description**: The strategy selection step (Conservative / Balanced / Aggressive) exists as a component but calls `setPlaybookPreset` which doesn't exist in wizard-store yet. Not rendered in WizardPage. User cannot select a preset from the wizard.
- **Fix**: See CODEXHANDOFF.md Task 1 — wire `playbookPreset` into store + add step to WizardPage.

#### [MEDIUM] og:image is Square Logo (512×512) Not Social Card
- **File**: `apps/web/src/app/layout.tsx:57-64`
- **Category**: Consistency / Missing asset
- **Description**: All pages inherit `og:image: /redcore-logo.png` at 512×512. Social shares (Discord, Twitter, LinkedIn) show a small square icon instead of a rich preview card.
- **Expected**: 1200×630 banner image at `public/og-image.png`
- **Fix**: Create banner, update `layout.tsx` metadata.

#### [MEDIUM] /donate Page Missing Canonical and openGraph Tags
- **File**: `apps/web/src/app/donate/page.tsx:5-8`
- **Category**: SEO / Consistency
- **Description**: `metadata` has title + description but no `alternates.canonical` or explicit `openGraph`. Google decides which URL to index.
- **Fix**: Add `alternates: { canonical: "https://redcore.app/donate" }` and openGraph block.

---

### OPEN — LOW

#### [LOW] success Color Token Set to Red (Same as Accent)
- **File**: `apps/web/src/app/globals.css:17`
- **Category**: Consistency
- **Description**: `--color-success: #E8254B` is identical to accent. Any future component using `text-success` or `bg-success` will render in red, not green.
- **Fix**: Change to `#22c55e` (green-500) or remove the token and use `text-green-500` directly.

#### [LOW] 19 Orphaned UI Components Not Used on Any Active Page
- **Files**: `apps/web/src/components/sections/{OSSection,TuningSection,WizardSection,IntelligenceSection,...}.tsx`, various `ui/*.tsx`
- **Category**: Dead UI Code
- **Description**: 10+ section components and 9+ UI components (Badge, Button, Card, GlowOrb, etc.) build fine but are not imported by any active page route. Left over from homepage redesign iterations.
- **Fix**: Either activate them in the new homepage version or delete them to reduce bundle analysis noise.

#### [LOW] border-l-brand-500 Invalid Tailwind Class in PathsSection
- **File**: `apps/web/src/components/sections/PathsSection.tsx:61`
- **Category**: Consistency
- **Description**: `border-l-brand-500` is not valid Tailwind syntax. Should be `border-l border-brand-500`. No visual impact (component not used).

#### [LOW] brand-950 and brand-900 Tokens Used but Not Defined
- **File**: `apps/web/src/components/ui/Badge.tsx:17`
- **Category**: Consistency
- **Description**: `bg-brand-950/60` and `border-brand-900/40` — only `brand-400`, `brand-500`, `brand-600` are defined. The `brand` Badge variant renders with no background. No visual impact (Badge not used on active pages).

---

## ECO-SITE SPECIFIC AUDIT (apps/web)

### Dark Theme — PASS
- All active components use dark tokens consistently
- Background: `#1e1e22`, Cards: `#252529`, Text: `#f0f0f4`
- No light colors bleed through
- No `prefers-color-scheme` media queries (dark-only intentional)

### Framer Motion — PASS
- `framer-motion` v12.38.0 installed correctly
- All components with animations use `"use client"` directive
- `motion`, `AnimatePresence`, `useInView` correctly imported
- `lib/motion.ts` exports (`fadeIn`, `slideUp`, `staggerContainer`) used correctly
- Hero uses CSS-only animations for GPU-accelerated performance — correct approach

### Responsive Design — PASS (with noted intentional decisions)
| Section | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navigation | Hamburger menu + full-screen overlay | Same | Nav links + auth buttons |
| Hero | Text + CTAs only (visual hidden) | Same | 2-col with hexagon constellation |
| Ecosystem | 1-col | 2-col | 3-col grid |
| Pricing | 1-col stacked | Same | 2-col side-by-side |
| Footer | 2-col | 4-col | 4-col |

Note: Hero visual (`HeroVisual`) is `hidden lg:flex` — intentional, clean on mobile.

### Meta Tags — MOSTLY PASS
| Page | Title | og:title | og:image | canonical |
|------|-------|----------|----------|-----------|
| `/` | ✓ | ✓ | Logo (wrong size) | ✓ |
| `/downloads` | ✓ | ✓ | Inherited | ✓ |
| `/donate` | ✓ | Inherited | Inherited | **Missing** |
| `/atlasos-alternative` | ✓ Fixed | ✓ Fixed | Inherited | ✓ |
| All other SEO pages | ✓ | ✓ | Inherited | ✓ |

---

## TUNING-DESKTOP SPECIFIC AUDIT

### Animation — PASS
- All wizard steps use `motion.div` with `initial/animate/exit` transitions
- `AnimatePresence` wraps step rendering in WizardPage
- Step transitions use consistent `opacity: 0, y: 8` → `opacity: 1, y: 0` pattern with `duration: 0.22`

### Wizard UI — PARTIAL
- Auth pages (login, register, forgot-password): Complete
- Dashboard, Hardware, Intelligence, Diagnostics, AppHub: Complete
- Settings, Profile, Subscription, Rollback: Complete
- BiosGuidance, ThermalBottleneck: Complete
- ErrorBoundary, TierGate, TierBadge: Complete
- Sidebar collapse animation: Present
- Missing: Wizard execution progress events (IPC events not yet emitted from Rust)

### Known UI Gaps (from MED-11 / DEAD-3)
- `ApplyWorkflowPage.tsx` subscribes to `"tuning.actionProgress"` IPC event — never fires, no visual progress
- `DashboardPage.tsx` + `HardwarePage.tsx` subscribe to `"scan.progress"` — never fires, no scan progress bar

---

## OS-DESKTOP SPECIFIC AUDIT

### Wizard Steps — IN PROGRESS
| Step | Status |
|------|--------|
| Welcome | Complete |
| Assessment (SystemAnalysisPanel) | Complete |
| Profile | Complete |
| Preservation | Complete |
| PlaybookStrategy | Component built, NOT wired |
| PlaybookReview | Complete (uses hardcoded preset) |
| Personalization | Complete |
| AppSetup | Complete |
| FinalReview | Complete |
| Execution | Complete (failCount fix applied) |
| RebootResume | NOT CREATED |
| Report | Complete |
| Handoff | NOT CREATED |

### Visual Quality
- Motion pattern consistent with `{ opacity: 0, y: 8 }` → `{ opacity: 1, y: 0 }` on all steps
- `px-6 py-6` spacing consistent across steps
- No hardcoded colors found in wizard steps — all use Tailwind tokens
- `DonationStep` + `DonationPage` — fully designed, matches OS theme

---

## ENHANCEMENT BACKLOG

*Accumulated improvement ideas:*

1. **Tuning dashboard**: Add real-time scan progress bar (requires DEAD-3 fix — IPC events)
2. **OS wizard**: Add step-level timing display (how long each action takes)
3. **Eco-site hero**: Add mobile visual (simplified version of hexagon, not hidden)
4. **Eco-site**: Create proper 1200×630 og:image for social sharing
5. **Tuning sidebar**: Add collapse animation (currently just toggle)
6. **All apps**: Add keyboard shortcut hints in tooltips on interactive elements
7. **OS wizard ExecutionStep**: Show per-action progress with action name, not just overall bar
8. **Tuning IntelligencePage**: Wire `warningNotes` display once Rust field is renamed
9. **All apps**: Audit scrollbar styling — should be thin, custom (`scrollbar-thin` or CSS `::-webkit-scrollbar`)
10. **Eco-site /donate**: Add openGraph block + canonical URL
