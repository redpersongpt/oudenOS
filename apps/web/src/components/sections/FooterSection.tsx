import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Heart } from "lucide-react";

const navLinks = [
  { label: "Tuning", href: "#tuning" },
  { label: "OS", href: "#os" },
  { label: "Profiles", href: "#intelligence" },
  { label: "GitHub", href: "https://github.com/redpersongpt", external: true },
];

export function FooterSection() {
  return (
    <footer className="border-t border-border-default" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between">
          {/* Logo */}
          <Logo size="sm" />

          {/* Nav + Donate */}
          <nav aria-label="Footer navigation">
            <ul className="flex items-center gap-6 md:gap-8">
              {navLinks.map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-ink-tertiary transition-colors duration-200 hover:text-ink-secondary"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[13px] text-ink-tertiary transition-colors duration-200 hover:text-ink-secondary"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <a
                  href="/donate"
                  className="inline-flex items-center gap-1.5 text-[13px] text-brand-500 transition-colors duration-200 hover:text-brand-400"
                >
                  <Heart size={13} />
                  Donate
                </a>
              </li>
            </ul>
          </nav>

          {/* Copyright */}
          <p className="text-[12px] text-ink-tertiary">2026 redcore</p>
        </div>
      </div>
    </footer>
  );
}
