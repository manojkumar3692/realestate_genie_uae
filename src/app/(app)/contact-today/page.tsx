import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { getTodaysReactivationOpportunities } from "@/db/repoMatching";
import EmptyState from "@/components/ui/EmptyState";

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
            <Link key={o.matchId} href={`/projects/${o.projectId}/matches`} className="card-surface-interactive p-4 flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-cream flex items-center justify-center text-sm font-semibold text-brand-primary shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {o.customerName} <span className="text-brand-muted font-normal">→ {o.projectName}</span>
                </p>
                {o.reason && <p className="text-xs text-brand-muted mt-0.5 truncate">{o.reason}</p>}
              </div>
              <span className="text-sm font-semibold text-brand-primary shrink-0">{o.score}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
