"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const ROWS = [
  { label: "Budget", value: "AED 900K–1.1M", note: "Fits project" },
  { label: "Property", value: "1BR", note: "Exact preference" },
  { label: "Intent", value: "Investment", note: "Strong match" },
  { label: "Location", value: "Dubai South", note: "Previously enquired" },
];

export default function MatchDemoCard() {
  return (
    <section className="relative max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
      <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
        <h2 className="font-ai-display font-semibold text-3xl md:text-[2.5rem] tracking-tight leading-tight text-[var(--ai-ink)]">
          Every match comes with a reason, not just a score.
        </h2>
        <p className="text-[var(--ai-ink)]/55 text-base mt-4 leading-relaxed max-w-md">
          No black box. Every Hot, Warm or Possible buyer comes with an explanation an agent can act on immediately.
        </p>
        <Link href="/signup" className="ai-btn-primary inline-block mt-7">
          See How Buyer Matching Works
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20, rotateY: -6 }}
        whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="ai-glass-card p-6 rounded-2xl"
        style={{ perspective: "1000px" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-ai-display font-semibold text-lg text-[var(--ai-ink)]">Ahmed Khan</p>
          <span className="badge text-white" style={{ background: "linear-gradient(100deg, var(--ai-violet), var(--ai-cyan))" }}>
            94% Strong Match
          </span>
        </div>
        <div className="flex flex-col divide-y divide-[var(--ai-border)]">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="text-[var(--ai-ink)]/45 text-xs uppercase tracking-wide">{r.label}</p>
                <p className="font-medium text-[var(--ai-ink)]">{r.value}</p>
              </div>
              <span className="flex items-center gap-1 text-[var(--ai-positive)] text-xs font-medium">
                <Check size={13} /> {r.note}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--ai-border)]">
          <p className="text-xs text-[var(--ai-ink)]/45 uppercase tracking-wide mb-1">Previous Objection</p>
          <p className="text-sm italic text-[var(--ai-ink)]/60 mb-3">&ldquo;Initial payment was too high.&rdquo;</p>
          <p className="text-xs text-[var(--ai-ink)]/45 uppercase tracking-wide mb-1">Why This Project Works</p>
          <p className="text-sm leading-relaxed text-[var(--ai-ink)]">
            This project&apos;s lower initial payment resolves Ahmed&apos;s previous objection while staying inside his inferred investment budget.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
