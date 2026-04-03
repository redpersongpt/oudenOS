"use client";

import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════
   OUDEN HERO — Glowing open ring with environment reflections

   Key changes from v1:
   - Environment map for real reflections (not fake metalness)
   - Thicker ring with visible chrome surface
   - Bloom-style glow via additive transparent shells
   - Mouse parallax on the whole scene (not orbit)
   - Particles as sharp points, not blurry spheres
   ═══════════════════════════════════════════════════════════════════════ */

function useMouseParallax() {
  const mouse = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  const onMove = useCallback((e: MouseEvent) => {
    mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, []);

  if (typeof window !== "undefined") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMemo(() => {
      window.addEventListener("mousemove", onMove);
      return () => window.removeEventListener("mousemove", onMove);
    }, [onMove]);
  }

  return { mouse, smooth };
}

// ── The Ring — thick chrome torus with environment reflections ───────────
function ChromeRing() {
  const groupRef = useRef<THREE.Group>(null);
  const { mouse, smooth } = useMouseParallax();

  // Thicker ring — visible chrome surface
  const ringGeo = useMemo(
    () => new THREE.TorusGeometry(1.6, 0.22, 128, 256, Math.PI * 1.78),
    [],
  );

  // Glow shells — multiple additive layers
  const glowGeo1 = useMemo(
    () => new THREE.TorusGeometry(1.6, 0.5, 32, 128, Math.PI * 1.78),
    [],
  );
  const glowGeo2 = useMemo(
    () => new THREE.TorusGeometry(1.6, 0.9, 32, 128, Math.PI * 1.78),
    [],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Smooth mouse parallax
    smooth.current.x += (mouse.current.x - smooth.current.x) * 0.03;
    smooth.current.y += (mouse.current.y - smooth.current.y) * 0.03;

    // Scene rotation: slow Y spin + mouse tilt
    groupRef.current.rotation.y = t * 0.06 + smooth.current.x * 0.3;
    groupRef.current.rotation.x = 0.4 + smooth.current.y * 0.2;
    groupRef.current.rotation.z = Math.sin(t * 0.08) * 0.03;
  });

  return (
    <group ref={groupRef}>
      {/* Outer glow — very soft */}
      <mesh geometry={glowGeo2}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.008}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow */}
      <mesh geometry={glowGeo1}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Main chrome ring */}
      <mesh geometry={ringGeo}>
        <meshPhysicalMaterial
          color="#b8b8b8"
          roughness={0.05}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={0.02}
          envMapIntensity={2.5}
          reflectivity={1}
        />
      </mesh>

      {/* Accent dot — bright emissive sphere at gap end */}
      <mesh position={[1.36, -0.86, 0]}>
        <sphereGeometry args={[0.09, 64, 64]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0}
          metalness={1}
          emissive="#ffffff"
          emissiveIntensity={2}
          clearcoat={1}
        />
      </mesh>

      {/* Dot glow */}
      <mesh position={[1.36, -0.86, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// ── Point particles — sharp square points, not blurry spheres ───────────
function StarPoints({ count = 400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, sizes, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 6;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (r * Math.sin(phi) * Math.sin(theta)) * 0.5;
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = 0.5 + Math.random() * 2;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return [pos, sz, ph];
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // Slow rotation
    ref.current.rotation.y = t * 0.01;
    // Twinkle via material opacity
    const mat = ref.current.material as THREE.PointsMaterial;
    mat.opacity = 0.5 + Math.sin(t * 0.5) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={1.2}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ── Thin orbital rings — wireframe ──────────────────────────────────────
function Orbitals() {
  const g1 = useRef<THREE.Group>(null);
  const g2 = useRef<THREE.Group>(null);

  const circleGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (g1.current) {
      g1.current.rotation.x = 1.1;
      g1.current.rotation.y = t * 0.02;
    }
    if (g2.current) {
      g2.current.rotation.x = 0.6;
      g2.current.rotation.z = t * 0.015 + 1.5;
    }
  });

  return (
    <>
      <group ref={g1}>
        <lineLoop geometry={circleGeo} scale={2.8}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.06} />
        </lineLoop>
      </group>
      <group ref={g2}>
        <lineLoop geometry={circleGeo} scale={3.5}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.03} />
        </lineLoop>
      </group>
    </>
  );
}

// ── Lighting — studio setup ─────────────────────────────────────────────
function StudioLights() {
  return (
    <>
      {/* Key — strong from upper right */}
      <directionalLight position={[5, 4, 4]} intensity={2} color="#ffffff" />
      {/* Fill — softer from left */}
      <directionalLight position={[-4, 1, 3]} intensity={0.6} color="#e0e0e0" />
      {/* Rim — from behind for edge definition */}
      <directionalLight position={[0, 3, -6]} intensity={1.5} color="#ffffff" />
      {/* Under fill */}
      <directionalLight position={[0, -4, 2]} intensity={0.3} color="#999999" />
      <ambientLight intensity={0.08} />
    </>
  );
}

// ── Exported scene ──────────────────────────────────────────────────────
export function HeroScene() {
  return (
    <div className="h-[420px] w-[420px] sm:h-[460px] sm:w-[460px] lg:h-[500px] lg:w-[500px] xl:h-[550px] xl:w-[550px]">
      <Canvas
        camera={{ position: [0, 0.2, 4.8], fov: 38 }}
        style={{ background: "transparent" }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.4,
        }}
        dpr={[1, 2]}
      >
        <StudioLights />
        {/* Environment map — THIS is what makes chrome look real */}
        <Environment preset="city" environmentIntensity={0.8} />
        <ChromeRing />
        <StarPoints count={350} />
        <Orbitals />
      </Canvas>
    </div>
  );
}
