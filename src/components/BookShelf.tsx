"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Html, useCursor } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CanvasTexture,
  Group,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { easing } from "maath";
import { createCoverCanvas } from "@/lib/coverTexture";
import { useBookTransition } from "@/context/BookTransitionContext";
import type { AlbumMeta } from "@/lib/albums";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BOOK_W = 0.85; // cover width  (x)
const BOOK_H = 1.15; // cover height (y)
const BOOK_D = 0.05; // spine depth  (z)
const GAP = 0.22; // space between books

/* ------------------------------------------------------------------ */
/*  Single book — cover facing camera (+z)                             */
/* ------------------------------------------------------------------ */

function ShelfBook({
  album,
  position,
  baseRotationY,
  onNavigate,
}: {
  album: AlbumMeta;
  position: [number, number, number];
  baseRotationY: number;
  onNavigate: (slug: string) => void;
}) {
  const groupRef = useRef<Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [coverTex, setCoverTex] = useState<CanvasTexture | null>(null);
  useCursor(hovered);

  // Generate styled cover texture (matches PhotoBook cover exactly)
  useEffect(() => {
    let cancelled = false;
    createCoverCanvas(album.title, album.coverImage || null, 512, 682).then(
      (canvas) => {
        if (cancelled) return;
        const tex = new CanvasTexture(canvas);
        tex.colorSpace = SRGBColorSpace;
        setCoverTex(tex);
      }
    );
    return () => { cancelled = true; };
  }, [album.title, album.coverImage]);

  // BoxGeometry(width, height, depth) → faces: [+x, -x, +y, -y, +z, -z]
  // +z = front cover, -z = back cover, ±x = spine edges, ±y = top/bottom
  const materials = useMemo(() => {
    const spine = new MeshStandardMaterial({
      color: "#1a1a1a",
      roughness: 0.5,
    });
    const pages = new MeshStandardMaterial({
      color: "#f5f0e8",
      roughness: 0.9,
    });
    const cover = new MeshStandardMaterial({
      map: coverTex,
      roughness: 0.35,
    });
    const back = new MeshStandardMaterial({
      color: "#222",
      roughness: 0.5,
    });
    return [spine, spine, pages, pages, cover, back];
  }, [coverTex]);

  // Hover: lift up + slight tilt
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetY = hovered ? position[1] + 0.08 : position[1];
    const targetRotX = hovered ? -0.06 : 0;
    const targetRotY = hovered ? baseRotationY - 0.05 : baseRotationY;
    easing.damp(groupRef.current.position, "y", targetY, 0.12, delta);
    easing.damp(groupRef.current.rotation, "x", targetRotX, 0.12, delta);
    easing.damp(groupRef.current.rotation, "y", targetRotY, 0.12, delta);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, baseRotationY, 0]}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onNavigate(album.slug);
      }}
    >
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[BOOK_W, BOOK_H, BOOK_D]} />
      </mesh>

      {/* Always-visible title label */}
      <Html
        position={[0, -BOOK_H / 2 - 0.14, 0]}
        center
        distanceFactor={4}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`whitespace-nowrap text-center transition-all duration-200 ${
            hovered ? "opacity-100 scale-105" : "opacity-70"
          }`}
        >
          <p className="text-[10px] uppercase tracking-widest text-black/70 font-light">
            {album.title}
          </p>
          <p className="text-[8px] text-black/30 mt-0.5">
            {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
          </p>
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Shelf / table surface                                              */
/* ------------------------------------------------------------------ */

function DisplaySurface({ width }: { width: number }) {
  return (
    <mesh
      position={[0, -BOOK_H / 2 - 0.025, 0]}
      receiveShadow
      castShadow
    >
      <boxGeometry args={[width + 1.2, 0.035, 1.2]} />
      <meshStandardMaterial color="#d4c4a8" roughness={0.75} metalness={0.0} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

function Scene({ albums, onNavigate }: { albums: AlbumMeta[]; onNavigate: (slug: string) => void }) {
  const count = albums.length;
  const totalWidth = count * (BOOK_W + GAP) - GAP;
  const startX = -totalWidth / 2 + BOOK_W / 2;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[2, 5, 4]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />
      <Environment preset="studio" />

      {/* Books displayed cover-out */}
      {albums.map((album, i) => {
        const x = startX + i * (BOOK_W + GAP);
        // Subtle fan: books at edges angle slightly inward
        const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0; // -1 to 1
        const rotY = t * 0.08;
        return (
          <ShelfBook
            key={album.id}
            album={album}
            position={[x, 0, 0]}
            baseRotationY={rotY}
            onNavigate={onNavigate}
          />
        );
      })}

      {/* Display surface */}
      <DisplaySurface width={totalWidth} />

      {/* Shadow catcher */}
      <mesh
        position={[0, -BOOK_H / 2 - 0.045, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.06} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported component                                                 */
/* ------------------------------------------------------------------ */

export default function BookShelf({ albums }: { albums: AlbumMeta[] }) {
  const router = useRouter();
  const { fadeOut } = useBookTransition();
  const navigatingRef = useRef(false);

  const handleNavigate = (slug: string) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;

    fadeOut(() => {
      router.push(`/photos/${slug}`);
    });
  };

  return (
    <div className="relative w-full h-[70vh] md:h-[80vh]">
      <Canvas
        shadows
        camera={{
          position: [0, 0.3, 3.2],
          fov: 38,
        }}
        style={{ background: "#fafafa" }}
      >
        <Suspense fallback={null}>
          <Scene albums={albums} onNavigate={handleNavigate} />
        </Suspense>
      </Canvas>
    </div>
  );
}
