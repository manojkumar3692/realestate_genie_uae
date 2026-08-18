"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const MUTED = Array.from({ length: 16 }, (_, i) => i);
const ILLUMINATED = [
  { pct: "94%", x: 18, y: 30 },
  { pct: "91%", x: 78, y: 22 },
  { pct: "88%", x: 32, y: 74 },
  { pct: "96%", x: 68, y: 68 },
];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function FinalCTA() {
  const rng = mulberry32(9931);
  const dots = MUTED.map((i) => ({ id: i, x: rng() * 100, y: rng() * 100 }));

  return (
    <section className="relative ai-bg py-24 md:py-32 overflow-hidden">
      <div className="ai-grid-bg absolute inset-0" />

      {/* the field, returning one last time */}
      <div className="absolute inset-0">
        {dots.map((d) => (
          <span key={d.id} className="absolute w-1 h-1 rounded-full bg-[var(--ai-ink-ghost)]" style={{ left: `${d.x}%`, top: `${d.y}%` }} />
        ))}
        {ILLUMINATED.map((c, i) => (
          <motion.span
            key={c.pct}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.25 }}
            className="ai-num absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold ai-card-activated rounded-full px-3 py-1.5"
            style={{ left: `${c.x}%`, top: `${c.y}%`, color: "var(--ai-accent)" }}
          >
            {c.pct}
          </motion.span>
        ))}
      </div>

      <div className="relative max-w-xl mx-auto px-4 md:px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="font-ai-display font-semibold uppercase text-3xl md:text-[2.75rem] tracking-tight leading-tight text-[var(--ai-ink)]"
        >
          Who&apos;s hiding in <span className="ai-mark">your database?</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 1.05 }}
          className="text-[var(--ai-ink-soft)] text-base mt-4"
        >
          Upload your old leads. We&apos;ll help you find who matters for the next project.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mt-8"
        >
          <Link href="/signup?plan=individual" className="ai-btn-primary">
            Find My Buyers
          </Link>
          <a href="#how-it-works" className="ai-btn-secondary">
            See The Demo
          </a>
        </motion.div>
      </div>
    </section>
  );
}
