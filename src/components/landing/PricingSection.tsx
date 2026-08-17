"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PLANS, formatPlanPrice, type Region } from "@/lib/pricing/config";
import CurrencyToggle from "./CurrencyToggle";

const DIFFERENTIATION: Record<string, string[]> = {
  individual: ["One private lead database", "Project", "Matches"],
  team: ["Shared project", "5 separate private agent databases", "Each agent receives their own matches"],
};

export default function PricingSection() {
  const [region, setRegion] = useState<Region>("AE");

  return (
    <section id="pricing" className="relative ai-bg py-20 md:py-28 overflow-hidden">
      <div className="ai-orb w-[500px] h-[500px] top-1/4 left-1/2 -translate-x-1/2 opacity-20" style={{ background: "var(--ai-violet)" }} />

      <div className="relative max-w-5xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="font-ai-display font-semibold text-3xl md:text-[2.5rem] tracking-tight text-[var(--ai-ink)]">
            Simple pricing. <span className="text-[var(--ai-ink)]/40">No CRM complexity.</span>
          </h2>
          <div className="mt-6 flex justify-center">
            <CurrencyToggle region={region} onChange={setRegion} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`ai-glass-card p-7 rounded-2xl flex flex-col relative ${plan.key === "team" ? "!bg-[rgba(124,111,255,0.09)]" : ""}`}
              style={plan.key === "team" ? { boxShadow: "0 12px 40px rgba(124,111,255,0.28)", border: "1px solid var(--ai-violet)" } : undefined}
            >
              {plan.badge && (
                <span
                  className="absolute -top-3 left-7 badge text-white"
                  style={{ background: "linear-gradient(100deg, var(--ai-violet), var(--ai-cyan))" }}
                >
                  {plan.badge}
                </span>
              )}
              <h3 className="font-ai-display font-semibold text-xl text-[var(--ai-ink)]">{plan.name}</h3>
              <p className="text-sm text-[var(--ai-ink)]/55 mt-1">{plan.tagline}</p>
              <p className="mt-5">
                <span className="text-3xl font-ai-display font-semibold ai-gradient-text">{formatPlanPrice(plan, region)}</span>
                <span className="text-[var(--ai-ink)]/45 text-sm"> / month</span>
              </p>

              <ul className="flex flex-col gap-2 mt-6 mb-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--ai-ink)]">
                    <Check size={15} className="text-[var(--ai-positive)] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--ai-ink)]/45 my-4 py-3 border-y border-[var(--ai-border)]">
                {DIFFERENTIATION[plan.key].map((step, idx) => (
                  <span key={step} className="flex items-center gap-2">
                    {idx > 0 && <span className="text-[var(--ai-ink)]/20">→</span>}
                    {step}
                  </span>
                ))}
              </div>

              <Link href={`/signup?plan=${plan.key}&region=${region}`} className="ai-btn-primary text-center py-3">
                {plan.cta}
              </Link>
              {plan.key === "individual" && <p className="text-[11px] text-[var(--ai-ink)]/40 text-center mt-2">*Subject to reasonable AI usage.</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
