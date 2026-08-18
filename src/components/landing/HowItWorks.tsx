"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileSpreadsheet, Building2, Sparkles, Users } from "lucide-react";

const MESSY_COLUMNS = ["Cust_Name", "Mobile", "Bgt", "Proj_Int", "Sales_Rem", "Source"];
const CLEAN_COLUMNS = ["Name", "Phone", "Budget", "Location", "Intent", "Notes"];
const INTELLIGENCE = ["Budget", "Location", "Property Type", "Intent", "Timeline", "Payment Preference", "Previous Objection"];

function Connector({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay }}
      className="text-[var(--ai-ink-ghost)] shrink-0 rotate-90 md:rotate-0"
    >
      <ArrowRight size={18} />
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative ai-bg py-24 md:py-32 overflow-hidden">
      <div className="ai-grid-bg absolute inset-0" />
      <div className="relative max-w-6xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg mx-auto mb-16"
        >
          <h2 className="font-ai-display font-semibold uppercase text-3xl md:text-[2.5rem] tracking-tight text-[var(--ai-ink)]">
            Drop in whatever your CRM gives you.
          </h2>
          <p className="text-[var(--ai-ink-soft)] text-base mt-3">We&apos;ll organize the rest.</p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-3 flex-wrap">
          {/* messy file */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="ai-card rounded-2xl p-5 w-[220px] shrink-0"
          >
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet size={16} className="text-[var(--ai-ink-faint)]" />
              <p className="ai-mono text-[10.5px] text-[var(--ai-ink-faint)] truncate">CRM_EXPORT_FINAL_V7.xlsx</p>
            </div>
            <div className="flex flex-col gap-1">
              {MESSY_COLUMNS.map((c) => (
                <span key={c} className="ai-mono text-[10.5px] text-[var(--ai-ink-ghost)]">
                  {c}
                </span>
              ))}
            </div>
          </motion.div>

          <Connector delay={0.15} />

          {/* cleaned */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="ai-card-activated rounded-2xl p-5 w-[220px] shrink-0"
          >
            <p className="ai-eyebrow mb-3">AI Restructures</p>
            <div className="flex flex-col gap-1.5">
              {CLEAN_COLUMNS.map((c) => (
                <span key={c} className="text-[12px] font-medium text-[var(--ai-ink)]">
                  {c}
                </span>
              ))}
            </div>
          </motion.div>

          <Connector delay={0.3} />

          {/* buyer intelligence attributes */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="ai-card rounded-2xl p-5 w-[240px] shrink-0"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={15} className="text-[var(--ai-accent)]" />
              <p className="font-ai-display font-semibold text-[13px] text-[var(--ai-ink)]">Buyer Intelligence</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INTELLIGENCE.map((t) => (
                <span key={t} className="ai-badge">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <Connector delay={0.45} />

          {/* new project */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="ai-card rounded-2xl p-5 w-[160px] shrink-0 text-center"
          >
            <Building2 size={16} className="text-[var(--ai-ink-faint)] mx-auto mb-2" />
            <p className="text-[12px] font-medium text-[var(--ai-ink)]">New Project</p>
          </motion.div>

          <Connector delay={0.6} />

          {/* matching -> buyers */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="ai-card-activated rounded-2xl p-5 w-[160px] shrink-0 text-center"
          >
            <Users size={16} className="text-[var(--ai-accent)] mx-auto mb-2" />
            <p className="text-[12px] font-semibold text-[var(--ai-ink)]">Buyers</p>
            <p className="text-[10px] text-[var(--ai-ink-faint)] mt-0.5">Ranked &amp; explained</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
