import { Navigation } from "@/components/brand/Navigation";
import { DonateSection } from "@/components/sections/DonateSection";
import { FooterSection } from "@/components/sections/FooterSection";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support redcore · OS — Donate",
  description: "redcore · OS is free. Support development with a donation.",
  alternates: {
    canonical: "https://redcoreos.net/donate",
  },
  openGraph: {
    title: "Support redcore · OS — Donate",
    description: "redcore · OS is free. Support development with a donation.",
    url: "https://redcoreos.net/donate",
    type: "website",
    images: [
      {
        url: "/redcore-logo.png",
        width: 512,
        height: 512,
        alt: "redcore logo",
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
