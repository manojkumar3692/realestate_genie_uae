"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const ROWS = [
  { name: "Ahmed Khan", status: "LOST", budget: "AED 1.15M", loc: "JVC", intent: "Investor" },
  { name: "Sarah Joseph", status: "NO RESPONSE", budget: "AED 2.0M", loc: "Villa", intent: "End User" },
  { name: "Mohammed Ali", status: "NOT INTERESTED", budget: "AED 900K", loc: "Dubai South", intent: "Investor" },
  { name: "Raj Patel", status: "TOO EXPENSIVE", budget: "AED 1.4M", loc: "Arjan", intent: "End User" },
  { name: "Anjali Rao", status: "LATER", budget: "AED 780K", loc: "JVC", intent: "Investor" },
  { name: "John Mathew", status: "PAYMENT PLAN", budget: "AED 1.1M", loc: "Dubai South", intent: "Investor" },
];

const FILLER_ROWS = Array.from({ length: 9 }, (_, i) => i);

/**
 * The second signature 3D moment: a spreadsheet genuinely tilted in 3D space (CSS perspective +
 * preserve-3d, not a flat table) with rows receding into the distance, that breaks apart into
 * floating buyer-intelligence nodes once it's been on screen a moment. "Most systems see a
 * spreadsheet." becomes "We see buyers." — the same six people, reframed.
 */
export default function DeadLeadGraveyard() {
  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(panelRef, { once: true, margin: "-120px" });
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setBroken(true), 1600);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <section className="relative ai-bg-deep py-24 md:py-32 overflow-hidden">
      <div className="max-w-2xl mx-auto px-4 md:px-6 text-center mb-14">
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

      <div className="relative max-w-2xl mx-auto px-4 md:px-6 text-center mb-8 h-10">
        <AnimatePresence mode="wait">
          <motion.p
            key={broken ? "buyers" : "spreadsheet"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className={`ai-eyebrow text-[13px] ${broken ? "" : ""}`}
            style={broken ? { color: "var(--ai-accent)" } : undefined}
          >
            {broken ? "We see buyers." : "Most systems see a spreadsheet."}
          </motion.p>
        </AnimatePresence>
      </div>

      <div ref={panelRef} className="relative max-w-2xl mx-auto px-4 md:px-6" style={{ minHeight: 340 }}>
        <AnimatePresence mode="wait">
          {!broken ? (
            <motion.div
              key="sheet"
              exit={{ opacity: 0, scale: 0.9, rotateX: 28 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ perspective: 1600 }}
              className="relative"
            >
              <div
                className="ai-card rounded-2xl overflow-hidden relative"
                style={{ transform: "rotateX(14deg) rotateY(-3deg)", transformStyle: "preserve-3d", transformOrigin: "top center" }}
              >
                {/* rows extending into the distance, behind the real data */}
                {FILLER_ROWS.map((i) => (
                  <div
                    key={i}
                    className="h-6 border-b border-[var(--ai-border)]"
                    style={{ opacity: Math.max(0.02, 0.18 - i * 0.018), transform: `translateZ(${-8 - i * 6}px)` }}
                  />
                ))}
                <div className="absolute inset-0 flex flex-col">
                  {ROWS.map((r, i) => (
                    <motion.div
                      key={r.name}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.4, delay: i * 0.07 }}
                      className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--ai-border)] bg-[var(--ai-surface)]"
                      style={{ transform: `translateZ(${i * 1.5}px)` }}
                    >
                      <span className="ai-mono text-[13px] text-[var(--ai-ink-soft)]">{r.name}</span>
                      <span className="ai-badge">{r.status}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="nodes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              {ROWS.map((r, i) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, scale: 0.7, y: 24, rotate: (i % 2 === 0 ? -1 : 1) * (4 + i) }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="ai-card-activated rounded-xl p-3.5 w-[150px]"
                >
                  <p className="text-[12px] font-semibold text-[var(--ai-ink)] truncate">{r.name}</p>
                  <div className="flex flex-col gap-1 mt-2">
                    <span className="text-[10px] text-[var(--ai-ink-soft)]">{r.budget}</span>
                    <span className="text-[10px] text-[var(--ai-ink-soft)]">{r.loc}</span>
                    <span className="ai-badge ai-badge-accent w-fit mt-0.5">{r.intent}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
