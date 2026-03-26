import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/hardware":  "Hardware Profile",
  "/tuning":    "Tuning Plan",
  "/apply":     "Apply Workflow",
  "/bios":      "BIOS Guidance",
  "/benchmark": "Benchmark Lab",
  "/thermal":   "Thermal & Bottleneck",
  "/apps":      "App Hub",
  "/rollback":  "Rollback Center",
  "/settings":  "Settings",
};

export function TitleBar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface px-6 drag-region">
      <h1 className="text-base font-semibold text-ink no-drag">{title}</h1>
    </header>
  );
}
