"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import HeroVisualFallback from "./HeroVisualFallback";

// The 3D scene pulls in three.js + fiber + drei — only fetch that bundle for visitors who'll
// actually see it (desktop, motion allowed). next/dynamic + ssr:false keeps it out of both the
// server render and the initial mobile bundle entirely.
const Hero3DScene = dynamic(() => import("./Hero3DScene"), { ssr: false, loading: () => null });

/**
 * Mobile-first: renders the lightweight 2D fallback by default (matches the SSR output, so no
 * hydration mismatch) and only upgrades to the full 3D scene once we've confirmed, client-side,
 * that the viewport is wide enough and the user hasn't asked for reduced motion.
 */
export default function HeroVisual() {
  const [show3D, setShow3D] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const widthQuery = window.matchMedia("(min-width: 768px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(motionQuery.matches);
      setShow3D(widthQuery.matches && !motionQuery.matches);
    };
    update();
    widthQuery.addEventListener("change", update);
    motionQuery.addEventListener("change", update);
    return () => {
      widthQuery.removeEventListener("change", update);
      motionQuery.removeEventListener("change", update);
    };
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[460px] mx-auto md:mx-0">
      {show3D ? (
        <div className="absolute inset-0">
          <Hero3DScene />
        </div>
      ) : (
        <HeroVisualFallback animate={!reducedMotion} />
      )}
    </div>
  );
}
