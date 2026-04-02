import { Navigation } from "@/components/brand/Navigation";
import { HeroSection } from "@/components/sections/HeroSection";
import { EcosystemSection } from "@/components/sections/EcosystemSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { LearnMoreSection } from "@/components/sections/LearnMoreSection";
import { FinalCTASection } from "@/components/sections/FinalCTASection";
import { FooterSection } from "@/components/sections/FooterSection";
import { HashScroller } from "@/components/HashScroller";
import { LandingChrome, SectionSeparator } from "@/components/sections/LandingChrome";

export default function Home() {
  return (
    <>
      <Navigation />
      <HashScroller />
      <main className="relative" style={{ zIndex: 2 }}>
        <LandingChrome />
        <HeroSection />
        <SectionSeparator label="How it works" note="Four steps, full control" />
        <HowItWorksSection />
        <SectionSeparator label="The ecosystem" note="Two products, one system" />
        <EcosystemSection />
        <SectionSeparator label="Pricing" note="Free OS, one-time Tuning" />
        <PricingSection />
        <SectionSeparator label="Resources" note="Guides and downloads" />
        <LearnMoreSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}
