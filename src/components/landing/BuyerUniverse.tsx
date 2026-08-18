"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BuyerDataField from "./BuyerDataField";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * THE BUYER UNIVERSE — the site's signature 3D moment.
 *
 * A scroll-scrubbed WebGL scene: a flattened architectural field of ~1,200 historical buyer
 * signals (InstancedMesh — one draw call, not DOM), a modelled project that arrives as an
 * "intelligence gravity" source, buyers reorganizing into Possible/Warm/Hot shells around it,
 * and one buyer (Ahmed) travelling out of the field toward the camera to become the 94% match
 * card. Camera position and every particle's matrix are driven by refs read inside useFrame —
 * scroll progress never triggers a React re-render, only a handful of discrete "phase" state
 * changes (headline visible / project visible / layers visible / card expanded) do.
 *
 * Mobile and prefers-reduced-motion never mount the Canvas at all — they get the existing
 * lightweight CSS/framer-motion BuyerDataField, which tells the same story without WebGL.
 */

const COUNT = 1200;
const HOT_COUNT = 42;
const WARM_COUNT = 118;
const POSSIBLE_COUNT = 187;
const HOT_R = 2.0;
const WARM_R = 3.3;
const POSSIBLE_R = 4.9;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tier = "hot" | "warm" | "possible" | "weak";

type Particle = {
  dir: THREE.Vector3;
  baseRadius: number;
  tier: Tier;
  phase: number;
  scale: number;
};

function tierShellRadius(tier: Tier) {
  if (tier === "hot") return HOT_R;
  if (tier === "warm") return WARM_R;
  if (tier === "possible") return POSSIBLE_R;
  return 0; // weak has no shell — computed relative to its own base radius instead
}

function buildParticles(): { all: Particle[]; ahmedIndex: number } {
  const rng = mulberry32(77241);
  const all: Particle[] = [];
  for (let i = 0; i < COUNT; i++) {
    const tier: Tier = i < HOT_COUNT ? "hot" : i < HOT_COUNT + WARM_COUNT ? "warm" : i < HOT_COUNT + WARM_COUNT + POSSIBLE_COUNT ? "possible" : "weak";
    const theta = rng() * Math.PI * 2;
    const r = 2.6 + Math.cbrt(rng()) * 7.2;
    const dir = new THREE.Vector3(Math.cos(theta), (rng() - 0.5) * 0.9, Math.sin(theta)).normalize();
    all.push({ dir, baseRadius: r, tier, phase: rng() * Math.PI * 2, scale: 0.75 + rng() * 0.5 });
  }
  return { all, ahmedIndex: 0 };
}

const NEUTRAL = new THREE.Color("#BDB6A2");
const WEAK_FADED = new THREE.Color("#E4DFCF");
const HOT_COLOR = new THREE.Color("#3626D9");
const WARM_COLOR = new THREE.Color("#8B7FEF");
const POSSIBLE_COLOR = new THREE.Color("#CFC9F7");

function tierColor(tier: Tier) {
  if (tier === "hot") return HOT_COLOR;
  if (tier === "warm") return WARM_COLOR;
  if (tier === "possible") return POSSIBLE_COLOR;
  return WEAK_FADED;
}

function particlePosition(p: Particle, progress: number, time: number): THREE.Vector3 {
  const reorganize = smoothstep(0.5, 0.78, progress);
  const bob = Math.sin(time * 0.35 + p.phase) * 0.08;
  if (p.tier === "weak") {
    const recede = smoothstep(0.5, 0.85, progress);
    const radius = p.baseRadius * (1 + recede * 0.5);
    return p.dir.clone().multiplyScalar(radius).add(new THREE.Vector3(0, bob, 0));
  }
  const targetRadius = tierShellRadius(p.tier);
  const radius = THREE.MathUtils.lerp(p.baseRadius, targetRadius, reorganize);
  return p.dir.clone().multiplyScalar(radius).add(new THREE.Vector3(0, bob * (1 - reorganize * 0.6), 0));
}

/* ---------------------------------------------------------------------- */
/* The modelled project — an abstracted architectural massing, not an icon */
/* ---------------------------------------------------------------------- */

