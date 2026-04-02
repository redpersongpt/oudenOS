# Harvest Report: Nothing Design System
Generated: 2026-04-02
Source: https://github.com/dominikmartn/nothing-design-skill
Pages crawled: 5 (README, SKILL.md, tokens.md, components.md, platform-mapping.md)
Strategy: Full repo extraction via GitHub API + raw content fetch

---

## Repo Structure

```
nothing-design-skill/
  README.md                              # Overview, install instructions
  preview.gif                            # Animated preview
  LICENSE                                # MIT
  nothing-design/
    SKILL.md                             # Design philosophy, craft rules, anti-patterns
    references/
      tokens.md                          # Colors, fonts, spacing, motion, iconography
      components.md                      # All component specs
      platform-mapping.md                # CSS vars, SwiftUI, React/Tailwind output
```

No .css, .scss, .json, or separate design token files exist. All tokens are documented as markdown. The CSS custom properties block lives in `platform-mapping.md`.

---

## 1. FONTS

### Font Stack (3 families)

| Role | Font | Fallback | Weights |
|------|------|----------|---------|
| Display / Hero | `Doto` | `"Space Mono", monospace` | 400–700, variable dot-size |
| Body / UI | `Space Grotesk` | `"DM Sans", system-ui, sans-serif` | 300 (Light), 400, 500, 700 |
| Data / Labels | `Space Mono` | `"JetBrains Mono", "SF Mono", monospace` | 400, 700 |

All three are Google Fonts — load via `<link>` or `@import`.

