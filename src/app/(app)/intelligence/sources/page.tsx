import { requireSession } from "@/lib/auth/requireSession";
import { getSourceBreakdown, getCampaignIntelligence } from "@/db/repoMatching";
import EmptyState from "@/components/ui/EmptyState";
import { Megaphone } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  portal: "Property Portal",
  referral: "Referral",
  website: "Website",
  walk_in: "Walk-in",
  other: "Other",
  unknown: "Unknown",
};

export default async function SourceIntelligencePage() {
  const session = await requireSession();
  const [sources, campaigns] = await Promise.all([getSourceBreakdown(session.orgId), getCampaignIntelligence(session.orgId)]);

  const totalCustomers = sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-8">
      <div>
        <p className="label-text mb-1">Marketing Intelligence</p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold mb-2">Where your buyers actually came from</h1>
        <p className="text-brand-muted text-sm">
          Leads you considered "wasted" may still have future value — this tracks which sources and campaigns keep producing reusable buyers over time.
        </p>
      </div>

      {sources.length === 0 ? (
        <EmptyState icon={Megaphone} title="No source data yet" description="Import leads with a source/campaign column to see this breakdown." />
      ) : (
        <div>
          <p className="label-text mb-3">Customers by source</p>
          <div className="card-surface p-5 flex flex-col gap-3">
            {sources.map((s, i) => {
              const pct = totalCustomers > 0 ? Math.round((s.count / totalCustomers) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm w-40 shrink-0">{s.name || (s.platform ? PLATFORM_LABELS[s.platform] : null) || "Unknown"}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-brand-cream overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-primary-light to-brand-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold w-20 text-right">{s.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {campaigns.length > 0 && (
        <div>
          <p className="label-text mb-3">Campaign performance</p>
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-cream text-brand-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Campaign</th>
                  <th className="text-left px-4 py-3 font-semibold">Original Leads</th>
                  <th className="text-left px-4 py-3 font-semibold">Currently Reusable</th>
                  <th className="text-left px-4 py-3 font-semibold">Hot Matches Across Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {campaigns.map((c) => (
                  <tr key={c.campaignId}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-brand-muted">{c.originalLeads.toLocaleString()}</td>
                    <td className="px-4 py-3 text-brand-muted">{c.currentReusableBuyers.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {c.hotMatchesAcrossProjects > 0 ? (
                        <span className="badge badge-hot">{c.hotMatchesAcrossProjects}</span>
                      ) : (
                        <span className="text-brand-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
