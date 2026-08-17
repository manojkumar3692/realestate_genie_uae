"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Line } from "@react-three/drei";
import * as THREE from "three";

const LEAD_COUNT = 70;
const HIGHLIGHT_COUNT = 8;

function randomInSphere(radius: number): [number, number, number] {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random() * 0.6 + 0.4);
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)];
}

function LeadNodes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const nodes = useMemo(
    () =>
      Array.from({ length: LEAD_COUNT }, (_, i) => ({
        pos: randomInSphere(3.1),
        phase: Math.random() * Math.PI * 2,
        highlighted: i < HIGHLIGHT_COUNT,
      })),
    []
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    nodes.forEach((n, i) => {
      const bob = Math.sin(t * 0.6 + n.phase) * 0.12;
      dummy.position.set(n.pos[0], n.pos[1] + bob, n.pos[2]);
      const scale = n.highlighted ? 1.6 : 1;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, new THREE.Color(n.highlighted ? (i % 2 === 0 ? "#6D5EF5" : "#22D3EE") : "#C9C6D8"));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, LEAD_COUNT]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial roughness={0.4} metalness={0.1} />
      </instancedMesh>
      {nodes
        .filter((n) => n.highlighted)
        .map((n, i) => (
          <Line key={i} points={[[0, 0, 0], n.pos]} color={i % 2 === 0 ? "#6D5EF5" : "#22D3EE"} lineWidth={1} transparent opacity={0.35} />
        ))}
    </>
  );
}

function CentralNode() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.25;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
  });
  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color="#6D5EF5" emissive="#6D5EF5" emissiveIntensity={0.5} roughness={0.25} metalness={0.4} />
      </mesh>
      <mesh scale={1.18}>
        <icosahedronGeometry args={[0.75, 1]} />
        <meshBasicMaterial color="#22D3EE" wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function Scene() {
  const sceneGroup = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!sceneGroup.current) return;
    sceneGroup.current.rotation.y = state.clock.elapsedTime * 0.08;
  });

  return (
    <>
      <ambientLight intensity={0.18} />
      <pointLight position={[4, 3, 4]} intensity={45} color="#7C6FFF" />
      <pointLight position={[-4, -2, 3]} intensity={30} color="#2DE2E6" />
      <hemisphereLight args={["#2a2450", "#06050b", 0.25]} />
      <group ref={sceneGroup}>
        <CentralNode />
        <LeadNodes />
      </group>
      <Sparkles count={140} scale={7.5} size={3} speed={0.25} color="#C9C1FF" opacity={0.85} />
    </>
  );
}

/** Genuine 3D centerpiece for the hero — desktop only (see HeroVisual.tsx, which lazy-mounts this
 *  behind a viewport check + prefers-reduced-motion check and shows a lightweight 2D fallback on
 *  mobile / when the user has reduced motion). Kept in its own client-only file so its bundle
 *  (three.js + fiber + drei) is never sent to a visitor who won't use it. */
export default function Hero3DScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6.5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Scene />
    </Canvas>
  );
}
