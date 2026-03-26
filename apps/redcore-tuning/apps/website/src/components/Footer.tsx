import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const links = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Download", href: "/download" },
    { label: "Changelog", href: "/changelog" },
  ],
  Support: [
    { label: "Documentation", href: "/docs" },
    { label: "Community", href: "/community" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "License", href: "/license" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-surface-950 mt-24">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <Zap className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-[15px] font-bold tracking-tight">
                red<span className="text-brand-500">core</span>
              </span>
            </Link>
            <p className="text-sm text-white/40 max-w-xs leading-relaxed">
              Precision Windows optimization for gamers, creators, and power
              users who demand more from their hardware.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                {group}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className="text-sm text-white/50 hover:text-white/80 transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} redcore. All rights reserved. Windows is a trademark of Microsoft Corporation.
          </p>
          <p className="text-xs text-white/20">
            Built for enthusiasts. Not affiliated with Microsoft.
          </p>
        </div>
      </div>
    </footer>
  );
}
