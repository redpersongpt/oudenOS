import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-6 pt-20 pb-20">
        <div className="max-w-[480px] w-full text-center">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-accent mb-6">
            404
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-primary mb-4 leading-tight">
            Page not found
          </h1>
          <p className="text-ink-secondary text-base leading-relaxed mb-10">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-accent px-6 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-accent-dim"
            >
              Back to home
            </Link>
            <Link
              href="/downloads"
              className="inline-flex items-center rounded-lg border border-border px-6 py-2.5 text-[13px] font-medium text-ink-secondary transition-all hover:text-ink-primary hover:border-border-strong"
            >
              Downloads
            </Link>
          </div>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
