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
      <main className="relative isolate">
        <LandingChrome />
        <HeroSection />
        <SectionSeparator
          label="System layers"
          note="From Windows foundation to tuning stack"
        />
        <EcosystemSection />
        <SectionSeparator
          label="Execution flow"
          note="Clear steps, no dead ends"
        />
        <HowItWorksSection />
        <SectionSeparator
          label="Pricing"
          note="Free OS, one-time Tuning"
        />
        <PricingSection />
        <SectionSeparator
          label="More context"
          note="What each layer actually changes"
        />
        <LearnMoreSection />
        <SectionSeparator
          label="Final push"
          note="Pick the path and go"
        />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}
