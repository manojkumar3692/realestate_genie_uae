"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

function Stat({ label, value, sub, faint, delay }: { label: string; value: string; sub: string; faint?: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <p className="ai-eyebrow opacity-70" style={{ color: faint ? "var(--ai-ink-faint)" : undefined }}>
        {label}
      </p>
      <p
        className={`ai-num font-ai-display font-bold tracking-tight mt-2 ${faint ? "text-4xl md:text-6xl text-[var(--ai-ink-ghost)]" : "text-5xl md:text-7xl text-[var(--ai-ink)]"}`}
      >
        {value}
      </p>
      <p className="text-[var(--ai-ink-faint)] text-sm mt-1 uppercase tracking-wide">{sub}</p>
    </motion.div>
  );
}

export default function BusinessValue() {
  return (
    <section className="relative ai-bg py-24 md:py-32 overflow-hidden">
      <div className="max-w-2xl mx-auto px-4 md:px-6 flex flex-col items-center gap-10">
        <Stat label="You spent money acquiring" value="10,482" sub="Leads" delay={0} />
        <Stat label="Original conversion" value="214" sub="Buyers" delay={0.1} />
        <Stat label="What happened to" value="10,268" sub="Other people?" faint delay={0.2} />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-col items-center gap-2 py-2"
        >
          <ArrowDown size={18} className="text-[var(--ai-ink-ghost)]" />
          <p className="text-[var(--ai-ink-soft)] text-sm">AI re-examines them for today&apos;s projects.</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-10 md:gap-16">
          <Stat label="Current Matches" value="347" sub="Potential buyers" delay={0.45} />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="text-center"
          >
            <p className="ai-eyebrow">High Intent</p>
            <p className="ai-num font-ai-display font-bold tracking-tight mt-2 text-5xl md:text-7xl text-[var(--ai-accent)]">42</p>
            <p className="text-[var(--ai-ink-faint)] text-sm mt-1 uppercase tracking-wide">Ready now</p>
          </motion.div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="font-ai-display font-semibold uppercase text-2xl md:text-4xl text-center tracking-tight leading-snug text-[var(--ai-ink)] mt-6 max-w-lg"
        >
          Before you buy more leads, <span className="ai-mark">look at the ones you already own.</span>
        </motion.h2>
      </div>
    </section>
  );
}
