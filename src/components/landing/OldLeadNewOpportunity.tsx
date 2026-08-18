"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function OldLeadNewOpportunity() {
  return (
    <section className="relative ai-bg py-24 md:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 md:gap-3 items-stretch">
          {/* Stage 1 — January */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="ai-card rounded-2xl p-6 flex flex-col"
          >
            <p className="ai-eyebrow opacity-60" style={{ color: "var(--ai-ink-faint)" }}>
              January
            </p>
            <p className="text-[var(--ai-ink)] font-medium mt-3">Ahmed enquired about</p>
            <p className="font-ai-display font-semibold text-lg text-[var(--ai-ink)] mt-1">JVC · 1BR</p>
            <p className="text-[var(--ai-ink-soft)] text-sm mt-0.5">AED 1.15M</p>
            <div className="mt-auto pt-5">
              <span className="ai-badge">Lost</span>
              <p className="text-[var(--ai-ink-faint)] text-xs mt-2">Reason: initial payment too high</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="hidden md:flex items-center justify-center text-[var(--ai-ink-ghost)]"
          >
            <ArrowRight size={22} />
          </motion.div>

          {/* Stage 2 — August */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="ai-card rounded-2xl p-6 flex flex-col"
          >
            <p className="ai-eyebrow opacity-60" style={{ color: "var(--ai-ink-faint)" }}>
              August
            </p>
            <p className="text-[var(--ai-ink)] font-medium mt-3">New project</p>
            <p className="font-ai-display font-semibold text-lg text-[var(--ai-ink)] mt-1">Dubai South · 1BR</p>
            <p className="text-[var(--ai-ink-soft)] text-sm mt-0.5">AED 995K</p>
            <div className="mt-auto pt-5">
              <span className="ai-badge">20% Initial Payment</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="hidden md:flex items-center justify-center text-[var(--ai-ink-ghost)]"
          >
            <ArrowRight size={22} />
          </motion.div>

          {/* Stage 3 — AI connection */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="ai-card-activated rounded-2xl p-6 flex flex-col"
          >
            <p className="ai-eyebrow">AI Connection</p>
            <p className="font-ai-display font-semibold text-lg text-[var(--ai-ink)] mt-3">Ahmed Khan</p>
            <p className="text-[var(--ai-ink-soft)] text-sm mt-0.5">System identifies a match</p>
            <div className="mt-auto pt-5">
              <span className="ai-num font-ai-display font-bold text-3xl text-[var(--ai-accent)]">94%</span>
              <span className="text-[var(--ai-ink-faint)] text-xs ml-2 uppercase tracking-wide">Match</span>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-ai-display font-semibold uppercase text-2xl md:text-4xl text-center tracking-tight leading-snug text-[var(--ai-ink)] mt-16 md:mt-20 max-w-3xl mx-auto"
        >
          The customer didn&apos;t change into a <span className="ai-mark">&ldquo;new lead.&rdquo;</span>
          <br />
          The project changed.
        </motion.p>
      </div>
    </section>
  );
}
