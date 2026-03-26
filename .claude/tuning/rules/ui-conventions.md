# UI Conventions

When modifying `apps/desktop/src/renderer/`:

- Use design tokens from `packages/design-system` — never hardcode colors, spacing, or typography
- Tailwind classes only — no inline styles except for dynamic values (transforms, calculated positions)
- Framer Motion for all animations — use shared motion variants from `design-system/src/motion/`
- Zustand stores in `renderer/stores/` — no prop drilling beyond 2 levels
- Pages are self-contained in `renderer/pages/<feature>/` directories
- Reuse components from `renderer/components/ui/` before creating new ones
- Premium features must render `PremiumGate` wrapper when license tier is "free"
- All service calls go through `window.redcore.service.call()` — never import Node modules
- Responsive: min 1024px width, design for 1440px default
- Custom titlebar: window controls are in `TitleBar.tsx`, don't duplicate
