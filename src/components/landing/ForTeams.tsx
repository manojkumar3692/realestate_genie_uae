"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const AGENTS = [
  { name: "Agent 01", buyers: "12,420", hot: 12, x: 10 },
  { name: "Agent 02", buyers: "9,228", hot: 8, x: 27.5 },
  { name: "Agent 03", buyers: "17,104", hot: 21, x: 50 },
  { name: "Agent 04", buyers: "8,922", hot: 5, x: 72.5 },
  { name: "Agent 05", buyers: "14,881", hot: 9, x: 90 },
];
const TOTAL_HOT = AGENTS.reduce((s, a) => s + a.hot, 0);

/**
 * The third signature 3D moment: privacy communicated through genuine spatial separation rather
 * than padlock iconography. Five translucent "intelligence chambers" tilt independently in 3D
 * space — each holding its own buyer universe — fed only by a downward signal from the one
 * shared project above. No lines ever run chamber-to-chamber.
 */
export default function ForTeams() {
  return (
    <section id="teams" className="relative ai-bg-deep py-24 md:py-32 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg mx-auto mb-16"
        >
          <p className="ai-eyebrow">For Teams</p>
          <h2 className="font-ai-display font-semibold uppercase text-3xl md:text-[2.5rem] tracking-tight text-[var(--ai-ink)] mt-2">
            Share projects.
            <br />
            <span className="ai-mark">Not customers.</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* central project card */}
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="relative z-10 ai-card-activated rounded-2xl px-6 py-4 w-fit mx-auto mb-2"
          >
            <p className="ai-eyebrow">One Shared Project</p>
            <p className="font-ai-display font-semibold text-[var(--ai-ink)] mt-0.5">Dubai South Launch</p>
          </motion.div>

          {/* downward-only signal lines — project to each chamber, never chamber to chamber */}
          <svg className="hidden md:block absolute left-0 right-0 top-[64px] h-[120px] w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {AGENTS.map((a, i) => (
              <motion.line
                key={a.name}
                x1={50}
                y1={0}
                x2={a.x}
                y2={100}
                stroke="var(--ai-accent-line)"
                strokeWidth={0.25}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.08 }}
              />
            ))}
          </svg>

          <div
            className="relative pt-10 md:pt-[130px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5"
            style={{ perspective: 1400 }}
          >
            {AGENTS.map((a, i) => {
              const tilt = (i - 2) * 3.2; // fan the chambers slightly, center-most nearly flat
              return (
                <motion.div
                  key={a.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: 0.35 + i * 0.08 }}
                  className="relative"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className="ai-card rounded-xl p-4 flex flex-col items-center gap-1.5 text-center relative overflow-hidden"
                    style={{ transform: `rotateY(${tilt}deg) translateZ(${Math.abs(i - 2) * -4}px)`, transformStyle: "preserve-3d" }}
                  >
                    {/* translucent chamber sheen — reads as a sealed volume, not a flat card */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(155deg, rgba(255,255,255,0.5), transparent 55%)" }}
                    />
                    <p className="relative text-sm font-semibold text-[var(--ai-ink)]">{a.name}</p>
                    <p className="relative text-xs text-[var(--ai-ink-faint)]">{a.buyers} Buyers</p>
                    <span className="relative ai-badge mt-1">
                      <Lock size={9} /> Private
                    </span>
                    <span className="relative ai-badge ai-badge-hot">{a.hot} Hot</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="ai-card-activated rounded-2xl p-6 max-w-sm mx-auto mt-14 text-center"
        >
          <p className="ai-eyebrow">Team Opportunities</p>
          <p className="ai-num font-ai-display font-bold text-4xl text-[var(--ai-accent)] mt-1">{TOTAL_HOT} Hot</p>
          <p className="text-[11px] text-[var(--ai-ink-faint)] mt-2 leading-relaxed">
            The owner sees opportunity counts. Agents keep their customer identities private.
          </p>
        </motion.div>

        <p className="text-center text-sm text-[var(--ai-ink-soft)] font-medium mt-8">
          Projects belong to the team. Customers stay with the agent.
        </p>
      </div>
    </section>
  );
}
