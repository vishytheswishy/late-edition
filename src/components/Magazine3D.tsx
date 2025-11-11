"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRouter } from "next/navigation";

function FrontCover({ coverTexture }: { coverTexture?: string }) {
  const texture = coverTexture 
    ? useLoader(THREE.TextureLoader, coverTexture)
    : null;

  return (
    <mesh position={[0, 0, 0.02]}>
      <boxGeometry args={[2, 2.8, 0.04]} />
      <meshStandardMaterial 
        map={texture || undefined}
        color="#ffffff"
      />
    </mesh>
  );
}

function BackCover({ coverTexture }: { coverTexture?: string }) {
  const texture = coverTexture 
    ? useLoader(THREE.TextureLoader, coverTexture)
    : null;

  return (
    <mesh position={[0, 0, -0.02]}>
      <boxGeometry args={[2, 2.8, 0.04]} />
      <meshStandardMaterial 
        map={texture || undefined}
        color="#f0f0f0"
      />
    </mesh>
  );
}

function RotatingMagazine({ frontCover, backCover }: { frontCover?: string; backCover?: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const router = useRouter();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // Rotate around Y axis
    }
  });

  const handleClick = () => {
    router.push("/articles");
  };

  return (
    <group 
      ref={meshRef} 
      position={[0, 0, 0]} 
      scale={0.85}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      {/* Front cover */}
      <Suspense fallback={
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[2, 2.8, 0.04]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      }>
        <FrontCover coverTexture={frontCover} />
      </Suspense>
      
      {/* Back cover */}
      <Suspense fallback={
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[2, 2.8, 0.04]} />
          <meshStandardMaterial color="#f0f0f0" />
        </mesh>
      }>
        <BackCover coverTexture={backCover} />
      </Suspense>
      
      {/* Pages (thin middle section) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.98, 2.78, 0.03]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Spine */}
      <mesh position={[-1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[2.8, 0.04, 0.03]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

function MagazineScene({ frontCover, backCover }: { frontCover?: string; backCover?: string }) {
  return (
    <>
      {/* Lighting - brighter */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, -5, -5]} intensity={1} />
      <directionalLight position={[0, 5, 0]} intensity={0.8} />
      
      <RotatingMagazine frontCover={frontCover} backCover={backCover} />
      
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.5}
      />
    </>
  );
}

export default function Magazine3D({ frontCover, backCover }: { frontCover?: string; backCover?: string }) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <MagazineScene frontCover={frontCover} backCover={backCover} />
    </Canvas>
  );
}

