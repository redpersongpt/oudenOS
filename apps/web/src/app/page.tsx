import { Navigation } from "@/components/brand/Navigation";
import { HeroSection } from "@/components/sections/HeroSection";
import { EcosystemSection } from "@/components/sections/EcosystemSection";
import { IntelligenceSection } from "@/components/sections/IntelligenceSection";
import { TuningProductSection } from "@/components/sections/TuningProductSection";
import { OSProductSection } from "@/components/sections/OSProductSection";
import { FinalCTASection } from "@/components/sections/FinalCTASection";
import { FooterSection } from "@/components/sections/FooterSection";

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        <EcosystemSection />
        <IntelligenceSection />
        <TuningProductSection />
        <OSProductSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}
