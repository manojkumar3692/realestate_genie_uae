"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";

const SCORES = [
  { label: "Budget", score: 24, max: 25 },
  { label: "Property", score: 15, max: 15 },
  { label: "Intent", score: 10, max: 10 },
  { label: "Location", score: 17, max: 20 },
  { label: "Payment Plan", score: 9, max: 10 },
  { label: "Recency", score: 8, max: 10 },
];

const REASONS = [
  "Previously explored 1BR investment units.",
  "Budget fits this project's price range.",
  "Has considered Dubai South.",
  "Previous deal failed because the initial payment was high — this project directly addresses that objection.",
];

const OPENER = "Hi Ahmed, you previously looked at a 1BR investment near Dubai South — this new launch has the lower upfront payment you were after.";

export default function MatchCard() {
  const [copied, setCopied] = useState(false);

  async function copyOpener() {
    try {
      await navigator.clipboard.writeText(OPENER);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable — silently ignore, this is a demo affordance
    }
  }

  return (
    <section className="relative ai-bg py-24 md:py-32 overflow-hidden">
      <div className="ai-grid-bg absolute inset-0" />
      <div className="relative max-w-2xl mx-auto px-4 md:px-6 text-center mb-14">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
          <p className="ai-eyebrow">The Match Card</p>
          <h2 className="font-ai-display font-semibold uppercase text-3xl md:text-[2.5rem] tracking-tight text-[var(--ai-ink)] mt-2">
            Every match comes with a reason.
          </h2>
          <p className="text-[var(--ai-ink-soft)] text-base mt-4 max-w-md mx-auto leading-relaxed">
            AI doesn&apos;t just rank a lead. It explains exactly why — so an agent can act on it immediately.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-lg mx-auto px-4 md:px-6"
      >
        <div className="ai-card-activated rounded-2xl p-7 md:p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-ai-display font-semibold text-xl text-[var(--ai-ink)]">Ahmed Khan</p>
              <span className="ai-badge ai-badge-accent mt-2">Strong Match</span>
            </div>
            <div className="text-right shrink-0">
              <p className="ai-num font-ai-display font-bold text-4xl text-[var(--ai-accent)] leading-none">94%</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {SCORES.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-[11.5px] mb-1">
                  <span className="text-[var(--ai-ink-soft)]">{s.label}</span>
                  <span className="ai-num text-[var(--ai-ink)] font-medium">
                    {s.score} / {s.max}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--ai-border)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(s.score / s.max) * 100}%` }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: "var(--ai-accent)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-[var(--ai-border)]">
            <p className="ai-eyebrow mb-3">Why Ahmed Matches</p>
            <ul className="flex flex-col gap-2">
              {REASONS.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13px] text-[var(--ai-ink)] leading-snug">
                  <Check size={14} className="text-[var(--ai-positive)] shrink-0 mt-0.5" /> {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-5 border-t border-[var(--ai-border)]">
            <p className="ai-eyebrow mb-2">Suggested Opener</p>
            <div className="rounded-xl bg-[var(--ai-bg)] border border-[var(--ai-border)] p-4">
              <p className="text-[13px] text-[var(--ai-ink-soft)] italic leading-relaxed">&ldquo;{OPENER}&rdquo;</p>
              <button
                type="button"
                onClick={copyOpener}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ai-accent)] hover:text-[var(--ai-accent-2)] transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={12} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
