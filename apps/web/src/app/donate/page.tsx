import { Navigation } from "@/components/brand/Navigation";
import { DonateSection } from "@/components/sections/DonateSection";
import { FooterSection } from "@/components/sections/FooterSection";

export const metadata = {
  title: "Support redcore · OS — Donate",
  description: "redcore · OS is free. Support development with a donation.",
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
