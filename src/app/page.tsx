import { LandingHeader } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TechStackSection } from "@/components/landing/tech-stack-section";
import { CTASection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/footer";

export default function Home() {
  return (
    <main>
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TechStackSection />
      <CTASection />
      <LandingFooter />
    </main>
  );
}
