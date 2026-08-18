"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PLANS, formatPlanPrice, type Region } from "@/lib/pricing/config";
import CurrencyToggle from "./CurrencyToggle";

export default function PricingSection() {
  const [region, setRegion] = useState<Region>("AE");

  return (
    <section id="pricing" className="relative ai-bg py-24 md:py-32 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="font-ai-display font-semibold uppercase text-4xl md:text-6xl tracking-tight text-[var(--ai-ink)]">Simple.</h2>
          <p className="text-[var(--ai-ink-soft)] text-base mt-3">No CRM modules. No unnecessary seats. Just buyer intelligence.</p>
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
              className={`rounded-2xl p-7 flex flex-col relative ${plan.key === "team" ? "ai-card-activated" : "ai-card"}`}
            >
              {plan.badge && <span className="absolute -top-3 left-7 ai-badge ai-badge-dark">{plan.badge}</span>}
              <h3 className="font-ai-display font-semibold text-xl text-[var(--ai-ink)]">{plan.name}</h3>
              <p className="text-sm text-[var(--ai-ink-soft)] mt-1">{plan.tagline}</p>
              <p className="mt-5">
                <span className="ai-num text-3xl font-ai-display font-semibold text-[var(--ai-ink)]">{formatPlanPrice(plan, region)}</span>
                <span className="text-[var(--ai-ink-faint)] text-sm"> / month</span>
              </p>

              <ul className="flex flex-col gap-2 mt-6 mb-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--ai-ink)]">
                    <Check size={15} className="text-[var(--ai-positive)] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>

              <Link href={`/signup?plan=${plan.key}&region=${region}`} className={plan.key === "team" ? "ai-btn-primary text-center mt-4" : "ai-btn-secondary text-center mt-4"}>
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[11px] text-[var(--ai-ink-faint)] mt-8">*Reasonable AI fair-use applies.</p>
      </div>
    </section>
  );
}
