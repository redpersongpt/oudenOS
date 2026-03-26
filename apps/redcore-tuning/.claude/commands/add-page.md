Add a new page/screen to the redcore-Tuning desktop app.

Given a page name and purpose:

1. **Page component** — Create `apps/desktop/src/renderer/pages/<page-name>/<PageName>Page.tsx`
2. **Route** — Add the route in `apps/desktop/src/renderer/App.tsx`
3. **Sidebar entry** — Add navigation item in `apps/desktop/src/renderer/components/layout/Sidebar.tsx`
4. **Store** — If the page needs local state beyond what exists, create a Zustand store in `apps/desktop/src/renderer/stores/`
5. **Premium gate** — If premium feature, wrap content with `PremiumGate`

Follow the existing page patterns. Use design tokens, Tailwind, Framer Motion for entrance animations. Use the `Card`, `Button`, `Badge`, `MetricCard` primitives from `components/ui/`.
