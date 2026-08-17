import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles, MapPin, Building2, TrendingUp } from "lucide-react";
import { requireSession } from "@/lib/auth/requireSession";
import { getProjectDetail } from "@/db/repo";
import { getMatchCounts } from "@/db/repoMatching";
import { formatMoney } from "@/lib/normalize/budget";
import { runMatchingAction } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const detail = await getProjectDetail(id, session.orgId);
  if (!detail) notFound();
  const { project, unitTypes, features, profile } = detail;
  const counts = await getMatchCounts(id);
  const hasMatches = counts.hot + counts.warm + counts.possible > 0;
  const boundRunMatching = runMatchingAction.bind(null, id);

  const strengths = features.filter((f) => f.category === "strength" || f.category === "selling_point").map((f) => f.label);
  const amenities = features.filter((f) => f.category === "amenity").map((f) => f.label);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="label-text mb-1">{project.status === "active" ? "Active Project" : project.status}</p>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">{project.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-brand-muted">
            <span className="flex items-center gap-1.5">
              <Building2 size={13} /> {project.developer || "Developer TBC"}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={13} /> {project.location}
            </span>
            {project.expectedRentalYieldPercent && (
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} /> {project.expectedRentalYieldPercent}% projected yield
              </span>
            )}
          </div>
        </div>
        <form action={boundRunMatching}>
          <SubmitButton label="Find Potential Buyers" pendingLabel="Analyzing your database…" className="btn-accent flex items-center gap-2 px-6" />
        </form>
      </div>

      {hasMatches && (
        <Link href={`/projects/${id}/matches`} className="card-surface-interactive p-4 flex items-center justify-between">
          <div className="flex gap-2 text-sm font-semibold">
            <span className="badge badge-hot">{counts.hot} Hot</span>
            <span className="badge badge-warm">{counts.warm} Warm</span>
            <span className="badge badge-possible">{counts.possible} Possible</span>
          </div>
          <span className="text-sm text-brand-primary font-medium">View match results →</span>
        </Link>
      )}

      {profile?.aiSummary && (
        <div className="card-surface p-5 bg-gradient-to-br from-white to-brand-cream/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-brand-accent-dark" />
            <p className="label-text mb-0">Project Intelligence</p>
          </div>
          <p className="text-sm leading-relaxed mb-3">{profile.aiSummary}</p>
          <p className="text-xs font-semibold text-brand-primary uppercase tracking-wide">{profile.buyerFitSummary}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {strengths.length > 0 && (
          <div className="card-surface p-5">
            <p className="label-text mb-3">Strengths</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-accent-dark">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {profile?.potentialSegments && profile.potentialSegments.length > 0 && (
          <div className="card-surface p-5">
            <p className="label-text mb-3">Potential Buyer Segments</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {profile.potentialSegments.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-accent-dark">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {unitTypes.length > 0 && (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream text-brand-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Size (sqft)</th>
                <th className="text-left px-4 py-3 font-semibold">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {unitTypes.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.typeLabel}</td>
                  <td className="px-4 py-3 text-brand-muted">
                    {u.sizeSqftMin || u.sizeSqftMax ? `${u.sizeSqftMin}–${u.sizeSqftMax}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-muted">
                    {u.priceFrom ? `${formatMoney(u.priceFrom, project.currency)}–${formatMoney(u.priceTo, project.currency)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {amenities.length > 0 && (
        <div className="card-surface p-5">
          <p className="label-text mb-3">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {amenities.map((a, i) => (
              <span key={i} className="text-xs bg-brand-cream px-2.5 py-1 rounded-full text-brand-muted">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
