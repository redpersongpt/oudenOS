import { Navigation } from "@/components/brand/Navigation";
import { HeroSection } from "@/components/sections/HeroSection";
import { EcosystemSection } from "@/components/sections/EcosystemSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { LearnMoreSection } from "@/components/sections/LearnMoreSection";
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
        <PricingSection />
        <LearnMoreSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}
