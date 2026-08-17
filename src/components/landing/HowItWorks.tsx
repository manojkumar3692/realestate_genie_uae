"use client";

import { motion } from "framer-motion";
import { UploadCloud, Building2, ListChecks } from "lucide-react";

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload Your Leads",
    description: "CSV or Excel. No fixed template required. The system understands and organizes your export automatically.",
  },
  {
    icon: Building2,
    title: "Add Your Project",
    description: "Enter location, price, unit types, payment plan and buyer type for your new launch.",
  },
  {
    icon: ListChecks,
    title: "Get Your Buyer Shortlist",
    description: "Receive Hot, Warm and Possible buyers, with clear reasons behind every match.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative ai-bg py-20 md:py-28 overflow-hidden">
      <div className="ai-grid-bg absolute inset-0" />
      <div className="relative max-w-5xl mx-auto px-4 md:px-6">
        <h2 className="font-ai-display font-semibold text-3xl md:text-[2.5rem] text-center tracking-tight mb-14 text-[var(--ai-ink)]">How it works</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="ai-glass-card rounded-2xl p-7 flex flex-col gap-3 relative"
            >
              <span className="absolute top-5 right-6 font-ai-display text-4xl font-semibold ai-gradient-text opacity-40">0{i + 1}</span>
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg, var(--ai-violet), var(--ai-cyan))" }}
              >
                <step.icon size={20} />
              </span>
              <h3 className="font-ai-display font-semibold text-lg text-[var(--ai-ink)]">{step.title}</h3>
              <p className="text-sm text-[var(--ai-ink)]/55 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
