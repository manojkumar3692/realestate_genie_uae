"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, MessageCircle, Copy, Check } from "lucide-react";
import BucketBadge from "@/components/ui/BucketBadge";
import ScoreBreakdownBars from "@/components/ui/ScoreBreakdownBars";
import OutcomeButtons from "@/components/ui/OutcomeButtons";
import { formatMoney } from "@/lib/normalize/budget";
import { updateOutcomeAction, generateOutreachAction } from "@/app/(app)/projects/[id]/matches/actions";
import type { MatchResultRow } from "@/db/repoMatching";

export default function MatchResultsTable({ matches }: { matches: MatchResultRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, string>>(Object.fromEntries(matches.map((m) => [m.matchId, m.outcomeStatus])));

  function toggle(matchId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(matchId) ? next.delete(matchId) : next.add(matchId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => (
        <div key={m.matchId} className="card-surface overflow-hidden">
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/leads/${m.customerId}`} className="font-medium hover:text-brand-primary">
                    {m.customerName}
                  </Link>
                  <BucketBadge bucket={m.bucket} />
                  <span className="text-xs font-semibold text-brand-muted">{m.totalScore}/100</span>
                  {m.hasLimitedData && (
                    <span
                      className="badge badge-muted"
                      title="We have little to no stated or AI-inferred data on this lead yet — this score reflects neutral defaults, not a confirmed fit. Worth a discovery call to find out more."
                    >
                      Limited data
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-muted mt-0.5">
                  {formatMoney(m.budgetMin, m.budgetCurrency)}–{formatMoney(m.budgetMax, m.budgetCurrency)}
                  {m.budgetIsInferred && <span className="italic"> (AI-inferred from notes)</span>} · {m.preferredLocations.join(", ") || "Any area"} ·{" "}
                  {m.bedrooms.join(", ") || "Any unit"}
                </p>
                {m.positives[0] && <p className="text-sm mt-1.5">{m.positives[0]}</p>}
              </div>

              <button onClick={() => toggle(m.matchId)} className="btn-secondary btn-sm flex items-center gap-1 shrink-0 self-start md:self-auto">
                Why Match {expanded.has(m.matchId) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            <OutcomeButtons
              matchId={m.matchId}
              initialOutcomeStatus={outcomes[m.matchId]}
              onSubmit={updateOutcomeAction}
              onLogged={(result) => setOutcomes((prev) => ({ ...prev, [m.matchId]: result.outcomeStatus }))}
            />
          </div>

          {expanded.has(m.matchId) && <MatchDetail match={m} />}
        </div>
      ))}
    </div>
  );
}

function MatchDetail({ match }: { match: MatchResultRow }) {
  const [outreach, setOutreach] = useState<{ callOpening: string; whatsappMessage: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="border-t border-brand-border p-4 bg-brand-cream/30 flex flex-col gap-4">
      <ScoreBreakdownBars breakdown={match.scoreBreakdown} />

      {match.hasLimitedData && (
        <p className="text-xs text-brand-muted -mt-1">
          We don&apos;t have much stated or inferred data on {match.customerName.split(" ")[0]} yet — the score below reflects neutral defaults, not a
          confirmed fit. Treat this as a discovery-call candidate rather than a verified match.
        </p>
      )}

      {match.positives.filter(Boolean).length > 0 && (
        <div>
          <p className="label-text mb-1.5">
            {match.hasLimitedData ? `What we know about this project` : `Why ${match.customerName.split(" ")[0]} is a strong match`}
          </p>
          <ul className="text-sm flex flex-col gap-1">
            {match.positives.filter(Boolean).map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-brand-positive">✓</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.concerns.filter(Boolean).length > 0 && (
        <div>
          <p className="label-text mb-1.5">Possible concerns</p>
          <ul className="text-sm flex flex-col gap-1 text-brand-muted">
            {match.concerns.filter(Boolean).map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-warm">!</span> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.lostReason && (
        <p className="text-sm">
          <span className="text-brand-muted">Previous objection:</span> {match.lostReason}
        </p>
      )}

      {!outreach ? (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await generateOutreachAction(match.matchId);
              if (result) setOutreach(result);
            })
          }
          className="btn-primary btn-sm self-start flex items-center gap-1.5"
        >
          <MessageCircle size={13} /> {isPending ? "Generating…" : "Generate Reactivation Message"}
        </button>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          <OutreachCard title="Call Opening" text={outreach.callOpening} onCopy={() => copy(outreach.callOpening, "call")} copied={copied === "call"} />
          <OutreachCard title="WhatsApp Message" text={outreach.whatsappMessage} onCopy={() => copy(outreach.whatsappMessage, "wa")} copied={copied === "wa"} />
        </div>
      )}
    </div>
  );
}

function OutreachCard({ title, text, onCopy, copied }: { title: string; text: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="card-surface p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-brand-muted uppercase">{title}</p>
        <button onClick={onCopy} className="text-brand-muted hover:text-brand-primary">
          {copied ? <Check size={13} className="text-brand-positive" /> : <Copy size={13} />}
        </button>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