function ProjectModel({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useFrame((state) => {
    const p = progressRef.current;
    const arrive = smoothstep(0.2, 0.34, p);
    if (groupRef.current) {
      groupRef.current.scale.setScalar(arrive);
      groupRef.current.position.y = (1 - arrive) * -0.6;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.06;
    }
    if (labelRef.current) {
      const labelOpacity = smoothstep(0.26, 0.36, p) * (1 - smoothstep(0.9, 0.98, p));
      labelRef.current.style.opacity = String(labelOpacity);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* landscape disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.04, 40]} />
        <meshStandardMaterial color="#EDE8DB" roughness={0.9} metalness={0} />
      </mesh>
      {/* two thin roads crossing the landscape */}
      <Line points={[[-1.5, -0.11, 0], [1.5, -0.11, 0]]} color="#C9C2AC" lineWidth={1} transparent opacity={0.7} />
      <Line points={[[0, -0.11, -1.5], [0, -0.11, 1.5]]} color="#C9C2AC" lineWidth={1} transparent opacity={0.7} />
      {/* podium */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.1, 0.18, 0.85]} />
        <meshStandardMaterial color="#F6F3EC" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* tower massing — two stacked boxes for a subtle taper */}
      <mesh position={[0.15, 0.85, 0]}>
        <boxGeometry args={[0.46, 1.4, 0.46]} />
        <meshStandardMaterial color="#FBFAF6" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0.15, 1.66, 0]}>
        <boxGeometry args={[0.32, 0.24, 0.32]} />
        <meshStandardMaterial color="#FBFAF6" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* accent trim marking the brand */}
      <mesh position={[0.15, 1.8, 0]}>
        <boxGeometry args={[0.34, 0.03, 0.34]} />
        <meshBasicMaterial color="#3626D9" toneMapped={false} />
      </mesh>

      <Html position={[0.9, 1.1, 0]} transform distanceFactor={7} occlude={false} style={{ pointerEvents: "none" }}>
        <div ref={labelRef} className="ai-card-activated rounded-xl px-4 py-3 w-[190px]" style={{ opacity: 0 }}>
          <p className="ai-eyebrow">New Project</p>
          <p className="font-ai-display font-semibold text-[13px] text-[var(--ai-ink)] mt-0.5">Dubai South</p>
          <div className="mt-1.5 pt-1.5 border-t border-[var(--ai-border)] text-[10.5px] text-[var(--ai-ink-soft)] leading-snug">
            1BR from AED 995K
            <br />
            20% Down · Off-Plan · Investment
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* The buyer field — one InstancedMesh draw call for the whole crowd       */
/* ---------------------------------------------------------------------- */

