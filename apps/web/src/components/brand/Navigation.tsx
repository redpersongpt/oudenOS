"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, ArrowUpRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/brand/Logo";
import { fadeIn, spring, duration, easing } from "@/lib/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  sectionId: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  { label: "Products", sectionId: "products" },
  { label: "How it works", sectionId: "how" },
  { label: "Pricing", sectionId: "pricing" },
];

const SECTION_IDS = NAV_LINKS.map((l) => l.sectionId);
const SCROLL_THRESHOLD = 40;
const NAV_OFFSET = 80;

// ─── Scroll Hook ─────────────────────────────────────────────────────────────

function useScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

// ─── Active Section Hook (IntersectionObserver) ──────────────────────────────

function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState("");
  const idsRef = useRef(sectionIds);

  useEffect(() => {
    idsRef.current = sectionIds;
  }, [sectionIds]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const id of idsRef.current) {
      const el = document.getElementById(id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      for (const obs of observers) obs.disconnect();
    };
  }, []);

  return activeId;
}

// ─── Smooth Scroll ───────────────────────────────────────────────────────────

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  } else {
    // Not on homepage — navigate there with hash
    window.location.href = `/#${sectionId}`;
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Mobile Overlay ──────────────────────────────────────────────────────────

function MobileOverlay({
  isOpen,
  onClose,
  activeId,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeId: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.normal, ease: easing.enter }}
          className="fixed inset-0 top-0 z-40 flex flex-col items-center justify-center bg-surface-base lg:hidden"
        >
          <nav
            className="flex flex-col items-center gap-8"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map((link, i) => (
              <motion.button
                key={link.sectionId}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{
                  duration: duration.normal,
                  ease: easing.enter,
                  delay: i * 0.05,
                }}
                onClick={() => {
                  scrollToSection(link.sectionId);
                  onClose();
                }}
                className={[
                  "text-2xl font-medium tracking-wide transition-colors duration-200",
                  activeId === link.sectionId
                    ? "text-ink-primary"
                    : "text-ink-tertiary hover:text-ink-primary",
                ].join(" ")}
              >
                {link.label}
              </motion.button>
            ))}

            {/* Mobile actions */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{
                duration: duration.normal,
                ease: easing.enter,
                delay: NAV_LINKS.length * 0.05,
              }}
              className="mt-4 flex flex-col items-center gap-6"
            >
              <a
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("pricing");
                  onClose();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
              >
                Get redcore
              </a>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isScrolled = useScrolled(SCROLL_THRESHOLD);
  const activeId = useActiveSection(SECTION_IDS);
  const { data: session } = useSession();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="fixed top-0 right-0 left-0 z-50"
      >
        <div
          className={[
            "transition-all duration-500",
            isScrolled
              ? "glass border-b border-border-default"
              : "border-b border-transparent bg-transparent",
          ].join(" ")}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:h-20 lg:px-8">
            {/* ── Logo ── */}
            <a
              href="/"
              className="cursor-pointer"
              aria-label="Go to homepage"
            >
              <Logo size="md" />
            </a>

            {/* ── Desktop Nav ── */}
            <nav
              className="hidden items-center gap-8 lg:flex"
              role="navigation"
              aria-label="Main navigation"
            >
              {NAV_LINKS.map((link) => (
                <button
                  key={link.sectionId}
                  onClick={() => scrollToSection(link.sectionId)}
                  className={[
                    "cursor-pointer text-[13px] font-medium tracking-wide transition-colors duration-200",
                    activeId === link.sectionId
                      ? "text-ink-primary"
                      : "text-ink-tertiary hover:text-ink-primary",
                  ].join(" ")}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* ── Right Side ── */}
            <div className="flex items-center gap-4">
              {session?.user ? (
                /* Logged in — Profile button */
                <a
                  href="/profile"
                  className="hidden items-center gap-2 cursor-pointer rounded-md bg-white/[0.08] px-4 py-1.5 text-[13px] font-medium text-ink-primary border border-white/[0.1] transition-all duration-200 hover:bg-white/[0.12] hover:border-white/[0.16] lg:inline-flex"
                >
                  <User size={14} />
                  Profile
                </a>
              ) : (
                /* Logged out — Login + Register */
                <>
                  <a
                    href="/login"
                    className="hidden text-[13px] font-medium tracking-wide text-ink-tertiary transition-colors duration-200 hover:text-ink-primary lg:inline-flex"
                  >
                    Login
                  </a>
                  <a
                    href="/register"
                    className="hidden cursor-pointer rounded-md bg-white/[0.08] px-4 py-1.5 text-[13px] font-medium text-ink-primary border border-white/[0.1] transition-all duration-200 hover:bg-white/[0.12] hover:border-white/[0.16] lg:inline-flex"
                  >
                    Register
                  </a>
                </>
              )}

              {/* ── Mobile Hamburger ── */}
              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className="relative z-50 inline-flex items-center justify-center rounded-lg p-2 text-ink-secondary transition-colors duration-200 hover:text-ink-primary lg:hidden"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={mobileOpen ? "close" : "menu"}
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                  >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Full-Screen Mobile Overlay ── */}
      <MobileOverlay
        isOpen={mobileOpen}
        onClose={closeMobile}
        activeId={activeId}
      />
    </>
  );
}
