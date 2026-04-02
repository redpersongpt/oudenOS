import type { Metadata } from "next";
import { Navigation } from "@/components/brand/Navigation";
import { FooterSection } from "@/components/sections/FooterSection";

export const metadata: Metadata = {
  title: "Terms of Service | redcore",
  description: "Terms covering downloads, account usage, licensing, and support for redcore products.",
  alternates: {
    canonical: "https://redcoreos.net/terms",
  },
};

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen px-6 pb-20 pt-28">
        <article className="mx-auto max-w-3xl rounded-lg border border-border bg-surface/70 p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Terms</p>
          <h1 className="mt-3 text-3xl font-semibold text-ink-primary">Terms of Service</h1>
          <div className="mt-8 space-y-6 text-sm leading-7 text-ink-secondary">
            <p>
              redcore software is provided as-is for lawful personal or business use. You are responsible
              for reviewing changes before applying system modifications and for maintaining backups.
            </p>
            <section>
              <h2 className="text-base font-semibold text-ink-primary">Accounts</h2>
              <p className="mt-2">
                Keep your credentials secure and do not share access to paid subscriptions or machine
                activations beyond the limits of your plan.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-ink-primary">Licensing</h2>
              <p className="mt-2">
                Paid features, activation limits, and subscription status are enforced by the service.
                Abuse, fraud, or chargeback misuse may lead to account suspension.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold text-ink-primary">Support</h2>
              <p className="mt-2">
                Support is offered on a best-effort basis through
                <a className="ml-1 text-accent hover:text-accent-bright" href="mailto:support@redcoreos.net">
                  support@redcoreos.net
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
