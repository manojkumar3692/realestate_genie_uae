"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const AGENTS = [
  { name: "Agent A", count: "12,420" },
  { name: "Agent B", count: "8,920" },
  { name: "Agent C", count: "15,110" },
  { name: "Agent D", count: "6,780" },
  { name: "Agent E", count: "9,410" },
];

export default function TeamPrivacySection() {
  return (
    <section
      id="teams"
      className="relative overflow-hidden py-20 md:py-28 border-y border-white/[0.06]"
      style={{ background: "var(--ai-surface)" }}
    >
      <div className="ai-orb ai-pulse w-[380px] h-[380px] top-0 left-1/4" style={{ background: "var(--ai-violet)", opacity: 0.25 }} />
      <div className="ai-orb ai-pulse w-[320px] h-[320px] bottom-0 right-1/4" style={{ background: "var(--ai-cyan)", opacity: 0.2, animationDelay: "2s" }} />

      <div className="relative max-w-5xl mx-auto px-4 md:px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
          <h2 className="font-ai-display font-semibold text-3xl md:text-[2.5rem] tracking-tight text-white">
            Share projects.
            <br />
            <span className="ai-gradient-text italic">Not your customers.</span>
          </h2>
          <p className="text-white/50 text-base mt-4 max-w-xl mx-auto leading-relaxed">
            Every agent keeps their own private buyer database while your team works from the same project inventory.
          </p>
        </motion.div>

        <div className="mt-14 flex flex-col items-center gap-3">
          <div className="inline-block rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold ai-gradient-text">
            Shared Project · Dubai South Launch
          </div>
          <div className="w-px h-8 bg-white/15" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {AGENTS.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-4 flex flex-col items-center gap-1.5"
            >
              <p className="text-sm font-semibold text-white">{a.name}</p>
              <p className="text-xs text-white/45">{a.count} Leads</p>
              <span className="flex items-center gap-1 text-[10px] font-semibold ai-gradient-text mt-1">
                <Lock size={10} className="text-[var(--ai-cyan)]" /> PRIVATE
              </span>
            </motion.div>
          ))}
        </div>

        <p className="text-white/70 text-sm font-medium mt-10">&ldquo;Projects are shared. Buyer data isn&apos;t.&rdquo;</p>
      </div>
    </section>
  );
}
