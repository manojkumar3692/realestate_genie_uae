"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const CLUSTERS = [
  { label: "Investors", size: "lg" },
  { label: "End Users", size: "lg" },
  { label: "1BR Buyers", size: "md" },
  { label: "Villa Buyers", size: "md" },
  { label: "Dubai South", size: "lg" },
  { label: "JVC", size: "sm" },
  { label: "AED 800K–1.2M", size: "md" },
  { label: "Payment Plan Sensitive", size: "sm" },
  { label: "Ready Property", size: "sm" },
  { label: "Off-Plan", size: "sm" },
] as const;

const SIZE_CLASS: Record<string, string> = {
  lg: "text-base md:text-lg px-6 py-3",
  md: "text-sm md:text-base px-5 py-2.5",
  sm: "text-xs md:text-sm px-4 py-2",
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useDormantField(count: number) {
  return useMemo(() => {
    const rng = mulberry32(4471);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rng() * 100,
      y: rng() * 100,
      delay: rng() * 0.8,
    }));
  }, [count]);
}

export default function DatabaseAlive() {
  const dots = useDormantField(90);

  return (
    <section className="relative ai-bg-ink py-24 md:py-32 overflow-hidden">
      {/* the dormant field — thousands of quiet records, represented abstractly */}
      <div className="absolute inset-0">
        {dots.map((d) => (
          <motion.span
            key={d.id}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.35 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: d.delay }}
            className="absolute w-1 h-1 rounded-full bg-[color:var(--ai-bg)]"
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
          />
        ))}
      </div>

      <div className="relative max-w-3xl mx-auto px-4 md:px-6 text-center mb-14">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="ai-num text-xs tracking-[0.2em] uppercase"
          style={{ color: "rgba(246,243,236,0.4)" }}
        >
          10,000 dormant buyer records
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-ai-display font-semibold uppercase text-3xl md:text-[2.5rem] tracking-tight text-[var(--ai-bg)] mt-4"
        >
          Your database should <span style={{ color: "#8B7FFF" }}>think</span> with you.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base mt-4"
          style={{ color: "rgba(246,243,236,0.6)" }}
        >
          Every project changes who matters.
        </motion.p>
      </div>

      <div className="relative max-w-3xl mx-auto px-4 md:px-6 flex flex-wrap items-center justify-center gap-3 md:gap-3.5">
        {CLUSTERS.map((c, i) => (
          <motion.span
            key={c.label}
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: 0.3 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-full font-medium whitespace-nowrap ${SIZE_CLASS[c.size]}`}
            style={{ background: "rgba(139,127,255,0.14)", color: "#C9C2FF", border: "1px solid rgba(139,127,255,0.3)" }}
          >
            {c.label}
          </motion.span>
        ))}
      </div>
    </section>
  );
}
