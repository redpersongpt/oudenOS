"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/* ---------- Open Torus Ring (Ouden logo in 3D) ---------- */

function OudenRing() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    // Arc from 0 to ~310 degrees, leaving a visible gap
    return new THREE.TorusGeometry(1.8, 0.15, 32, 100, Math.PI * 1.72);
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.1 + 0.3;
    meshRef.current.rotation.y += 0.003;
    meshRef.current.rotation.z =
      Math.cos(state.clock.elapsedTime * 0.2) * 0.05;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#E8E8E8"
          roughness={0.15}
          metalness={0.9}
          emissive="#ffffff"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Dot at the end of the ring (mirrors the logo mark) */}
      <mesh position={[1.55, -0.85, 0]}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.1}
          metalness={0.95}
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </mesh>
    </Float>
  );
}

/* ---------- Floating particles orbiting the ring ---------- */

interface ParticleData {
  position: [number, number, number];
  scale: number;
  speed: number;
  offset: number;
}

function Particles({ count = 150 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo<ParticleData[]>(() => {
    const temp: ParticleData[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 3;
      temp.push({
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ],
        scale: 0.01 + Math.random() * 0.03,
        speed: 0.1 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      const t = state.clock.elapsedTime * p.speed + p.offset;
      dummy.position.set(
        p.position[0] + Math.sin(t) * 0.2,
        p.position[1] + Math.cos(t * 0.7) * 0.2,
        p.position[2] + Math.sin(t * 0.5) * 0.1,
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
    </instancedMesh>
  );
}

/* ---------- Subtle ground grid ---------- */

function GridFloor() {
  return (
    <gridHelper
      args={[20, 20, "#1a1a1a", "#111111"]}
      position={[0, -3, 0]}
    />
  );
}

/* ---------- Exported scene wrapper ---------- */

export function HeroScene() {
  return (
    <div className="h-[420px] w-[420px] sm:h-[460px] sm:w-[460px] lg:h-[500px] lg:w-[500px] xl:h-[550px] xl:w-[550px]">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={0.8}
          color="#ffffff"
        />
        <directionalLight
          position={[-3, -2, -5]}
          intensity={0.3}
          color="#666666"
        />
        <pointLight position={[0, 0, 3]} intensity={0.5} color="#ffffff" />

        <OudenRing />
        <Particles count={150} />
        <GridFloor />
      </Canvas>
    </div>
  );
}