**Why these fonts:** Doto is a variable dot-matrix font, the closest Google Fonts equivalent to NDot 57 (Nothing's actual proprietary font). Space Grotesk and Space Mono are from Colophon Foundry, the same foundry that designed Nothing's actual typefaces — they share design DNA.

**Font discipline rules:**
- Max 2 font families per screen
- Max 3 font sizes per screen
- Max 2 font weights (Regular + one other: Light or Medium, rarely Bold)
- Doto only at 36px+ (hero moments only, never body text)
- Labels: always Space Mono, ALL CAPS, 0.06–0.1em tracking, 11–12px

---

## 2. TYPE SCALE

| Token | Size | Line Height | Letter Spacing | Use |
|-------|------|-------------|----------------|-----|
| `--display-xl` | 72px | 1.0 | -0.03em | Hero numbers, time displays |
| `--display-lg` | 48px | 1.05 | -0.02em | Section heroes, percentages |
| `--display-md` | 36px | 1.1 | -0.02em | Page titles |
| `--heading` | 24px | 1.2 | -0.01em | Section headings |
| `--subheading` | 18px | 1.3 | 0 | Subsections |
| `--body` | 16px | 1.5 | 0 | Body text |
| `--body-sm` | 14px | 1.5 | 0.01em | Secondary body |
| `--caption` | 12px | 1.4 | 0.04em | Timestamps, footnotes |
| `--label` | 11px | 1.2 | 0.08em | ALL CAPS monospace labels |

**Hierarchy order:** `display (Doto) > heading (Space Grotesk) > label (Space Mono caps) > body (Space Grotesk)` — four levels max.

---

## 3. COLOR PALETTE

### Dark Mode (primary)

| Token | Hex | Contrast on #000 | Role |
|-------|-----|------------------|------|
| `--black` | `#000000` | — | Primary background (OLED) |
| `--surface` | `#111111` | 1.3:1 | Elevated surfaces, cards |
| `--surface-raised` | `#1A1A1A` | 1.5:1 | Secondary elevation |
| `--border` | `#222222` | — | Subtle dividers (decorative only) |
| `--border-visible` | `#333333` | — | Intentional borders, wireframe lines |
| `--text-disabled` | `#666666` | 4.0:1 | Disabled text, decorative elements |
| `--text-secondary` | `#999999` | 6.3:1 | Labels, captions, metadata |
| `--text-primary` | `#E8E8E8` | 16.5:1 | Body text |
| `--text-display` | `#FFFFFF` | 21:1 | Headlines, hero numbers |

### Light Mode

| Token | Light Hex |
|-------|-----------|
| `--black` | `#F5F5F5` (warm off-white — NOT pure white) |
| `--surface` | `#FFFFFF` |
| `--surface-raised` | `#F0F0F0` |
| `--border` | `#E8E8E8` |
| `--border-visible` | `#CCCCCC` |
| `--text-disabled` | `#999999` |
| `--text-secondary` | `#666666` |
| `--text-primary` | `#1A1A1A` |
| `--text-display` | `#000000` |
| `--interactive` | `#007AFF` |

### Accent & Status Colors (identical dark + light)

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#D71921` | Signal red: active states, destructive, urgent. One per screen. Never decorative. |
| `--accent-subtle` | `rgba(215,25,33,0.15)` | Accent tint backgrounds |
| `--success` | `#4A9E5C` | Confirmed, completed, connected |
| `--warning` | `#D4A843` | Caution, pending, degraded |
| `--error` | `#D71921` | Same as --accent |
| `--info` | `#999999` | Uses secondary text color |
| `--interactive` | `#5B9BF6` (dark) / `#007AFF` (light) | Tappable text: links, picker values. Not for buttons. |

**Color philosophy:**
- The grayscale IS the hierarchy — 4 text levels per screen max
- Red (#D71921) is an interrupt, not a hierarchy member. If nothing is urgent, no red.
- Data status colors exempt from "one accent" rule when encoding actual data values
- Apply status colors to the VALUE, not labels or row backgrounds
- Light mode feel: printed technical manual (off-white paper, black ink)
- Dark mode feel: instrument panel in a dark room (OLED black, white data glowing)

---

## 4. SPACING SYSTEM (8px base)

| Token | Value | Meaning |
|-------|-------|---------|
| `--space-2xs` | 2px | Optical adjustments only |
| `--space-xs` | 4px | Icon-to-label gaps, tight padding |
| `--space-sm` | 8px | Component internal spacing |
| `--space-md` | 16px | Standard padding, element gaps |
| `--space-lg` | 24px | Group separation |
| `--space-xl` | 32px | Section margins |
| `--space-2xl` | 48px | Major section breaks |
| `--space-3xl` | 64px | Page-level vertical rhythm |
| `--space-4xl` | 96px | Hero breathing room |

**Spacing as meaning:**
- Tight (4–8px) = "These belong together" (icon + label, number + unit)
- Medium (16px) = "Same group, different items" (list items, form fields)
- Wide (32–48px) = "New group starts here" (section breaks)
- Vast (64–96px) = "This is a new context" (hero to content, major divisions)

Rule: if a divider line is needed, the spacing is wrong. Dividers are a symptom of insufficient spacing contrast.

---

## 5. BORDER & RADIUS

| Context | Radius |
|---------|--------|
| Cards | 12–16px |
| Compact cards | 8px |
| Technical components | 4px |
| Buttons (pill) | 999px |
| Buttons (technical) | 4–8px |
| Modals | 16px |
| Tags/chips (pill) | 999px |
| Tags/chips (technical) | 4px |
| Dropdown menus | 8px |
| Bottom sheets (top) | 16px |

**Hard rule: no border-radius > 16px on cards.**

Border values:
- Subtle: `1px solid #222222` (--border)
- Intentional: `1px solid #333333` (--border-visible)
- Active indicator: `2px solid #D71921` (--accent) — left side of active rows

---

## 6. MOTION & ANIMATION

- Micro interactions: 150–250ms
- Transitions: 300–400ms
- Easing: `cubic-bezier(0.25, 0.1, 0.25, 1)` — subtle ease-out only
- Prefer opacity over position (elements fade, don't slide)
- Hover: border/text brightens. No scale, no shadows.
- No spring/bounce easing
- No parallax, scroll-jacking, gratuitous animation
- Feel: percussive (click, tick) — NOT fluid (swoosh, chime)

---

## 7. ICONOGRAPHY

- Style: monoline, 1.5px stroke, no fill
- Size: 24×24px base, 20×20 live area
- Caps/joins: round
- Color: inherits text color
- Max 5–6 strokes per icon
- Preferred libraries: Lucide (thin), Phosphor (thin)
- Never: filled icons, multi-color icons, emoji as UI

---

## 8. DOT-MATRIX MOTIF

The signature decorative pattern — visible dot grid referencing hardware displays.

**When to use:**
- Hero typography with Doto font
- Decorative grid backgrounds
- Dot-grid data visualization
- Loading indicators
- Empty state illustrations

**CSS implementation:**
```css
/* Standard dot grid */
.dot-grid {
  background-image: radial-gradient(circle, #333333 1px, transparent 1px);
  background-size: 16px 16px;
}

/* Subtle dot grid */
.dot-grid-subtle {
  background-image: radial-gradient(circle, #222222 0.5px, transparent 0.5px);
  background-size: 12px 12px;
}
```

Dots: 1–2px diameter, uniform 12–16px grid. Opacity 0.1–0.2 for backgrounds, full opacity for data. Never use as container border or button style.

---

## 9. COMPONENT SPECIFICATIONS

### Cards / Surfaces
- Background: `#111111` (--surface) or `#1A1A1A` (--surface-raised)
- Border: `1px solid #222222` or none
- Radius: 12–16px standard, 8px compact, 4px technical
- Padding: 16–24px
- No shadows. Flat surfaces, border separation only.

### Buttons

| Variant | Background | Border | Text | Radius |
|---------|-----------|--------|------|--------|
| Primary | `#FFFFFF` | none | `#000000` | 999px (pill) |
| Secondary | transparent | `1px solid #333333` | `#E8E8E8` | 999px |
| Ghost | transparent | none | `#999999` | 0 |
| Destructive | transparent | `1px solid #D71921` | `#D71921` | 999px |

All buttons: Space Mono, 13px, ALL CAPS, letter-spacing 0.06em, padding 12px 24px, min height 44px.

### Inputs
- Underline preferred: `1px solid #333333` bottom border
- Full border alternative: 8px radius
- Label style: Space Mono, ALL CAPS, `#999999` (--text-secondary), sits above field
- Focus state: border → `#E8E8E8` (--text-primary)
- Error state: border → `#D71921` (--accent), message below in accent color
- Input text: Space Mono

### Lists / Data Rows
- Dividers: `1px solid #222222` full-width
- Row padding: 12–16px vertical
- Layout: label left (Space Mono, ALL CAPS, `#999999`), value right (`#E8E8E8`)
- No alternating row backgrounds
- Status value colors: apply to value, trend arrow inherits value color
- Sub-items: indented 16–24px, same divider (no tree lines)

### Tables / Data Grids
- Header: `--label` style + bottom border `#333333`
- Cell text: Space Mono for numbers, Space Grotesk for text
- Cell padding: 12px 16px
- Numbers right-aligned, text left-aligned
- No zebra striping, no cell backgrounds
- Active row: `#1A1A1A` background + left `2px solid #D71921`

### Navigation
- Mobile: bottom bar
- Desktop: horizontal text bar
- Labels: Space Mono, ALL CAPS
- Active: `#FFFFFF` (--text-display) + dot or underline indicator
- Inactive: `#666666` (--text-disabled)
- Pattern: bracket `[ HOME ]  GALLERY  INFO` or pipe `HOME | GALLERY | INFO`
- Back button: circular 40–44px, `#111111` bg, thin chevron `<`, top-left 16px from edges

### Tags / Chips
- Border: `1px solid #333333`, no fill
- Text: Space Mono, `--caption` (12px), ALL CAPS
- Radius: 999px (pill) or 4px (technical)
- Padding: 4px 12px
- Active: `#FFFFFF` border + text (--text-display)

### Segmented Control
- Container: `1px solid #333333`, pill or 8px rounded
- Active segment: `#FFFFFF` bg, `#000000` text (inverted fill)
- Inactive segment: transparent, `#999999` text
- Text: Space Mono, ALL CAPS, 11px (--label)
- Height: 36–44px
- Transition: 200ms ease-out
- Max 2–4 segments

### Toggles / Switches
- Shape: pill track, circle thumb
- Off state: `#333333` track, `#666666` thumb
- On state: `#FFFFFF` track, `#000000` thumb
- Min touch target: 44px

### Segmented Progress Bars (signature component)
The most distinctive Nothing UI pattern. Discrete rectangular blocks, mechanical/instrument-like.

- Label + value shown above the bar
- Full-width bar of discrete rectangular segments with 2px gaps
- Segments: square ends, NO border-radius
- Filled segment: solid status color
- Empty segment: `#222222` dark / `#E0E0E0` light

| State | Fill Color | When |
|-------|-----------|------|
| Neutral | `#FFFFFF` (--text-display) | Within normal range |
| Over limit | `#D71921` (--accent) | Exceeds target |
| Good | `#4A9E5C` (--success) | Healthy range |
| Moderate | `#D4A843` (--warning) | Caution zone |

Sizes: Hero = 16–20px height, Standard = 8–12px, Compact = 4–6px. Always pair with numeric readout.

### Modals
- Backdrop: `rgba(0,0,0,0.8)`
- Dialog: `#111111` bg + `1px solid #333333` + 16px radius
- Centered, max 480px wide
- Close: `[ X ]` top-right ghost button

### Bottom Sheets
- Background: `#111111`
- 2px handle bar centered at top
- 16px top border radius
- Drag-to-dismiss

### Dropdowns
- Background: `#1A1A1A` (--surface-raised)
- Border: `1px solid #333333`, 8px radius
- Item height: 44px
- Selected: left 2px accent bar
- No shadow

### State Patterns
- **Error:** Input border → `#D71921` + message below. Never red backgrounds.
- **Empty state:** Centered, 96px+ padding. Headline `#999999`, 1-sentence description `#666666`. Optional dot-matrix illustration. No mascots/illustrations.
- **Loading:** Segmented spinner or `[LOADING]` bracket text. No skeleton screens.
- **Disabled:** Opacity 0.4 or --text-disabled color. Borders fade to --border.
- **Inline status:** `[SAVED]`, `[ERROR: ...]` — Space Mono, `--caption`, no toasts.

---

## 10. VISUAL HIERARCHY SYSTEM (THE THREE-LAYER RULE)

Every screen has exactly three layers:

| Layer | What | How |
|-------|------|-----|
| Primary | The ONE thing user sees first | Doto or Space Grotesk at display size. 48–96px breathing room. |
| Secondary | Supporting context. Labels, descriptions, data. | Space Grotesk body/subheading. `--text-primary`. Grouped tight (8–16px) to primary. |
| Tertiary | Metadata, navigation, system info. | Space Mono caption/label. `--text-secondary` or `--text-disabled`. ALL CAPS. Pushed to edges or bottom. |

---

## 11. DESIGN PHILOSOPHY (KEY PRINCIPLES)

1. **Subtract, don't add.** Every element must earn its pixel.
2. **Structure is ornament.** Expose the grid, the data, the hierarchy itself.
3. **Monochrome is the canvas.** Color is an event, not a default.
4. **Type does the heavy lifting.** Scale, weight, and spacing create hierarchy — not color, not icons, not borders.
5. **Both modes are first-class.** Dark: OLED black. Light: warm off-white. Neither derived.
6. **Industrial warmth.** Technical and precise but never cold.
7. **Asymmetry > symmetry.** Favor deliberately unbalanced composition.
8. **One break per screen.** Consistent everything, then break exactly one rule per screen. That break IS the design.

---

## 12. ANTI-PATTERNS (WHAT TO NEVER DO)

- No gradients in UI chrome
- No shadows, no blur — flat surfaces only
- No skeleton loading screens → use `[LOADING...]` text
- No toast popups → use inline `[SAVED]`, `[ERROR: ...]`
- No sad-face illustrations, cute mascots, multi-paragraph empty states
- No zebra striping in tables
- No filled icons, multi-color icons, emoji as UI
- No parallax, scroll-jacking, gratuitous animation
- No spring/bounce easing — subtle ease-out only
- No border-radius > 16px on cards
- No red backgrounds — red is only for text/border/stroke
- No color before opacity/pattern in data visualization
- No new font size when spacing can solve the problem

---

## 13. CSS CUSTOM PROPERTIES (COMPLETE BLOCK)

```css
/* Load from Google Fonts */
/* @import url('https://fonts.googleapis.com/css2?family=Doto:wght@400;700&family=Space+Grotesk:wght@300;400;500;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap'); */

:root {
  /* === BACKGROUNDS === */
  --black:           #000000;
  --surface:         #111111;
  --surface-raised:  #1A1A1A;

  /* === BORDERS === */
  --border:          #222222;
  --border-visible:  #333333;

  /* === TEXT === */
  --text-disabled:   #666666;
  --text-secondary:  #999999;
  --text-primary:    #E8E8E8;
  --text-display:    #FFFFFF;

  /* === ACCENT & STATUS === */
  --accent:          #D71921;
  --accent-subtle:   rgba(215, 25, 33, 0.15);
  --success:         #4A9E5C;
  --warning:         #D4A843;
  --error:           #D71921;
  --interactive:     #5B9BF6;

  /* === SPACING === */
  --space-2xs:  2px;
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   24px;
  --space-xl:   32px;
  --space-2xl:  48px;
  --space-3xl:  64px;
  --space-4xl:  96px;
}

/* Light mode overrides */
[data-theme="light"], @media (prefers-color-scheme: light) {
  --black:           #F5F5F5;
  --surface:         #FFFFFF;
  --surface-raised:  #F0F0F0;
  --border:          #E8E8E8;
  --border-visible:  #CCCCCC;
  --text-disabled:   #999999;
  --text-secondary:  #666666;
  --text-primary:    #1A1A1A;
  --text-display:    #000000;
  --interactive:     #007AFF;
  /* accent, success, warning, error: unchanged */
}
```

---

## 14. TAILWIND IMPLEMENTATION GUIDE

For React + Tailwind, extend the config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        nd: {
          black:          '#000000',
          surface:        '#111111',
          'surface-raised': '#1A1A1A',
          border:         '#222222',
          'border-visible': '#333333',
          'text-disabled': '#666666',
          'text-secondary': '#999999',
          'text-primary': '#E8E8E8',
          'text-display': '#FFFFFF',
          accent:         '#D71921',
          success:        '#4A9E5C',
          warning:        '#D4A843',
          interactive:    '#5B9BF6',
        }
      },
      fontFamily: {
        display: ['"Doto"', '"Space Mono"', 'monospace'],
        body:    ['"Space Grotesk"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"Space Mono"', '"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['72px', { lineHeight: '1.0',  letterSpacing: '-0.03em' }],
        'display-lg': ['48px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-md': ['36px', { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        'nd-heading': ['24px', { lineHeight: '1.2',  letterSpacing: '-0.01em' }],
        'nd-subheading': ['18px', { lineHeight: '1.3', letterSpacing: '0' }],
        'nd-body':    ['16px', { lineHeight: '1.5',  letterSpacing: '0' }],
        'nd-body-sm': ['14px', { lineHeight: '1.5',  letterSpacing: '0.01em' }],
        'nd-caption': ['12px', { lineHeight: '1.4',  letterSpacing: '0.04em' }],
        'nd-label':   ['11px', { lineHeight: '1.2',  letterSpacing: '0.08em' }],
      },
      spacing: {
        '2xs': '2px',
        'xs':  '4px',
        'sm':  '8px',
        // md = 16px (Tailwind default 4 = 16px)
        'nd-lg': '24px',
        'nd-xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },
      borderRadius: {
        'card':      '16px',
        'card-sm':   '12px',
        'compact':   '8px',
        'technical': '4px',
        'pill':      '999px',
      },
      transitionDuration: {
        'micro':      '200ms',
        'transition': '300ms',
      },
      transitionTimingFunction: {
        'nd': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    }
  }
}
```

### Key Tailwind component class patterns:

```
Button Primary:    font-mono text-[13px] uppercase tracking-[0.06em] px-6 py-3
                   bg-nd-text-display text-nd-black rounded-pill min-h-[44px]

Button Secondary:  font-mono text-[13px] uppercase tracking-[0.06em] px-6 py-3
                   bg-transparent border border-nd-border-visible text-nd-text-primary rounded-pill

Label:             font-mono text-nd-label uppercase tracking-[0.08em] text-nd-text-secondary

Card:              bg-nd-surface border border-nd-border rounded-card p-4 md:p-6

Progress Segment:  w-full h-3 rounded-none (square ends, no radius)
Progress Track:    flex gap-[2px]
```

---

## 15. DATA VISUALIZATION PATTERNS

| Form | Best for | Weight |
|------|----------|--------|
| Hero number (large Doto/Space Mono) | Single key metric | Heavy — use once per screen |
| Segmented progress bar | Progress toward goal | Medium |
| Concentric rings / arcs | Multiple related percentages | Medium |
| Inline compact bar | Secondary metrics in rows | Light |
| Number-only with status color | Values without proportion | Lightest |
| Sparkline | Trends over time | Medium |
| Stat row (label + value) | Simple data points | Light |

Charts:
- Lines: 1.5–2px, `--text-display` color
- Average/reference: dashed 1px, `--text-secondary`
- Axis labels: Space Mono, `--caption`
- Grid lines: `--border`, horizontal only
- No area fill, no legend boxes — label lines directly
- Category differentiation order: opacity (100%/60%/30%) → pattern (solid/striped/dotted) → line style → color (last resort)

---

## Metadata

- Repo: https://github.com/dominikmartn/nothing-design-skill
- License: MIT
- Skill version: 3.0.0
- File count: 5 readable files (README, SKILL.md, tokens.md, components.md, platform-mapping.md)
- Total design token coverage: complete — all values extracted
- No separate .css/.scss/.json files exist in the repo
