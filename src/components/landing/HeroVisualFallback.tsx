"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame } from "lucide-react";

/**
 * Lightweight 2D visual — the mobile-first default, and what desktop shows while the 3D bundle
 * loads. Pure CSS transforms + framer-motion, no WebGL, so it's cheap on any device.
 */
const STAGES = ["10,482 OLD LEADS", "NEW PROJECT ADDED", "ANALYZING BUYER INTENT", "MATCHING", "42 HOT BUYERS FOUND", "94% MATCH"];
const ROWS = ["Sara M.", "Faisal R.", "Priya K.", "Omar T.", "Layla H."];

export default function HeroVisualFallback({ animate = true }: { animate?: boolean }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1700);
    return () => clearInterval(interval);
  }, [animate]);

  const highlightCount = stage === 4 ? 3 : stage === 5 ? 1 : 0;
  const showResult = stage >= 4;

  return (
    <div className="relative ai-glass-card rounded-3xl p-6 overflow-hidden">
      <div className="h-5 mb-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={STAGES[stage]}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3 }}
            className="text-[11px] font-semibold tracking-[0.15em] ai-gradient-text"
          >
            {STAGES[stage]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        {ROWS.map((name, i) => {
          const isHighlighted = i < highlightCount;
          return (
            <motion.div
              key={name}
              animate={{ opacity: isHighlighted ? 1 : 0.4, x: isHighlighted ? 4 : 0 }}
              transition={{ duration: 0.4 }}
              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs border ${
                isHighlighted ? "border-[var(--ai-violet)]/40 bg-[var(--ai-violet)]/[0.06]" : "border-transparent"
              }`}
            >
              <span className="text-[var(--ai-ink)]">{name}</span>
              {isHighlighted && <span className="ai-gradient-text font-semibold">match</span>}
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-xl p-3 mb-3 bg-white/[0.96] border border-white/10 shadow-lg">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Dubai South Residences</p>
        <p className="text-sm font-semibold text-slate-900">1BR · AED 995K · 20% Down</p>
      </div>

      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl p-3 text-white"
            style={{ background: "linear-gradient(100deg, var(--ai-violet), var(--ai-cyan))" }}
          >
            <div className="flex items-center justify-between">
              <p className="font-ai-display font-semibold text-sm">Ahmed Khan</p>
              <span className="flex items-center gap-1 text-xs font-bold">
                <Flame size={12} /> 94% MATCH
              </span>
            </div>
            <p className="text-[11px] mt-1 opacity-85">AED 900K–1.1M · 1BR Investor · Dubai South</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient glow orbs behind the card content */}
      <div className="ai-orb ai-pulse w-40 h-40 -top-10 -right-10" style={{ background: "var(--ai-violet)" }} />
      <div className="ai-orb ai-pulse w-32 h-32 -bottom-10 -left-10" style={{ background: "var(--ai-cyan)", animationDelay: "1.5s" }} />
    </div>
  );
}
