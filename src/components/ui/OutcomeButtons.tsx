"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Wallet, MapPin, XCircle, Ban, PhoneMissed } from "lucide-react";

/**
 * The outcome loop (product spec §6) — 7 buttons, not a CRM pipeline. Three fire immediately.
 * Four (Not Now / Budget Changed / Different Location / Bought Elsewhere) open exactly one
 * inline follow-up question; three of those collect a short free-text answer that feeds the
 * "Living Buyer Profile" (see recordMatchOutcome in db/repoMatching.ts). No dialogs, no
 * multi-step forms — this is meant to be a single tap (or one tap + one short answer) per
 * contact, usable both inside a project's match table and on the /contact-today worklist.
 */

export interface OutcomeButtonsResult {
  outcomeStatus: string;
  rescored: boolean;
}

interface OutcomeButtonDef {
  key: string;
  label: string;
  icon: typeof CheckCircle2;
  tone: "positive" | "neutral" | "negative";
  followupQuestion?: string;
}

const BUTTONS: OutcomeButtonDef[] = [
  { key: "interested", label: "Interested", icon: CheckCircle2, tone: "positive" },
  { key: "not_now", label: "Not Now", icon: Clock, tone: "neutral", followupQuestion: "Did they mention when?" },
  { key: "budget_changed", label: "Budget Changed", icon: Wallet, tone: "neutral", followupQuestion: "New approximate budget?" },
  { key: "different_location", label: "Different Location", icon: MapPin, tone: "neutral", followupQuestion: "What location are they considering?" },
  { key: "not_interested", label: "Not Interested", icon: XCircle, tone: "negative" },
  { key: "bought_elsewhere", label: "Bought Elsewhere", icon: Ban, tone: "negative" },
  { key: "no_response", label: "No Response", icon: PhoneMissed, tone: "neutral" },
];

const TONE_CLASS: Record<OutcomeButtonDef["tone"], string> = {
  positive: "hover:border-brand-positive hover:text-brand-positive",
  neutral: "hover:border-brand-accent hover:text-brand-accent",
  negative: "hover:border-hot hover:text-hot",
};

export default function OutcomeButtons({
  matchId,
  initialOutcomeStatus,
  onSubmit,
  onLogged,
  className = "",
}: {
  matchId: string;
  initialOutcomeStatus?: string;
  onSubmit: (matchId: string, outcomeStatus: string, rawAnswer?: string) => Promise<OutcomeButtonsResult>;
  onLogged?: (result: OutcomeButtonsResult) => void;
  className?: string;
}) {
  const [loggedStatus, setLoggedStatus] = useState<string | null>(
    initialOutcomeStatus && initialOutcomeStatus !== "not_contacted" ? initialOutcomeStatus : null
  );
  const [followupKey, setFollowupKey] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [isPending, startTransition] = useTransition();

  function fire(key: string, rawAnswer?: string) {
    startTransition(async () => {
      const result = await onSubmit(matchId, key, rawAnswer);
      setLoggedStatus(result.outcomeStatus);
      setFollowupKey(null);
      setAnswer("");
      onLogged?.(result);
    });
  }

  function handleClick(btn: OutcomeButtonDef) {
    if (btn.followupQuestion) {
      setFollowupKey(btn.key);
      return;
    }
    fire(btn.key);
  }

  if (loggedStatus && !followupKey) {
    const btn = BUTTONS.find((b) => b.key === loggedStatus);
    const Icon = btn?.icon;
    return (
      <div className={`flex items-center gap-2 ${className}`} onClick={(e) => e.stopPropagation()}>
        <span className="badge badge-muted">
          {Icon && <Icon size={11} />} Logged: {btn?.label ?? loggedStatus.replace(/_/g, " ")}
        </span>
        <button
          type="button"
          onClick={() => setLoggedStatus(null)}
          className="text-[11px] text-brand-muted hover:text-brand-primary underline underline-offset-2"
        >
          Change
        </button>
      </div>
    );
  }

  const activeFollowup = BUTTONS.find((b) => b.key === followupKey);
  if (activeFollowup) {
    return (
      <form
        className={`flex items-center gap-2 flex-wrap ${className}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          fire(activeFollowup.key, answer);
        }}
      >
        <span className="text-xs font-medium text-brand-primary shrink-0">{activeFollowup.followupQuestion}</span>
        <input
          autoFocus
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type here…"
          className="input-field py-1 text-xs flex-1 min-w-[120px]"
        />
        <button type="submit" disabled={isPending || !answer.trim()} className="btn-primary btn-sm">
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setFollowupKey(null)} className="text-[11px] text-brand-muted hover:text-brand-primary">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`} onClick={(e) => e.stopPropagation()}>
      {BUTTONS.map((btn) => (
        <button
          key={btn.key}
          type="button"
          disabled={isPending}
          onClick={() => handleClick(btn)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-brand-border text-[11px] font-semibold uppercase tracking-wide text-brand-muted bg-white transition-colors disabled:opacity-50 ${TONE_CLASS[btn.tone]}`}
        >
          <btn.icon size={11} />
          {btn.label}
        </button>
      ))}
    </div>
  );
}
