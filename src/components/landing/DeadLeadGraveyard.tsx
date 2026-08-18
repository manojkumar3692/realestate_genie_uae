"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const ROWS = [
  { name: "Ahmed Khan", status: "LOST" },
  { name: "Sarah Joseph", status: "NO RESPONSE" },
  { name: "Mohammed Ali", status: "NOT INTERESTED" },
  { name: "Raj Patel", status: "TOO EXPENSIVE" },
  { name: "Anjali Rao", status: "LATER" },
  { name: "John Mathew", status: "PAYMENT PLAN" },
];

function LostToIntelligence() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [showLine, setShowLine] = useState(false);
  const [morphed, setMorphed] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => setShowLine(true), 1200);
    const t2 = setTimeout(() => setMorphed(true), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [inView]);

  return (
    <div ref={ref} className="text-center">
      <p className="ai-eyebrow">Most CRMs call these</p>
      <div className="relative inline-block mt-2 min-h-[3.2rem] md:min-h-[4.2rem]">
        <AnimatePresence mode="popLayout">
          {!morphed ? (
            <motion.span
              key="lost"
              initial={{ opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(8px)", scale: 0.92 }}
              transition={{ duration: 0.5 }}
              className="font-ai-display font-semibold uppercase text-4xl md:text-6xl text-[var(--ai-ink-ghost)] tracking-tight block"
            >
              Lost.
            </motion.span>
          ) : (
            <motion.span
              key="intelligence"
              initial={{ opacity: 0, filter: "blur(8px)", scale: 0.92 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-ai-display font-semibold uppercase text-4xl md:text-6xl ai-mark tracking-tight block"
            >
              Intelligence.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showLine && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[var(--ai-ink-soft)] text-sm md:text-base mt-3"
          >
            We call them buyer history.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DeadLeadGraveyard() {
  return (
    <section className="relative ai-bg-deep py-24 md:py-32 overflow-hidden">
      <div className="max-w-2xl mx-auto px-4 md:px-6 text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="font-ai-display font-semibold uppercase text-3xl md:text-[2.75rem] leading-tight tracking-tight text-[var(--ai-ink)]"
        >
          You already paid
          <br />
          for these leads.
        </motion.h2>
        <p className="text-[var(--ai-ink-soft)] text-base md:text-lg mt-4 leading-relaxed max-w-md mx-auto">
          Most buyers don&apos;t purchase the first property they enquire about. That doesn&apos;t make the lead worthless.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6">
        <div className="ai-card rounded-2xl overflow-hidden mb-16">
          <div className="divide-y divide-[var(--ai-border)]">
            {ROWS.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <span className="ai-mono text-[13px] text-[var(--ai-ink-soft)]">{r.name}</span>
                <span className="ai-badge">{r.status}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <LostToIntelligence />
    </section>
  );
}
