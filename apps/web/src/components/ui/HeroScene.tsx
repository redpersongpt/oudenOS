"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════
   OUDEN HERO — Premium 3D Scene

   A chrome open ring (the Ouden mark) with volumetric particles,
   subtle mouse-reactive camera, rim lighting, and depth-of-field feel.
   No cheap Float/bounce. Smooth, cinematic, Apple-grade.
   ═══════════════════════════════════════════════════════════════════════ */

// ── Mouse-reactive camera ───────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  // Track mouse relative to viewport center
  if (typeof window !== "undefined") {
    if (!(window as unknown as Record<string, boolean>).__oudenMouseInit) {
      (window as unknown as Record<string, boolean>).__oudenMouseInit = true;
      window.addEventListener("mousemove", (e) => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      });
    }
  }

  useFrame(() => {
    // Smooth lerp toward mouse position
    target.current.x += (mouse.current.x * 0.4 - target.current.x) * 0.02;
    target.current.y += (mouse.current.y * 0.3 - target.current.y) * 0.02;
    camera.position.x = target.current.x;
    camera.position.y = target.current.y + 0.3;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ── The Ring — chrome open torus, slow elegant rotation ─────────────────
function Ring() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Open torus — 88% of full circle
  const geometry = useMemo(
    () => new THREE.TorusGeometry(2, 0.12, 64, 200, Math.PI * 1.76),
    [],
  );

  // Larger torus for subtle glow/bloom effect
  const glowGeo = useMemo(
    () => new THREE.TorusGeometry(2, 0.35, 32, 100, Math.PI * 1.76),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Ultra-slow, cinematic Y rotation — NO wobble, NO bounce
    groupRef.current.rotation.y = t * 0.08;
    // Very subtle tilt breathing
    groupRef.current.rotation.x = 0.15 + Math.sin(t * 0.15) * 0.03;
    groupRef.current.rotation.z = Math.sin(t * 0.1) * 0.02;
  });

  return (
    <group ref={groupRef}>
      {/* Glow layer — soft bloom around the ring */}
      <mesh ref={glowRef} geometry={glowGeo}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.015}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Main ring — brushed chrome */}
      <mesh ref={ringRef} geometry={geometry}>
        <meshPhysicalMaterial
          color="#d4d4d4"
          roughness={0.08}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          reflectivity={1}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Accent sphere at gap terminus */}
      <mesh ref={dotRef} position={[1.72, -0.92, 0]}>
        <sphereGeometry args={[0.1, 64, 64]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.02}
          metalness={1}
          clearcoat={1}
          emissive="#ffffff"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// ── Particle field — tiny specks that drift, not orbit ──────────────────
function DustField({ count = 300 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      // Distribute in a wide sphere, biased toward the ring plane
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 5;
      arr.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: (r * Math.sin(phi) * Math.sin(theta)) * 0.4, // flatten Y
        z: r * Math.cos(phi),
        size: 0.005 + Math.random() * 0.015,
        drift: 0.02 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
        brightness: 0.15 + Math.random() * 0.6,
      });
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.drift + p.phase) * 0.15,
        p.y + Math.cos(t * p.drift * 0.7 + p.phase) * 0.1,
        p.z + Math.sin(t * p.drift * 0.5) * 0.08,
      );
      // Subtle twinkle
      const twinkle = 0.7 + Math.sin(t * 2 + p.phase) * 0.3;
      dummy.scale.setScalar(p.size * twinkle);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
    </instancedMesh>
  );
}

// ── Orbital lines — thin wireframe circles around the ring ──────────────
function OrbitalLines() {
  const ref1 = useRef<THREE.LineLoop>(null);
  const ref2 = useRef<THREE.LineLoop>(null);
  const ref3 = useRef<THREE.LineLoop>(null);

  const circle = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref1.current) {
      ref1.current.rotation.x = 0.8 + Math.sin(t * 0.05) * 0.02;
      ref1.current.rotation.y = t * 0.03;
    }
    if (ref2.current) {
      ref2.current.rotation.x = 1.2;
      ref2.current.rotation.y = t * 0.02 + 1;
    }
    if (ref3.current) {
      ref3.current.rotation.x = 0.4;
      ref3.current.rotation.z = t * 0.015 + 2;
    }
  });

  return (
    <>
      <lineLoop ref={ref1} geometry={circle} scale={3.2}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.04} />
      </lineLoop>
      <lineLoop ref={ref2} geometry={circle} scale={3.8}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.025} />
      </lineLoop>
      <lineLoop ref={ref3} geometry={circle} scale={4.5}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.015} />
      </lineLoop>
    </>
  );
}

// ── Lighting rig — cinematic 3-point + rim ──────────────────────────────
function Lighting() {
  return (
    <>
      {/* Key light — warm white from upper right */}
      <directionalLight position={[4, 3, 5]} intensity={1.2} color="#ffffff" />
      {/* Fill — cool dim from left */}
      <directionalLight position={[-4, 1, 3]} intensity={0.4} color="#b0b0b0" />
      {/* Rim/back light — strong from behind for edge highlights */}
      <directionalLight position={[0, 2, -5]} intensity={0.8} color="#ffffff" />
      {/* Bottom fill — very subtle */}
      <directionalLight position={[0, -3, 2]} intensity={0.15} color="#888888" />
      {/* Ambient — keep shadows from going pure black */}
      <ambientLight intensity={0.12} />
    </>
  );
}

// ── Exported scene ──────────────────────────────────────────────────────
export function HeroScene() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="h-[420px] w-[420px] sm:h-[460px] sm:w-[460px] lg:h-[500px] lg:w-[500px] xl:h-[550px] xl:w-[550px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: hovered ? "grab" : "default" }}
    >
      <Canvas
        camera={{ position: [0, 0.3, 5.5], fov: 40 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <Lighting />
        <CameraRig />
        <Ring />
        <DustField count={250} />
        <OrbitalLines />
      </Canvas>
    </div>
  );
}
