"use client";

import Link from "next/link";
import OutcomeButtons from "@/components/ui/OutcomeButtons";
import { logTodayOutcomeAction } from "./actions";

/**
 * One row on the daily worklist. Deliberately NOT a single big <Link> wrapping everything (the
 * way it used to be) — an agent needs to tap an outcome button without navigating away, so only
 * the name/project text is a link; the outcome row sits below it as its own control.
 */
export default function OpportunityRow({
  index,
  matchId,
  projectId,
  customerName,
  projectName,
  reason,
  score,
}: {
  index: number;
  matchId: string;
  projectId: string;
  customerName: string;
  projectName: string;
  reason: string;
  score: number;
}) {
  return (
    <div className="card-surface p-4 flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="w-8 h-8 rounded-full bg-brand-cream flex items-center justify-center text-sm font-semibold text-brand-primary shrink-0">
          {index + 1}
        </span>
        <Link href={`/projects/${projectId}/matches`} className="flex-1 min-w-0 group">
          <p className="font-medium text-sm group-hover:text-brand-primary">
            {customerName} <span className="text-brand-muted font-normal">→ {projectName}</span>
          </p>
          {reason && <p className="text-xs text-brand-muted mt-0.5 truncate">{reason}</p>}
        </Link>
        <span className="text-sm font-semibold text-brand-primary shrink-0">{score}</span>
      </div>
      <OutcomeButtons matchId={matchId} onSubmit={logTodayOutcomeAction} className="pl-12" />
    </div>
  );
}
