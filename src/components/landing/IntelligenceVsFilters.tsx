"use client";

import { motion } from "framer-motion";

export default function IntelligenceVsFilters() {
  return (
    <section className="relative ai-bg-deep py-24 md:py-32 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg mx-auto mb-14"
        >
          <h2 className="font-ai-display font-semibold uppercase text-3xl md:text-[2.5rem] tracking-tight text-[var(--ai-ink)]">
            Buyers are more than <span className="ai-mark">filters.</span>
          </h2>
          <p className="text-[var(--ai-ink-soft)] text-base mt-4 leading-relaxed">
            Someone doesn&apos;t need to have typed the exact project location six months ago to be the right buyer today.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 border border-[var(--ai-border)] bg-transparent flex flex-col"
          >
            <p className="ai-eyebrow opacity-60" style={{ color: "var(--ai-ink-faint)" }}>
              Basic CRM Filter
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--ai-ink-faint)]">Location</span>
                <span className="text-[var(--ai-ink-soft)]">Dubai South</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ai-ink-faint)]">Budget</span>
                <span className="text-[var(--ai-ink-soft)]">&lt; AED 1M</span>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-[var(--ai-border)] mt-6">
              <p className="text-2xl font-ai-display font-semibold text-[var(--ai-ink-faint)]">18 leads</p>
              <p className="text-[11px] text-[var(--ai-ink-faint)] mt-1">Matches keywords, nothing more</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="ai-card-activated rounded-2xl p-6 flex flex-col"
          >
            <p className="ai-eyebrow">AI Buyer Intelligence</p>
            <p className="text-sm text-[var(--ai-ink)] leading-relaxed mt-4">
              Ahmed previously wanted <span className="font-medium">Sobha Hartland</span> — AED 1.2M, investor, 1BR. Rejected because the upfront
              payment was too high.
            </p>
            <p className="text-sm text-[var(--ai-ink-soft)] leading-relaxed mt-2">
              New Dubai South project: AED 995K · 20% down · Investment.
            </p>
            <div className="mt-auto pt-6 border-t border-[var(--ai-border)] mt-6 flex items-center justify-between">
              <span className="ai-num text-2xl font-ai-display font-semibold text-[var(--ai-accent)]">92%</span>
              <span className="ai-badge ai-badge-accent">AI Match</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
