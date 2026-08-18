"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * The hero's spatial intelligence scene. A field of historical buyer records — mostly quiet and
 * faded, a handful carrying real signal — through which a new project moves and pulls the right
 * buyers forward. This is not decoration: every motion in this component maps to a step of the
 * product story (field of dormant data -> project enters -> AI scans -> matches rise -> one buyer
 * explained). Pure CSS/DOM + framer-motion by design — no WebGL — so it stays light on mobile and
 * degrades cleanly under prefers-reduced-motion.
 */

type Buyer = { name: string; budget: string; loc: string; tag: string };

const AHMED: Buyer = { name: "Ahmed", budget: "AED 900K", loc: "JVC", tag: "Investor" };

const POOL: Buyer[] = [
  AHMED,
  { name: "Sarah", budget: "AED 2.2M", loc: "Villa", tag: "End User" },
  { name: "Mohammed", budget: "1BR", loc: "Dubai South", tag: "Payment Plan" },
  { name: "Ravi", budget: "AED 1.1M", loc: "Arjan", tag: "Investor" },
  { name: "Priya", budget: "AED 750K", loc: "JVC", tag: "End User" },
  { name: "Layla", budget: "AED 980K", loc: "Dubai South", tag: "Payment Plan" },
  { name: "Faisal", budget: "AED 1.6M", loc: "Arjan", tag: "End User" },
  { name: "Nadia", budget: "AED 620K", loc: "JVC", tag: "Investor" },
  { name: "Karan", budget: "AED 2.0M", loc: "Villa", tag: "End User" },
  { name: "Fatima", budget: "AED 890K", loc: "Dubai South", tag: "Investor" },
  { name: "Yousef", budget: "AED 1.3M", loc: "Arjan", tag: "Payment Plan" },
  { name: "Meera", budget: "AED 700K", loc: "JVC", tag: "End User" },
  { name: "Tariq", budget: "AED 1.05M", loc: "Dubai South", tag: "Investor" },
  { name: "Aisha", budget: "AED 1.8M", loc: "Villa", tag: "End User" },
  { name: "Rohan", budget: "AED 950K", loc: "Arjan", tag: "Investor" },
  { name: "Zainab", budget: "AED 1.2M", loc: "JVC", tag: "Payment Plan" },
  { name: "Imran", budget: "AED 830K", loc: "Dubai South", tag: "End User" },
  { name: "Divya", budget: "AED 1.5M", loc: "Villa", tag: "Investor" },
  { name: "Salim", budget: "AED 990K", loc: "Arjan", tag: "End User" },
  { name: "Neha", budget: "AED 720K", loc: "JVC", tag: "Investor" },
  { name: "Khalid", budget: "AED 1.1M", loc: "Dubai South", tag: "Payment Plan" },
  { name: "Pooja", budget: "AED 1.35M", loc: "Villa", tag: "End User" },
  { name: "Rashid", budget: "AED 940K", loc: "Arjan", tag: "Investor" },
];

// Indices in POOL treated as "signal" — the buyers the new project actually activates.
const SIGNAL_INDICES = [0, 2, 5, 9, 12, 20];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Placed = Buyer & { id: number; x: number; y: number; depth: number; rotate: number; signal: boolean };

function layout(pool: Buyer[], count: number): Placed[] {
  const rng = mulberry32(20260817);
  return pool.slice(0, count).map((b, i) => {
    const angle = rng() * Math.PI * 2;
    const radius = 22 + rng() * 40;
    const x = 50 + Math.cos(angle) * radius * (0.75 + rng() * 0.4);
    const y = 50 + Math.sin(angle) * radius * (0.6 + rng() * 0.4);
    return {
      ...b,
      id: i,
      x: Math.min(96, Math.max(4, x)),
      y: Math.min(94, Math.max(8, y)),
      depth: rng(),
      rotate: (rng() - 0.5) * 6,
      signal: SIGNAL_INDICES.includes(i),
    };
  });
}

const STAGE_DURATIONS = [2600, 1600, 2200, 2200, 3800];
const COUNTER_BY_STAGE = ["10,482 LEADS ANALYZED", "10,482 LEADS ANALYZED", "347 POTENTIAL BUYERS", "42 HIGH-INTENT MATCHES", "42 HIGH-INTENT MATCHES"];

