import { requireSession } from "@/lib/auth/requireSession";
import { getOutcomeAnalytics } from "@/db/repoMatching";
import StatTile from "@/components/ui/StatTile";
import { PhoneCall, MessageCircle, Eye, CheckCircle2, TrendingUp } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await requireSession();
  const stats = await getOutcomeAnalytics(session.orgId);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-6">
      <div>
        <p className="label-text mb-1">Outcome Tracking</p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Is this actually working?</h1>
        <p className="text-brand-muted text-sm">
          Of the customers we recommended, how many turned into real conversations, viewings, bookings, or purchases. This is the number that proves ROI.
        </p>
      </div>

      <div className="card-surface p-8 flex flex-col items-center text-center bg-gradient-to-br from-white to-brand-cream/50">
        <p className="label-text">Reactivation Rate</p>
        <p className="text-5xl font-display font-semibold text-brand-primary-dark my-2">{stats.reactivationRatePercent}%</p>
        <p className="text-sm text-brand-muted">of contacted hot matches became interested, viewed, booked, or purchased</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile label="Hot Matches" value={stats.totalHotMatches.toLocaleString()} icon={TrendingUp} />
        <StatTile label="Hot Matches Contacted" value={stats.hotMatchesContacted.toLocaleString()} icon={PhoneCall} />
        <StatTile label="Interested" value={stats.interested.toLocaleString()} icon={MessageCircle} />
        <StatTile label="Viewings" value={stats.viewings.toLocaleString()} icon={Eye} />
        <StatTile label="Bookings" value={stats.bookings.toLocaleString()} icon={CheckCircle2} accent />
        <StatTile label="Purchased" value={stats.purchased.toLocaleString()} icon={CheckCircle2} accent />
      </div>

      <p className="text-xs text-brand-muted">
        Outcomes are self-reported by your team from each project's match results screen — this isn't a sales pipeline, it's feedback used purely to
        measure how good the recommendations actually are.
      </p>
    </div>
  );
}
