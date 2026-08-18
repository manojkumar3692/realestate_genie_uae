import { getSession } from "@/lib/auth/session";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import DeadLeadGraveyard from "@/components/landing/DeadLeadGraveyard";
import OldLeadNewOpportunity from "@/components/landing/OldLeadNewOpportunity";
import HowItWorks from "@/components/landing/HowItWorks";
import IntelligenceVsFilters from "@/components/landing/IntelligenceVsFilters";
import MatchCard from "@/components/landing/MatchCard";
import DatabaseAlive from "@/components/landing/DatabaseAlive";
import ForIndividualAgents from "@/components/landing/ForIndividualAgents";
import ForTeams from "@/components/landing/ForTeams";
import BusinessValue from "@/components/landing/BusinessValue";
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
      <DeadLeadGraveyard />
      <OldLeadNewOpportunity />
      <HowItWorks />
      <IntelligenceVsFilters />
      <MatchCard />
      <DatabaseAlive />
      <ForIndividualAgents />
      <ForTeams />
      <BusinessValue />
      <PricingSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
