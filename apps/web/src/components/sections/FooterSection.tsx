import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const navLinks = [
  { label: "Products", href: "#products" },
  { label: "Pricing", href: "#pricing" },
  { label: "GitHub", href: "https://github.com/redpersongpt", external: true },
];

export function FooterSection() {
  return (
    <footer className="border-t border-border" role="contentinfo">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <Logo size="sm" />

          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6">
              {navLinks.map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-ink-muted transition-colors duration-200 hover:text-ink-tertiary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[12px] text-ink-muted transition-colors duration-200 hover:text-ink-tertiary"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-[11px] text-ink-muted">2026 redcore</p>
        </div>
      </div>
    </footer>
  );
}
