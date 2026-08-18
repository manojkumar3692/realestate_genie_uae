"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const STATS = [
  { label: "Buyer Profiles", value: "20,000" },
  { label: "Active Projects", value: "12" },
  { label: "Hot Matches", value: "47" },
];

export default function ForIndividualAgents() {
  return (
    <section className="relative ai-bg py-24 md:py-32 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="ai-eyebrow">For Individual Agents</p>
          <h2 className="font-ai-display font-semibold uppercase text-3xl md:text-[2.5rem] tracking-tight text-[var(--ai-ink)] mt-2 leading-tight">
            Your private buyer intelligence.
          </h2>
          <p className="text-[var(--ai-ink-soft)] text-base mt-4 max-w-sm leading-relaxed">
            Upload your own historical data. No company-wide CRM required. No migration. Just your buyers and your projects.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="ai-card rounded-2xl p-7"
        >
          <div className="flex items-center justify-between mb-6">
            <p className="font-ai-display font-semibold text-[var(--ai-ink)]">Your Workspace</p>
            <span className="ai-badge">
              <Lock size={10} /> Private
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="ai-num font-ai-display font-bold text-2xl md:text-3xl text-[var(--ai-ink)]">{s.value}</p>
                <p className="text-[10.5px] text-[var(--ai-ink-faint)] uppercase tracking-wide mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