export default function BuyerDataField() {
  const [compact, setCompact] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [stage, setStage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 767px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setCompact(mqMobile.matches);
      setAnimated(!mqMotion.matches);
    };
    update();
    mqMobile.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!animated) {
      setStage(4);
      return;
    }
    const timer = setTimeout(() => setStage((s) => (s + 1) % STAGE_DURATIONS.length), STAGE_DURATIONS[stage]);
    return () => clearTimeout(timer);
  }, [stage, animated]);

  const cards = useMemo(() => layout(POOL, compact ? 12 : 24), [compact]);

  // Mouse-driven parallax tilt of the whole field — subtle, disabled off reduced-motion/mobile.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 60, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 60, damping: 18 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!animated || compact || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  const projectVisible = stage >= 1;
  const scanning = stage === 2;
  const rising = stage === 3;
  const focused = stage === 4;

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative w-full aspect-[4/5] md:aspect-[1/1] select-none"
      style={{ perspective: 1400 }}
      aria-hidden="true"
    >
      <motion.div className="absolute inset-0" style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        {/* signal lines — only drawn while actively scanning */}
        {!compact && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <AnimatePresence>
              {scanning &&
                cards
                  .filter((c) => c.signal)
                  .map((c) => (
                    <motion.line
                      key={c.id}
                      x1={50}
                      y1={50}
                      x2={c.x}
                      y2={c.y}
                      stroke="var(--ai-accent-line)"
                      strokeWidth={0.18}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ))}
            </AnimatePresence>
          </svg>
        )}

        {cards.map((c) => {
          const isAhmedHero = c.id === 0;
          if (isAhmedHero && focused) return null; // morphs into the big card below via layoutId
          const receded = !c.signal && (scanning || rising);
          const activated = c.signal && (rising || focused);
          const depth = receded ? Math.min(1, c.depth + 0.25) : activated ? Math.max(0, c.depth - 0.35) : c.depth;
          const opacity = activated ? 0.98 : receded ? 0.16 : 0.82 - depth * 0.42;
          const blur = activated ? 0 : receded ? 3.4 : depth * 2.6;
          const scale = (activated ? 1.12 : 1) * (1 - depth * 0.4);

          return (
            <motion.div
              key={c.id}
              layoutId={isAhmedHero ? "ahmed-card" : undefined}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${animated && !compact ? "ai-float" : ""}`}
              style={{ left: `${c.x}%`, top: `${c.y}%`, zIndex: activated ? 30 : Math.round((1 - depth) * 10) }}
              animate={{ opacity, scale, rotate: activated ? 0 : c.rotate, filter: `blur(${blur}px)` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={`rounded-lg px-3 py-2 text-[10.5px] leading-tight whitespace-nowrap ${
                  activated ? "ai-card-activated" : "bg-white/80 border border-[var(--ai-border)]"
                }`}
              >
                <p className="font-semibold text-[var(--ai-ink)]">{c.name}</p>
                <p className="text-[var(--ai-ink-faint)]">
                  {c.budget} · {c.loc}
                </p>
                {activated && <p className="ai-eyebrow mt-0.5 text-[9px]">{c.tag}</p>}
              </div>
            </motion.div>
          );
        })}

        {/* the incoming project */}
        <AnimatePresence>
          {projectVisible && (
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
              initial={{ opacity: 0, scale: 0.85, y: -12 }}
              animate={{ opacity: focused ? 0.16 : 1, scale: focused ? 0.9 : 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ai-card-activated rounded-xl px-5 py-4 w-[190px] md:w-[210px]">
                <p className="ai-eyebrow">Dubai South</p>
                <p className="font-ai-display font-semibold text-[var(--ai-ink)] text-sm mt-0.5">The Residences</p>
                <div className="mt-2 pt-2 border-t border-[var(--ai-border)] flex flex-col gap-0.5 text-[10.5px] text-[var(--ai-ink-soft)]">
                  <span>1BR from AED 995K</span>
                  <span>20% Down · Off-Plan</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ahmed's focus card — morphs from his small field card via shared layoutId */}
        <AnimatePresence>
          {focused && (
            <motion.div
              layoutId="ahmed-card"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[260px] md:w-[300px]"
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ai-card-activated rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <p className="font-ai-display font-semibold text-[var(--ai-ink)] text-base">Ahmed Khan</p>
                  <div className="text-right">
                    <p className="ai-num font-ai-display font-bold text-2xl text-[var(--ai-accent)] leading-none">94</p>
                    <p className="ai-eyebrow text-[9px]">Match Score</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                  <div>
                    <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9.5px]">Budget</p>
                    <p className="text-[var(--ai-ink)] font-medium">AED 900K–1.1M</p>
                  </div>
                  <div>
                    <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9.5px]">Property</p>
                    <p className="text-[var(--ai-ink)] font-medium">1BR</p>
                  </div>
                  <div>
                    <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9.5px]">Intent</p>
                    <p className="text-[var(--ai-ink)] font-medium">Investment</p>
                  </div>
                  <div>
                    <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9.5px]">Location</p>
                    <p className="text-[var(--ai-ink)] font-medium">Dubai South</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--ai-border)]">
                  <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9.5px]">Previous Objection</p>
                  <p className="text-[var(--ai-ink-soft)] text-[11px] italic mt-0.5">&ldquo;High upfront payment.&rdquo;</p>
                </div>
                <div className="mt-2">
                  <p className="ai-eyebrow text-[9.5px]">Why Now?</p>
                  <p className="text-[var(--ai-ink)] text-[11px] leading-snug mt-0.5">
                    This project&apos;s lower initial payment solves Ahmed&apos;s previous objection.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* running counter */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50">
        <AnimatePresence mode="wait">
          <motion.p
            key={COUNTER_BY_STAGE[stage]}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="ai-num text-[11px] font-bold tracking-wide text-[var(--ai-ink)] bg-white/85 border border-[var(--ai-border)] rounded-full px-3.5 py-1.5 backdrop-blur-sm whitespace-nowrap"
          >
            {COUNTER_BY_STAGE[stage]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
