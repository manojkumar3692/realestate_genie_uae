"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";

const FLOW = ["10,000 Leads", "Original Project", "Most Don't Buy", "Months Later", "New Project", "AI Finds The Right Buyers Again"];
const VALUE_FLOW = ["10,482 Old Leads + 1 New Project", "AI Buyer Matching", "347 Potential Buyers", "42 Hot Matches"];

export default function ProblemSection() {
  return (
    <section className="relative max-w-5xl mx-auto px-4 md:px-6 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mx-auto mb-14"
      >
        <h2 className="font-ai-display font-semibold text-3xl md:text-[2.75rem] leading-tight tracking-tight text-[var(--ai-ink)]">
          You already paid for these leads.
        </h2>
        <p className="text-[var(--ai-ink)]/55 text-base md:text-lg mt-4 leading-relaxed">
          Most real-estate leads don&apos;t buy the first project they enquire about. That doesn&apos;t mean they&apos;re useless. Their budget,
          location preference, unit type, investment intent and previous objections can make them the perfect buyer for your next launch.
        </p>
      </motion.div>

      <div className="flex flex-col items-center gap-2 mb-24 md:mb-28">
        {FLOW.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="ai-glass-card px-4 py-2 rounded-full text-sm font-medium text-[var(--ai-ink)]">{step}</span>
            {i < FLOW.length - 1 && <ArrowDown size={16} className="text-[var(--ai-ink)]/20" />}
          </motion.div>
        ))}
      </div>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="font-ai-display font-semibold text-3xl md:text-[2.75rem] leading-tight tracking-tight text-[var(--ai-ink)]">
          Stop starting from zero
          <br />
          with every new project.
        </h2>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {VALUE_FLOW.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <span
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-center ${
                i === VALUE_FLOW.length - 1 ? "text-white" : "ai-glass-card text-[var(--ai-ink)]"
              }`}
              style={i === VALUE_FLOW.length - 1 ? { background: "linear-gradient(100deg, var(--ai-violet), var(--ai-cyan))" } : undefined}
            >
              {step}
            </span>
            {i < VALUE_FLOW.length - 1 && <span className="text-[var(--ai-ink)]/20 hidden sm:inline">→</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
