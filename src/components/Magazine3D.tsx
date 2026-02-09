"use client";

import { useRef, Suspense, useCallback, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ── Shared constants ──
const COVER_W = 2;
const COVER_H = 2.8;
const COVER_D = 0.02;
const PAGE_W = 1.96;
const PAGE_H = 2.75;
const PAGE_D = 0.005;
const BOOK_DEPTH = 0.12;
// Shared page-white for all inside faces and edges (no grey seams)
const PAGE_COLOR = "#f5f3ee";
const EDGE_COLOR = PAGE_COLOR;

// Helper: load texture with no colour-space conversion so pixels stay untouched
function useColorTexture(src?: string) {
  const texture = src ? useLoader(THREE.TextureLoader, src) : null;
  if (texture) {
    texture.colorSpace = THREE.LinearSRGBColorSpace;
  }
  return texture;
}

// ── Texture-mapped spine ──
function Spine({ spineTexture }: { spineTexture?: string }) {
  const texture = useColorTexture(spineTexture);

  const materials = useMemo(() => {
    const edge = new THREE.MeshBasicMaterial({ color: PAGE_COLOR });
    const face = new THREE.MeshBasicMaterial({
      map: texture || undefined,
      color: texture ? "#ffffff" : PAGE_COLOR,
    });
    // +x, -x, +y, -y, +z, -z  →  -x faces outward
    return [edge, face, edge, edge, edge, edge];
  }, [texture]);

  return (
    <mesh position={[-(COVER_W / 2), 0, 0]} material={materials}>
      <boxGeometry args={[COVER_D, COVER_H, BOOK_DEPTH]} />
    </mesh>
  );
}

// ── Texture-mapped front cover ──
function FrontCover({ coverTexture }: { coverTexture?: string }) {
  const texture = useColorTexture(coverTexture);

  const materials = useMemo(() => {
    const edge = new THREE.MeshBasicMaterial({ color: PAGE_COLOR });
    const outside = new THREE.MeshBasicMaterial({
      map: texture || undefined,
      color: "#ffffff",
    });
    const inside = new THREE.MeshBasicMaterial({ color: PAGE_COLOR });
    // +x, -x, +y, -y, +z (outside), -z (inside)
    return [edge, edge, edge, edge, outside, inside];
  }, [texture]);

  return (
    <mesh material={materials}>
      <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
    </mesh>
  );
}

// ── Texture-mapped back cover ──
function BackCover({ coverTexture }: { coverTexture?: string }) {
  const texture = useColorTexture(coverTexture);

  const materials = useMemo(() => {
    const edge = new THREE.MeshBasicMaterial({ color: PAGE_COLOR });
    const inside = new THREE.MeshBasicMaterial({ color: PAGE_COLOR });
    const outside = new THREE.MeshBasicMaterial({
      map: texture || undefined,
      color: texture ? "#ffffff" : "#f0f0f0",
    });
    // +z inside, -z outside
    return [edge, edge, edge, edge, inside, outside];
  }, [texture]);

  return (
    <mesh position={[0, 0, -(BOOK_DEPTH / 2 - COVER_D / 2)]} material={materials}>
      <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
    </mesh>
  );
}

// ── Page block – individual sheets stacked to look like real pages ──
const NUM_PAGES = 20;

function PageBlock() {
  // Available depth between the two covers
  const innerDepth = BOOK_DEPTH - COVER_D * 2;
  const pageThickness = innerDepth / NUM_PAGES;

  // Slightly off-white tones so adjacent pages are distinguishable
  const pageColors = useMemo(
    () =>
      Array.from({ length: NUM_PAGES }, (_, i) => {
        const shade = i % 2 === 0 ? "#ffffff" : "#f7f5f0";
        return new THREE.MeshBasicMaterial({ color: shade });
      }),
    []
  );

  // Edge material – very faint warm grey so page edges are visible
  const edgeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#eae6df" }),
    []
  );

  return (
    <group>
      {pageColors.map((faceMat, i) => {
        // z position: start just inside back cover, stack toward front
        const z =
          -(BOOK_DEPTH / 2) +
          COVER_D +
          pageThickness / 2 +
          i * pageThickness;

        // Each page is very slightly smaller than the one behind it
        // so the edges peek out, like a real page stack
        const inset = i * 0.001;
        const w = PAGE_W - inset;
        const h = PAGE_H - inset;

        // Per-face materials: top/bottom/right edges visible, front & back are page face
        // +x, -x, +y, -y, +z (front face), -z (back face)
        const mats = [edgeMat, edgeMat, edgeMat, edgeMat, faceMat, faceMat];

        return (
          <mesh key={i} position={[0, 0, z]} material={mats}>
            <boxGeometry args={[w, h, pageThickness * 0.85]} />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Main interactive magazine ──
function RotatingMagazine({
  frontCover,
  backCover,
  spineCover,
  holdProgress,
  onHoldStart,
  onHoldEnd,
}: {
  frontCover?: string;
  backCover?: string;
  spineCover?: string;
  holdProgress: number;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}) {
  const wholeRef = useRef<THREE.Group>(null);

  const smoothRotSpeed = useRef(0.5);
  // Store the rotation snapshot when hold starts so we can lerp back to 0
  const rotationSnapshot = useRef<number | null>(null);

  useFrame((_, delta) => {
    if (!wholeRef.current) return;

    const isHolding = holdProgress > 0;

    if (isHolding) {
      // Capture snapshot on first hold frame
      if (rotationSnapshot.current === null) {
        rotationSnapshot.current = wholeRef.current.rotation.y;
      }

      // Normalize target to nearest multiple of 2PI (front-facing)
      const snap = rotationSnapshot.current;
      const target = Math.round(snap / (Math.PI * 2)) * (Math.PI * 2);

      // Lerp toward the front-facing angle
      wholeRef.current.rotation.y +=
        (target - wholeRef.current.rotation.y) * Math.min(delta * 5, 1);

      smoothRotSpeed.current = 0;
    } else {
      // Reset snapshot when released
      rotationSnapshot.current = null;

      // Smoothly ramp rotation speed back up
      const targetSpeed = 0.5;
      smoothRotSpeed.current +=
        (targetSpeed - smoothRotSpeed.current) * Math.min(delta * 4, 1);

      wholeRef.current.rotation.y += delta * smoothRotSpeed.current;
    }
  });

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation: () => void }).stopPropagation();
      onHoldStart?.();
    },
    [onHoldStart]
  );

  const handlePointerUp = useCallback(() => {
    onHoldEnd?.();
  }, [onHoldEnd]);

  const spineX = -(COVER_W / 2);

  return (
    <group
      ref={wholeRef}
      position={[0, 0, 0]}
      scale={0.85}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
        onHoldEnd?.();
      }}
    >
      {/* Spine */}
      <Suspense
        fallback={
          <mesh position={[spineX, 0, 0]}>
            <boxGeometry args={[COVER_D, COVER_H, BOOK_DEPTH]} />
            <meshBasicMaterial color={PAGE_COLOR} />
          </mesh>
        }
      >
        <Spine spineTexture={spineCover} />
      </Suspense>

      {/* Back cover */}
      <Suspense
        fallback={
          <mesh position={[0, 0, -(BOOK_DEPTH / 2 - COVER_D / 2)]}>
            <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
            <meshBasicMaterial color="#f0f0f0" />
          </mesh>
        }
      >
        <BackCover coverTexture={backCover} />
      </Suspense>

      {/* Inner pages */}
      <PageBlock />

      {/* Front cover */}
      <group
        position={[spineX + COVER_D / 2, 0, BOOK_DEPTH / 2 - COVER_D / 2]}
      >
        <Suspense
          fallback={
            <mesh position={[COVER_W / 2, 0, 0]}>
              <boxGeometry args={[COVER_W, COVER_H, COVER_D]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          }
        >
          <group position={[COVER_W / 2, 0, 0]}>
            <FrontCover coverTexture={frontCover} />
          </group>
        </Suspense>
      </group>
    </group>
  );
}

// ── Scene wrapper ──
function MagazineScene({
  frontCover,
  backCover,
  spineCover,
  holdProgress,
  onHoldStart,
  onHoldEnd,
}: {
  frontCover?: string;
  backCover?: string;
  spineCover?: string;
  holdProgress: number;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}) {
  return (
    <>
      <RotatingMagazine
        frontCover={frontCover}
        backCover={backCover}
        spineCover={spineCover}
        holdProgress={holdProgress}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
      />

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

// ── Public component ──
export default function Magazine3D({
  frontCover,
  backCover,
  spineCover,
  holdProgress = 0,
  onHoldStart,
  onHoldEnd,
}: {
  frontCover?: string;
  backCover?: string;
  spineCover?: string;
  holdProgress?: number;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}) {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.NoToneMapping,
        outputColorSpace: THREE.LinearSRGBColorSpace,
      }}
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ width: "100%", height: "100%" }}
    >
      <MagazineScene
        frontCover={frontCover}
        backCover={backCover}
        spineCover={spineCover}
        holdProgress={holdProgress}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
      />
    </Canvas>
  );
}
