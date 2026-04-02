import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

export const metadata: Metadata = {
  title: "Privacy Policy | Ouden",
  description: "How Ouden handles account data, email delivery, analytics, and download telemetry.",
  alternates: {
    canonical: "https://Oudenos.net/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen px-6 pb-20 pt-28">
        <article className="mx-auto max-w-3xl rounded-lg border border-[var(--border)] bg-surface/70 p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Privacy</p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Privacy Policy</h1>
          <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--text-secondary)]">
            <p>
              Ouden collects only the data needed to deliver downloads, account access, licensing,
              password reset, and product updates. We do not sell personal data.
            </p>
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">What We Store</h2>
              <p className="mt-2">
                Account email address, optional profile name, hashed passwords, subscription status,
                machine activation metadata, and support-related audit logs.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Why We Store It</h2>
              <p className="mt-2">
                To authenticate users, send password reset or verification emails, validate licenses,
                prevent abuse, and keep download and billing flows working.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Emails</h2>
              <p className="mt-2">
                Transactional emails such as password reset and verification are sent from
                <span className="mx-1 font-medium text-[var(--text-primary)]">noreply@Oudenos.net</span>.
                Replies and support go through
                <span className="mx-1 font-medium text-[var(--text-primary)]">support@Oudenos.net</span>.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Contact</h2>
              <p className="mt-2">
                Privacy questions can be sent to
                <a className="ml-1 text-[var(--accent)] hover:text-[var(--accent)]-bright" href="mailto:info@Oudenos.net">
                  info@Oudenos.net
                </a>.
              </p>
            </section>
          </div>
        </article>
      </main>
      <FooterSection />
    </>
  );
}
