import { PhoneCall } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { getTodaysReactivationOpportunities } from "@/db/repoMatching";
import EmptyState from "@/components/ui/EmptyState";
import OpportunityRow from "./OpportunityRow";

export default async function ContactTodayPage() {
  const session = await requireSession();
  const opportunities = await getTodaysReactivationOpportunities(session.orgId, 25);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <p className="label-text mb-1">Daily Recommendations</p>
      <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Today's best reactivation opportunities</h1>
      <p className="text-brand-muted text-sm mb-8">The strongest not-yet-contacted matches across every active project, ranked by score.</p>

      {opportunities.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No recommendations yet"
          description="Run 'Find Potential Buyers' on a project to start seeing daily reactivation opportunities here."
          actionHref="/projects"
          actionLabel="Go to Projects"
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {opportunities.map((o, i) => (
            <OpportunityRow
              key={o.matchId}
              index={i}
              matchId={o.matchId}
              projectId={o.projectId}
              customerName={o.customerName}
              projectName={o.projectName}
              reason={o.reason}
              score={o.score}
            />
          ))}
        </div>
      )}
    </div>
  );
}
