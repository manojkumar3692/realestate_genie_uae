import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/requireSession";
import { getProjectDetail } from "@/db/repo";
import { getMatchResults, getMatchCounts, getProjectMatchSourceBreakdown } from "@/db/repoMatching";
import { formatMoney } from "@/lib/normalize/budget";
import MatchResultsTable from "@/components/MatchResultsTable";
import EmptyState from "@/components/ui/EmptyState";
import { SearchX } from "lucide-react";

const TABS = [
  { key: "", label: "All" },
  { key: "hot", label: "🔥 Hot" },
  { key: "warm", label: "🟡 Warm" },
  { key: "possible", label: "🔵 Possible" },
];

export default async function ProjectMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bucket?: string; q?: string }>;
}) {
  const { id } = await params;
  const { bucket, q } = await searchParams;
  const session = await requireSession();
  const detail = await getProjectDetail(id, session.orgId);
  if (!detail) notFound();

  const [matches, counts, sourceBreakdown] = await Promise.all([
    getMatchResults(id, session.orgId, { bucket: bucket || undefined, search: q }),
    getMatchCounts(id),
    getProjectMatchSourceBreakdown(id, bucket || undefined),
  ]);

  const totalAnalyzed = counts.hot + counts.warm + counts.possible;
  const potentialValue = matches
    .filter((m) => m.bucket === "hot" || m.bucket === "warm")
    .reduce((sum, m) => sum + (m.budgetMax ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-6">
      <div>
        <p className="label-text mb-1">
          <Link href={`/projects/${id}`} className="hover:underline">
            {detail.project.name}
          </Link>{" "}
          · Match Results
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold">
          {totalAnalyzed.toLocaleString()} potential match{totalAnalyzed === 1 ? "" : "es"}
        </h1>
        {potentialValue > 0 && (
          <p className="text-sm text-brand-muted mt-1">
            Potential buyer value: <span className="font-semibold text-brand-primary-dark">{formatMoney(potentialValue, detail.project.currency)}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/projects/${id}/matches${tab.key ? `?bucket=${tab.key}` : ""}`}
              className={`btn-sm ${bucket === tab.key || (!bucket && !tab.key) ? "btn-primary" : "btn-secondary"}`}
            >
              {tab.label}
              {tab.key && ` (${counts[tab.key as "hot" | "warm" | "possible"]})`}
            </Link>
          ))}
        </div>
        <form>
          {bucket && <input type="hidden" name="bucket" value={bucket} />}
          <input name="q" defaultValue={q} placeholder="Search matched customers…" className="input-field w-56" />
        </form>
      </div>

      {sourceBreakdown.length > 0 && (
        <div className="card-surface p-4 flex flex-wrap gap-4">
          <p className="label-text mb-0 self-center">Where these matches came from:</p>
          {sourceBreakdown.map((s, i) => (
            <span key={i} className="text-sm">
              <span className="font-semibold">{s.count}</span> {s.name || "Unknown"}
            </span>
          ))}
        </div>
      )}

      {matches.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No strong buyer matches were found"
          description="Try adjusting the filter above, or review this project's buyer profile — the strongest matches are shown by default to keep this list high-signal."
        />
      ) : (
        <MatchResultsTable matches={matches} />
      )}
    </div>
  );
}
