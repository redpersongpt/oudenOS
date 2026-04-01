import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const productLinks = [
  { label: "redcore OS",     href: "/redcore-os" },
  { label: "redcore Tuning", href: "/redcore-tuning" },
  { label: "Downloads",      href: "/downloads" },
  { label: "Pricing",        href: "/#pricing" },
];

const resourceLinks = [
  { label: "Windows Debloat",    href: "/windows-debloat" },
  { label: "Windows 11 Debloat", href: "/windows-11-debloat" },
  { label: "Custom Windows",     href: "/custom-windows" },
  { label: "Why redcore",        href: "/why-redcore" },
  { label: "Work PC Debloat",    href: "/work-pc-debloat" },
];

const companyLinks = [
  { label: "GitHub (Open Source)",  href: "https://github.com/redpersongpt/redcoreOS", external: true },
  { label: "Donate",  href: "/donate" },
  { label: "Account", href: "/profile" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

const contactLinks = [
  { label: "Info", href: "mailto:info@redcoreos.net", value: "info@redcoreos.net" },
  { label: "Support", href: "mailto:support@redcoreos.net", value: "support@redcoreos.net" },
  { label: "System Mail", href: "mailto:noreply@redcoreos.net", value: "noreply@redcoreos.net" },
];

export function FooterSection() {
  return (
    <footer className="border-t border-border/60" role="contentinfo">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-16 2xl:px-24 py-16 lg:py-20">

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-14">

          {/* ── Brand ── */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-4 text-[0.75rem] leading-[1.75] text-ink-muted max-w-[210px]">
              Hardware-based Windows optimization and optimization. Built for
              people who care about their hardware.
            </p>
            <div className="mt-6 rounded-2xl border border-border/80 bg-surface-elevated/50 p-4">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
                Contact
              </p>
              <ul className="mt-3 space-y-2.5">
                {contactLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="group flex items-center justify-between gap-4 text-[0.72rem] text-ink-muted transition-colors duration-150 hover:text-ink-primary"
                    >
                      <span className="font-mono uppercase tracking-[0.14em] text-ink-tertiary">
                        {link.label}
                      </span>
                      <span className="truncate text-right text-[0.72rem] text-ink-secondary transition-colors group-hover:text-ink-primary">
                        {link.value}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {/* Badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              {["Windows 10", "Windows 11", "x64"].map((b) => (
                <span key={b}
                  className="rounded-full border border-border px-2.5 py-1 text-[0.6rem] font-mono font-medium tracking-wider text-ink-muted">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* ── Products ── */}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-tertiary mb-5">
              Products
            </p>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[0.78rem] text-ink-muted transition-colors duration-150 hover:text-ink-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Resources ── */}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-tertiary mb-5">
              Resources
            </p>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[0.78rem] text-ink-muted transition-colors duration-150 hover:text-ink-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Company ── */}
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-ink-tertiary mb-5">
              Company
            </p>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.78rem] text-ink-muted transition-colors duration-150 hover:text-ink-secondary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[0.78rem] text-ink-muted transition-colors duration-150 hover:text-ink-secondary"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[0.68rem] text-ink-muted">
            © 2026 redcore
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[0.65rem] font-mono text-ink-muted tracking-wider">
              No subscription · 100% reversible
            </span>
            <a
              href="https://github.com/redpersongpt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted hover:text-ink-tertiary transition-colors duration-150"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
