import { getSession } from "@/lib/auth/session";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorks from "@/components/landing/HowItWorks";
import MatchDemoCard from "@/components/landing/MatchDemoCard";
import TeamPrivacySection from "@/components/landing/TeamPrivacySection";
import TeamResultsVisual from "@/components/landing/TeamResultsVisual";
import PrivacyMessage from "@/components/landing/PrivacyMessage";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

// Public marketing page — intentionally does NOT call requireSession(). Logged-in visitors get
// a "Go to Dashboard" link in the nav instead of Sign In/Get Started (see LandingNav).
export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="landing-page ai-bg flex flex-col">
      <LandingNav isLoggedIn={Boolean(session)} />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <MatchDemoCard />
      <TeamPrivacySection />
      <TeamResultsVisual />
      <PrivacyMessage />
      <PricingSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
