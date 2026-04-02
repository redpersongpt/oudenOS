import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

export const metadata: Metadata = {
  title: "Terms of Service | Ouden",
  description: "Terms covering downloads, account usage, licensing, and support for Ouden products.",
  alternates: {
    canonical: "https://Oudenos.net/terms",
  },
};

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen px-6 pb-20 pt-28">
        <article className="mx-auto max-w-3xl rounded-lg border border-[var(--border)] bg-surface/70 p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Terms</p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Terms of Service</h1>
          <div className="mt-8 space-y-6 text-sm leading-7 text-[var(--text-secondary)]">
            <p>
              Ouden software is provided as-is for lawful personal or business use. You are responsible
              for reviewing changes before applying system modifications and for maintaining backups.
            </p>
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Accounts</h2>
              <p className="mt-2">
                Keep your credentials secure and do not share access to paid subscriptions or machine
                activations beyond the limits of your plan.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Licensing</h2>
              <p className="mt-2">
                Paid features, activation limits, and subscription status are enforced by the service.
                Abuse, fraud, or chargeback misuse may lead to account suspension.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Support</h2>
              <p className="mt-2">
                Support is offered on a best-effort basis through
                <a className="ml-1 text-[var(--accent)] hover:text-[var(--accent)]-bright" href="mailto:support@Oudenos.net">
                  support@Oudenos.net
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
