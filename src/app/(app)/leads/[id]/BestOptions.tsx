"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import BucketBadge from "@/components/ui/BucketBadge";
import ScoreBreakdownBars from "@/components/ui/ScoreBreakdownBars";
import OutcomeButtons from "@/components/ui/OutcomeButtons";
import { logBuyerProjectOutcomeAction } from "./actions";
import type { BestProjectMatch } from "@/db/repoMatching";

/** "Buyer -> Find Projects" (product spec §10) — the reverse of the project match table: instead
 *  of one project's best buyers, this is one buyer's best current projects, ranked. Scores are
 *  computed fresh on every page load (see getBestProjectMatchesForCustomer) rather than read from
 *  a cache, so this always reflects this buyer's latest live signals/preferences immediately. */
export default function BestOptions({ matches }: { matches: BestProjectMatch[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, string>>(Object.fromEntries(matches.map((m) => [m.matchId, m.outcomeStatus])));

  function toggle(matchId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(matchId) ? next.delete(matchId) : next.add(matchId);
      return next;
    });
  }

  if (matches.length === 0) {
    return (
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={15} className="text-brand-accent-dark" />
          <p className="label-text mb-0">Best Current Options</p>
        </div>
        <p className="text-sm text-brand-muted">No active project is a strong enough fit right now — check back after adding more projects or as this buyer's profile fills in.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} className="text-brand-accent-dark" />
        <p className="label-text mb-0">Best Current Options</p>
      </div>
      <div className="flex flex-col gap-3">
        {matches.map((m, i) => (
          <div key={m.matchId} className="card-surface overflow-hidden">
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-brand-muted w-4 shrink-0">{i + 1}.</span>
                    <Link href={`/projects/${m.projectId}`} className="font-medium hover:text-brand-primary">
                      {m.projectName}
                    </Link>
                    <BucketBadge bucket={m.bucket} />
                    <span className="text-xs font-semibold text-brand-muted">{m.totalScore}%</span>
                  </div>
                  <p className="text-xs text-brand-muted mt-0.5">{m.projectLocation}</p>
                  {m.positives[0] && <p className="text-sm mt-1.5">{m.positives[0]}</p>}
                </div>

                <button onClick={() => toggle(m.matchId)} className="btn-secondary btn-sm flex items-center gap-1 shrink-0 self-start md:self-auto">
                  Why Match {expanded.has(m.matchId) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              <OutcomeButtons
                matchId={m.matchId}
                initialOutcomeStatus={outcomes[m.matchId]}
                onSubmit={logBuyerProjectOutcomeAction}
                onLogged={(result) => setOutcomes((prev) => ({ ...prev, [m.matchId]: result.outcomeStatus }))}
              />
            </div>

            {expanded.has(m.matchId) && (
              <div className="border-t border-brand-border p-4 bg-brand-cream/30 flex flex-col gap-4">
                <ScoreBreakdownBars breakdown={m.breakdown} />
                {m.positives.filter(Boolean).length > 0 && (
                  <div>
                    <p className="label-text mb-1.5">Why this fits</p>
                    <ul className="text-sm flex flex-col gap-1">
                      {m.positives.filter(Boolean).map((p, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-brand-positive">✓</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {m.concerns.filter(Boolean).length > 0 && (
                  <div>
                    <p className="label-text mb-1.5">Possible concerns</p>
                    <ul className="text-sm flex flex-col gap-1 text-brand-muted">
                      {m.concerns.filter(Boolean).map((c, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-warm">!</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
