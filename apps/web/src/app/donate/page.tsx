import { Navigation } from "@/components/brand/Navigation";
import { DonateSection } from "@/components/sections/DonateSection";
import { FooterSection } from "@/components/sections/FooterSection";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support OudenOS — Donate",
  description: "OudenOS is free. Support development with a donation.",
  alternates: {
    canonical: "https://ouden.cc/donate",
  },
  openGraph: {
    title: "Support OudenOS — Donate",
    description: "OudenOS is free. Support development with a donation.",
    url: "https://ouden.cc/donate",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 360,
        alt: "Ouden logo",
      },
    ],
  },
};

export default function DonatePage() {
  return (
    <>
      <Navigation />
      <main className="pt-20">
        <DonateSection />
      </main>
      <FooterSection />
    </>
  );
}
