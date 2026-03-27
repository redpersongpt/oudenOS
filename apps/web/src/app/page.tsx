import { Navigation } from "@/components/brand/Navigation";
import { HeroSection } from "@/components/sections/HeroSection";
import { EcosystemSection } from "@/components/sections/EcosystemSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { TrustSection } from "@/components/sections/TrustSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { FinalCTASection } from "@/components/sections/FinalCTASection";
import { FooterSection } from "@/components/sections/FooterSection";
import { HashScroller } from "@/components/HashScroller";

export default function Home() {
  return (
    <>
      <Navigation />
      <HashScroller />
      <main>
        <HeroSection />
        <EcosystemSection />
        <HowItWorksSection />
        <TrustSection />
        <PricingSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}