function BuyerField({ progressRef, particles, ahmedIndex }: { progressRef: React.MutableRefObject<number>; particles: Particle[]; ahmedIndex: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const p = progressRef.current;
    const t = state.clock.elapsedTime;
    const reorganize = smoothstep(0.5, 0.78, p);
    for (let i = 0; i < particles.length; i++) {
      if (i === ahmedIndex) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const particle = particles[i];
      const pos = particlePosition(particle, p, t);
      dummy.position.copy(pos);
      const fade = particle.tier === "weak" ? 1 - smoothstep(0.7, 0.95, p) * 0.55 : 1;
      dummy.scale.setScalar(particle.scale * fade);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.copy(NEUTRAL).lerp(tierColor(particle.tier), reorganize);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]} frustumCulled={false}>
      <sphereGeometry args={[0.045, 6, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/* ---------------------------------------------------------------------- */
/* Ahmed — the one buyer that leaves the field and becomes the match card  */
/* ---------------------------------------------------------------------- */

function AhmedTraveler({
  progressRef,
  particle,
  expanded,
  setExpanded,
}: {
  progressRef: React.MutableRefObject<number>;
  particle: Particle;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const markerRef = useRef<THREE.Mesh>(null);
  const markerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const revealPos = useMemo(() => new THREE.Vector3(0.35, 0.55, 2.5), []);
  const organizedPos = useMemo(() => particle.dir.clone().multiplyScalar(HOT_R), [particle]);

  useFrame((state) => {
    const p = progressRef.current;
    const t = state.clock.elapsedTime;
    const reorganize = smoothstep(0.5, 0.78, p);
    const bob = Math.sin(t * 0.35 + particle.phase) * 0.08 * (1 - reorganize * 0.6);
    const fieldPos = particle.dir
      .clone()
      .multiplyScalar(THREE.MathUtils.lerp(particle.baseRadius, HOT_R, reorganize))
      .add(new THREE.Vector3(0, bob, 0));
    const travel = smoothstep(0.78, 0.94, p);
    const finalPos = fieldPos.clone().lerp(revealPos, travel);

    if (groupRef.current) groupRef.current.position.copy(finalPos);

    const markerScale = particle.scale * (1 - smoothstep(0.75, 0.9, p));
    if (markerRef.current) markerRef.current.scale.setScalar(Math.max(0.0001, markerScale));
    if (markerMatRef.current) {
      const c = new THREE.Color().copy(NEUTRAL).lerp(HOT_COLOR, reorganize);
      markerMatRef.current.color.copy(c);
    }

    if (cardWrapRef.current) {
      const cardOpacity = smoothstep(0.8, 0.93, p);
      cardWrapRef.current.style.opacity = String(cardOpacity);
    }

    setExpanded(p > 0.9);
  });

  return (
    <group ref={groupRef} position={organizedPos}>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial ref={markerMatRef} toneMapped={false} />
      </mesh>
      <Html transform distanceFactor={6} occlude={false} style={{ pointerEvents: "none" }} position={[0, 0, 0]}>
        <div ref={cardWrapRef} style={{ opacity: 0 }}>
          {expanded ? (
            <div className="ai-card-activated rounded-2xl p-5 w-[260px]">
              <div className="flex items-start justify-between">
                <p className="font-ai-display font-semibold text-[var(--ai-ink)] text-base">Ahmed Khan</p>
                <div className="text-right">
                  <p className="ai-num font-ai-display font-bold text-2xl text-[var(--ai-accent)] leading-none">94%</p>
                  <p className="ai-eyebrow text-[9px] mt-0.5">Strong Match</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10.5px]">
                <div>
                  <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9px]">Budget</p>
                  <p className="text-[var(--ai-ink)] font-medium">AED 900K–1.1M</p>
                </div>
                <div>
                  <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9px]">Property</p>
                  <p className="text-[var(--ai-ink)] font-medium">1BR</p>
                </div>
                <div>
                  <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9px]">Intent</p>
                  <p className="text-[var(--ai-ink)] font-medium">Investment</p>
                </div>
                <div>
                  <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9px]">Location</p>
                  <p className="text-[var(--ai-ink)] font-medium">Dubai South</p>
                </div>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-[var(--ai-border)]">
                <p className="text-[var(--ai-ink-faint)] uppercase tracking-wide text-[9px]">Previous Objection</p>
                <p className="text-[var(--ai-ink-soft)] text-[10.5px] italic mt-0.5">&ldquo;High initial payment.&rdquo;</p>
              </div>
              <div className="mt-2">
                <p className="ai-eyebrow text-[9px]">Why Now?</p>
                <p className="text-[var(--ai-ink)] text-[10.5px] leading-snug mt-0.5">
                  Ahmed previously rejected a similar investment over the upfront payment. This project&apos;s 20% initial payment directly
                  addresses that objection.
                </p>
              </div>
            </div>
          ) : (
            <div className="ai-card-activated rounded-lg px-3 py-2 w-[150px]">
              <p className="text-[11px] font-semibold text-[var(--ai-ink)]">Ahmed</p>
              <p className="text-[9.5px] text-[var(--ai-ink-faint)]">AED 900K · JVC</p>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

/* ---------------------------------------------------------------------- */
/* Shell layer labels — Possible / Warm / Hot                              */
/* ---------------------------------------------------------------------- */

const SHELL_LABELS: { tier: Tier; label: string; count: number; pos: [number, number, number] }[] = [
  { tier: "possible", label: "Possible", count: POSSIBLE_COUNT, pos: [-3.6, 1.6, 2.3] },
  { tier: "warm", label: "Warm", count: WARM_COUNT, pos: [2.6, -1.1, 1.9] },
  { tier: "hot", label: "Hot", count: HOT_COUNT, pos: [-1.3, 1.3, 1.5] },
];

function ShellLabel({ progressRef, def }: { progressRef: React.MutableRefObject<number>; def: (typeof SHELL_LABELS)[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const p = progressRef.current;
    if (ref.current) {
      const opacity = smoothstep(0.58, 0.68, p) * (1 - smoothstep(0.9, 0.98, p));
      ref.current.style.opacity = String(opacity);
    }
  });
  return (
    <Html position={def.pos} transform distanceFactor={9} occlude={false} style={{ pointerEvents: "none" }}>
      <div ref={ref} className="ai-badge" style={{ opacity: 0 }}>
        {def.label} · {def.count}
      </div>
    </Html>
  );
}

/* ---------------------------------------------------------------------- */
/* Camera rig — scroll-driven position with a touch of mouse parallax      */
/* ---------------------------------------------------------------------- */

const CAM_KEYFRAMES: { p: number; pos: [number, number, number] }[] = [
  { p: 0, pos: [0, 3.1, 14.5] },
  { p: 0.32, pos: [0.4, 2.1, 8.8] },
  { p: 0.6, pos: [1.3, 1.5, 6.2] },
  { p: 0.85, pos: [0.5, 0.9, 3.6] },
  { p: 1, pos: [0.2, 0.55, 2.75] },
];

function sampleCamera(p: number): THREE.Vector3 {
  for (let i = 0; i < CAM_KEYFRAMES.length - 1; i++) {
    const a = CAM_KEYFRAMES[i];
    const b = CAM_KEYFRAMES[i + 1];
    if (p >= a.p && p <= b.p) {
      const local = b.p === a.p ? 0 : (p - a.p) / (b.p - a.p);
      return new THREE.Vector3(...a.pos).lerp(new THREE.Vector3(...b.pos), smoothstep(0, 1, local));
    }
  }
  return new THREE.Vector3(...CAM_KEYFRAMES[CAM_KEYFRAMES.length - 1].pos);
}

function CameraRig({ progressRef, mouseRef }: { progressRef: React.MutableRefObject<number>; mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    const p = progressRef.current;
    const target = sampleCamera(p);
    target.x += mouseRef.current.x * 0.35;
    target.y += mouseRef.current.y * 0.2;
    camera.position.lerp(target, 0.09);
    const lookAhead = smoothstep(0.75, 1, p);
    lookTarget.lerp(new THREE.Vector3(0.3 * lookAhead, 0.3 * lookAhead, 0), 0.08);
    camera.lookAt(lookTarget);
  });

  return null;
}

/* ---------------------------------------------------------------------- */
/* Scene assembly                                                          */
/* ---------------------------------------------------------------------- */

function Scene({ progressRef, mouseRef }: { progressRef: React.MutableRefObject<number>; mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const { all: particles, ahmedIndex } = useMemo(buildParticles, []);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <fog attach="fog" args={["#F6F3EC", 7, 17]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 6, 5]} intensity={0.9} color="#FFFDF7" />
      <hemisphereLight args={["#FFFFFF", "#EDE8DB", 0.5]} />
      <CameraRig progressRef={progressRef} mouseRef={mouseRef} />
      <ProjectModel progressRef={progressRef} />
      <BuyerField progressRef={progressRef} particles={particles} ahmedIndex={ahmedIndex} />
      <AhmedTraveler progressRef={progressRef} particle={particles[ahmedIndex]} expanded={expanded} setExpanded={setExpanded} />
      {SHELL_LABELS.map((def) => (
        <ShellLabel key={def.tier} progressRef={progressRef} def={def} />
      ))}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* Shared hero copy — rendered inside the phase-0 overlay (desktop) or in  */
/* normal flow above the fallback field (mobile / reduced motion)          */
/* ---------------------------------------------------------------------- */

function HeroCopy() {
  return (
    <div>
      <span className="ai-badge ai-badge-accent mb-6">AI Buyer Intelligence for Real Estate</span>
      <h1 className="font-ai-display font-semibold uppercase text-[var(--ai-ink)] text-[2.6rem] leading-[1.02] md:text-[3.4rem] lg:text-[3.75rem] md:leading-[0.98] tracking-tight">
        Your next buyer
        <br />
        may already be
        <br />
        <span className="ai-mark">in your old leads.</span>
      </h1>
      <p className="text-[var(--ai-ink-soft)] text-base md:text-lg mt-6 max-w-sm leading-relaxed">
        Upload your old leads. Add today&apos;s project. AI finds the buyers worth contacting again — and tells you why.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link href="/signup" className="ai-btn-primary">
          Find Buyers In My Leads
        </Link>
        <a href="#how-it-works" className="ai-btn-secondary">
          See It In Action
        </a>
      </div>
      <p className="text-[var(--ai-ink-faint)] text-[11px] mt-7 tracking-wide uppercase">
        CSV + Excel · No CRM migration · Your leads stay private
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Outer component — decides WebGL vs fallback, owns the GSAP pin          */
/* ---------------------------------------------------------------------- */

export default function BuyerUniverse() {
  const [ready, setReady] = useState<"pending" | "webgl" | "fallback">("pending");
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const analyzingRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 900px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let hasWebgl = false;
    try {
      const canvas = document.createElement("canvas");
      hasWebgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      hasWebgl = false;
    }
    const update = () => setReady(mqMobile.matches || mqMotion.matches || !hasWebgl ? "fallback" : "webgl");
    update();
    mqMobile.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqMobile.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (ready !== "webgl") return;
    const ctx = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        pin: pinRef.current,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          if (headlineRef.current) headlineRef.current.style.opacity = String(1 - smoothstep(0.02, 0.14, self.progress));
          if (counterRef.current) counterRef.current.style.opacity = String(1 - smoothstep(0.2, 0.32, self.progress));
          if (analyzingRef.current) {
            const o = smoothstep(0.38, 0.46, self.progress) * (1 - smoothstep(0.54, 0.6, self.progress));
            analyzingRef.current.style.opacity = String(o);
          }
        },
      });
      return () => st.kill();
    });

    function onMove(e: MouseEvent) {
      mouseRef.current = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: -(e.clientY / window.innerHeight - 0.5) * 2 };
    }
    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("mousemove", onMove);
      ctx.revert();
    };
  }, [ready]);

  if (ready === "pending") {
    return <section className="relative ai-bg min-h-[70vh]" />;
  }

  if (ready === "fallback") {
    return (
      <section className="relative ai-bg overflow-hidden">
        <div className="ai-grid-bg absolute inset-0" />
        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 pt-14 pb-16 grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-5 relative z-10">
            <HeroCopy />
          </div>
          <div className="md:col-span-7 relative">
            <BuyerDataField />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: "340vh" }}>
      <div ref={pinRef} className="relative h-screen w-full overflow-hidden ai-bg">
        <div className="ai-grid-bg absolute inset-0" />
        <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }} camera={{ fov: 42, position: [0, 3.1, 14.5] }}>
          <Scene progressRef={progressRef} mouseRef={mouseRef} />
        </Canvas>

        {/* phase-0 overlay: the campaign headline, fades as the camera pushes into the field */}
        <div ref={headlineRef} className="absolute inset-0 pointer-events-none">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-full flex items-center">
            <div className="max-w-md pointer-events-auto">
              <HeroCopy />
            </div>
          </div>
        </div>

        {/* running counter, top corner */}
        <div ref={counterRef} className="absolute top-24 right-6 md:right-10 z-20">
          <p className="ai-num text-[11px] font-bold tracking-wide text-[var(--ai-ink)] bg-white/85 border border-[var(--ai-border)] rounded-full px-3.5 py-1.5 backdrop-blur-sm whitespace-nowrap">
            10,482 Historical Buyers
          </p>
        </div>

        <div ref={analyzingRef} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20" style={{ opacity: 0 }}>
          <p className="ai-num text-[11px] font-bold tracking-wide text-[var(--ai-accent)] bg-white/85 border border-[var(--ai-border)] rounded-full px-3.5 py-1.5 backdrop-blur-sm whitespace-nowrap">
            Analyzing 10,482 Buyers
          </p>
        </div>
      </div>
    </section>
  );
}
