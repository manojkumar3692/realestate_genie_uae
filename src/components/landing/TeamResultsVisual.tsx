"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const AGENTS = [
  { name: "Agent A", hot: 12 },
  { name: "Agent B", hot: 8 },
  { name: "Agent C", hot: 21 },
  { name: "Agent D", hot: 5 },
  { name: "Agent E", hot: 9 },
];
const TOTAL = AGENTS.reduce((s, a) => s + a.hot, 0);

export default function TeamResultsVisual() {
  return (
    <section className="relative ai-bg py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-4 md:px-6"
      >
        <div className="ai-glass-card p-6 md:p-8 rounded-2xl">
          <p className="text-xs font-semibold text-[var(--ai-violet)] uppercase tracking-wide mb-1">Dubai South Launch</p>
          <h3 className="font-ai-display font-semibold text-2xl mb-6 text-[var(--ai-ink)]">Team Opportunities</h3>
          <div className="flex flex-col divide-y divide-[var(--ai-border)]">
            {AGENTS.map((a) => (
              <div key={a.name} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-[var(--ai-ink)]">{a.name}</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ai-hot)]">
                  <Flame size={14} /> {a.hot} Hot
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-[var(--ai-border)] flex items-center justify-between">
            <span className="font-ai-display font-semibold text-lg ai-gradient-text">{TOTAL} Hot Buyers Found</span>
          </div>
        </div>
        <p className="text-center text-sm text-[var(--ai-ink)]/50 mt-5 max-w-md mx-auto leading-relaxed">
          Admins see opportunity counts. Agents keep their customer identities private.
        </p>
      </motion.div>
    </section>
  );
}
