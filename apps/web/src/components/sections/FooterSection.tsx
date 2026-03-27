import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const productLinks = [
  { label: "redcore OS", href: "/redcore-os" },
  { label: "redcore Tuning", href: "/redcore-tuning" },
  { label: "Downloads", href: "/downloads" },
  { label: "Pricing", href: "/#pricing" },
];

const resourceLinks = [
  { label: "Windows Debloat", href: "/windows-debloat" },
  { label: "Windows 11 Debloat", href: "/windows-11-debloat" },
  { label: "Custom Windows", href: "/custom-windows" },
  { label: "Why redcore", href: "/why-redcore" },
];

const companyLinks = [
  { label: "GitHub", href: "https://github.com/redpersongpt", external: true },
  { label: "Donate", href: "/donate" },
];

export function FooterSection() {
  return (
    <footer className="border-t border-border" role="contentinfo">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 text-[0.72rem] leading-[1.7] text-ink-muted max-w-[200px]">
              Machine-aware Windows optimization and transformation.
            </p>
          </div>

          {/* Products */}
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-tertiary mb-4">
              Products
            </p>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[0.78rem] text-ink-muted transition-colors hover:text-ink-tertiary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-tertiary mb-4">
              Resources
            </p>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[0.78rem] text-ink-muted transition-colors hover:text-ink-tertiary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-tertiary mb-4">
              Company
            </p>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.78rem] text-ink-muted transition-colors hover:text-ink-tertiary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[0.78rem] text-ink-muted transition-colors hover:text-ink-tertiary"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[0.68rem] text-ink-muted">2026 redcore</p>
          <p className="text-[0.65rem] text-ink-muted">
            Windows 10 & 11 · No subscription · 100% reversible
          </p>
        </div>
      </div>
    </footer>
  );
}
