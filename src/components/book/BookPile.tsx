"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  Group,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { easing } from "maath";
import { createCoverCanvas } from "@/lib/coverTexture";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BOOK_W = 1.28;
const BOOK_H = 1.71;
const BOOK_D = 0.12;
const STACK_GAP = 0.008;

const SLIDE_OFF_X = 3.0; // how far the outgoing book slides
const SLIDE_DURATION_MS = 400;

export const CAMERA_PILE = { x: 0, y: 3.0, z: 2.0 };
export const CAMERA_PILE_LOOK_AT = { x: 0, y: -1.5, z: 0 };

/* ------------------------------------------------------------------ */
/*  Cover texture cache                                                */
/* ------------------------------------------------------------------ */

const coverTexCache = new Map<string, CanvasTexture>();

async function getCoverTexture(
  title: string,
  coverUrl: string | null,
  key: string,
  date?: string | null
): Promise<CanvasTexture> {
  if (coverTexCache.has(key)) return coverTexCache.get(key)!;
  const canvas = await createCoverCanvas(title, coverUrl, 512, 683, date);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  coverTexCache.set(key, tex);
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Single book in the pile                                            */
/* ------------------------------------------------------------------ */

function PileBook({
  title,
  coverUrl,
  slug,
  date,
  stackIndex,
  displayIndex,
  total,
  isSliding,
  slideDirection,
  fadeOut,
  onClick,
}: {
  title: string;
  coverUrl: string;
  slug: string;
  date?: string | null;
  stackIndex: number;
  displayIndex: number;
  total: number;
  isSliding: boolean;
  slideDirection: number;
  fadeOut: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<Group>(null!);
  const [coverTex, setCoverTex] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    getCoverTexture(title, coverUrl, slug, date).then(setCoverTex);
  }, [title, coverUrl, slug, date]);

  const relativeIndex = ((stackIndex - displayIndex) % total + total) % total;
  const isTop = relativeIndex === 0;
  const isSlidingOut = isTop && isSliding;

  // Track when this book transitions from "sliding off" to "repositioned in stack"
  const wasSlidingRef = useRef(false);

  useEffect(() => {
    if (isSlidingOut) {
      wasSlidingRef.current = true;
    }
  }, [isSlidingOut]);

  const targetY = -relativeIndex * (BOOK_D + STACK_GAP);

  // Deterministic offsets for realism – large enough to see as a pile from the top-down camera.
  // The offsets need to be noticeable so lower books peek out on both narrow and wide viewports.
  const restX = useMemo(() => Math.sin(stackIndex * 1.7) * 0.18, [stackIndex]);
  const restZ = useMemo(() => Math.cos(stackIndex * 2.3) * 0.15, [stackIndex]);
  const restRotY = useMemo(() => Math.sin(stackIndex * 0.9) * 0.18, [stackIndex]);

  // Sliding out book gets a big X offset; otherwise use rest position
  const targetX = isSlidingOut ? slideDirection * SLIDE_OFF_X : restX;

  const emphasisY = isTop && !isSlidingOut ? 0.02 : 0;
  const finalY = targetY + emphasisY;

  // Opacity targets – sliding book stays fully visible (it exits off-screen instead)
  const baseOpacity = isTop ? 1.0 : Math.max(0.25, 1 - relativeIndex * 0.2);
  const targetOpacity = fadeOut ? 0 : baseOpacity;

  const bodyMatRef = useRef<MeshStandardMaterial>(null!);
  const coverMatRef = useRef<MeshStandardMaterial>(null!);
  const spineMatRef = useRef<MeshStandardMaterial>(null!);
  const pageEdgeMatRef = useRef<MeshStandardMaterial>(null!);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // When this book just finished sliding off-screen and got repositioned,
    // snap it to its new stack position so it doesn't ease back from off-screen
    if (wasSlidingRef.current && !isSlidingOut) {
      wasSlidingRef.current = false;
      meshRef.current.position.set(restX, finalY, restZ);
      meshRef.current.rotation.y = restRotY;
      for (const ref of [bodyMatRef, coverMatRef, spineMatRef, pageEdgeMatRef]) {
        if (ref.current) ref.current.opacity = 0;
      }
      return;
    }

    const xEase = isSlidingOut ? 0.1 : 0.25;
    easing.damp(meshRef.current.position, "x", targetX, xEase, delta);
    easing.damp(meshRef.current.position, "y", finalY, 0.2, delta);
    easing.damp(meshRef.current.position, "z", restZ, 0.3, delta);
    easing.dampAngle(meshRef.current.rotation, "y", restRotY, 0.3, delta);

    for (const ref of [bodyMatRef, coverMatRef, spineMatRef, pageEdgeMatRef]) {
      if (ref.current) {
        easing.damp(ref.current, "opacity", targetOpacity, 0.15, delta);
      }
    }
  });

  const spineColor = useMemo(() => {
    const colors = ["#2a1a0a", "#1a1a2a", "#1a2a1a", "#2a1a1a", "#1a1a1a"];
    return colors[stackIndex % colors.length];
  }, [stackIndex]);

  return (
    <group ref={meshRef} position={[restX, finalY, restZ]}>
      <mesh onClick={isTop && !fadeOut && !isSliding ? onClick : undefined} castShadow receiveShadow>
        <boxGeometry args={[BOOK_W, BOOK_D, BOOK_H]} />
        <meshStandardMaterial ref={bodyMatRef} color={spineColor} roughness={0.8} transparent opacity={targetOpacity} />
      </mesh>

      <mesh position={[-BOOK_W / 2 - 0.002, 0, 0]}>
        <boxGeometry args={[0.004, BOOK_D + 0.002, BOOK_H]} />
        <meshStandardMaterial ref={spineMatRef} color={spineColor} roughness={0.6} transparent opacity={targetOpacity} />
      </mesh>

      {coverTex && (
        <mesh position={[0, BOOK_D / 2 + 0.001, 0]} rotation-x={-Math.PI / 2} onClick={isTop && !fadeOut && !isSliding ? onClick : undefined}>
          <planeGeometry args={[BOOK_W - 0.02, BOOK_H - 0.02]} />
          <meshStandardMaterial ref={coverMatRef} map={coverTex} roughness={0.5} transparent opacity={targetOpacity} />
        </mesh>
      )}

      <mesh position={[BOOK_W / 2 + 0.002, 0, 0]}>
        <boxGeometry args={[0.004, BOOK_D * 0.85, BOOK_H * 0.95]} />
        <meshStandardMaterial ref={pageEdgeMatRef} color="#f5f0e8" roughness={1} transparent opacity={targetOpacity} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  BookPile                                                           */
/* ------------------------------------------------------------------ */

export default function BookPile({
  albums,
  activeIndex,
  opening,
  onSelect,
  onActiveIndexChange,
}: {
  albums: { title: string; coverImage: string; slug: string; date?: string | null }[];
  activeIndex: number;
  opening: boolean;
  onSelect: (index: number) => void;
  onActiveIndexChange: (index: number) => void;
}) {
  const groupRef = useRef<Group>(null!);
  const total = albums.length;

  // Internal display index that lags behind activeIndex during slide animation
  const [displayIndex, setDisplayIndex] = useState(activeIndex);
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState(0);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect when activeIndex changes from parent and trigger slide animation
  useEffect(() => {
    if (activeIndex === displayIndex) return;
    if (sliding) {
      // If already sliding, commit immediately and start new slide
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    }

    // Determine direction
    const diff = activeIndex - displayIndex;
    const dir = diff > 0 ? 1 : -1;

    setSliding(true);
    setSlideDir(dir);

    // After slide duration, commit the new index
    slideTimerRef.current = setTimeout(() => {
      setDisplayIndex(activeIndex);
      setSliding(false);
      setSlideDir(0);
    }, SLIDE_DURATION_MS);

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cycling functions that go through parent
  const cycleNext = useCallback(() => {
    if (sliding) return; // ignore during animation
    onActiveIndexChange((activeIndex + 1) % total);
  }, [sliding, activeIndex, total, onActiveIndexChange]);

  const cyclePrev = useCallback(() => {
    if (sliding) return;
    onActiveIndexChange((activeIndex - 1 + total) % total);
  }, [sliding, activeIndex, total, onActiveIndexChange]);

  // Keyboard cycling
  useEffect(() => {
    if (opening) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") cycleNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") cyclePrev();
      if (e.key === "Enter") onSelect(activeIndex);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opening, cycleNext, cyclePrev, onSelect, activeIndex]);

  const { size, viewport } = useThree();
  const aspect = size.width / size.height;

  // On wide viewports the pile appears tiny because fov is vertical and
  // there's lots of horizontal space.  Pull the camera closer along the
  // *same* viewing axis (preserving the top-down angle) so the pile
  // fills a reasonable portion of the screen.
  const pileCam = useMemo(() => {
    // t ramps 0→1 as aspect goes from 1 (square) → 2.5 (ultra-wide)
    const t = Math.max(0, Math.min(1, (aspect - 1) / 1.5));
    // Scale factor: 1.0 at narrow, down to 0.7 at ultra-wide (i.e. 30% closer)
    const s = 1 - t * 0.3;
    return {
      x: CAMERA_PILE.x,
      y: CAMERA_PILE_LOOK_AT.y + (CAMERA_PILE.y - CAMERA_PILE_LOOK_AT.y) * s,
      z: CAMERA_PILE_LOOK_AT.z + (CAMERA_PILE.z - CAMERA_PILE_LOOK_AT.z) * s,
    };
  }, [aspect]);

  // Only control camera when NOT opening
  useFrame(({ camera }, delta) => {
    if (opening) return;
    easing.damp(camera.position, "x", pileCam.x, 0.3, delta);
    easing.damp(camera.position, "y", pileCam.y, 0.3, delta);
    easing.damp(camera.position, "z", pileCam.z, 0.3, delta);
    camera.lookAt(CAMERA_PILE_LOOK_AT.x, CAMERA_PILE_LOOK_AT.y, CAMERA_PILE_LOOK_AT.z);
  });

  const responsiveScale = useMemo(() => {
    const base = 1.6;
    const scale = Math.min(base, viewport.width / 3.2);
    return Math.max(0.75, scale);
  }, [viewport.width]);

  // The desk top surface sits at Y ≈ -1.76.  Books inside the group are
  // positioned relative to the group origin and then scaled.  At larger
  // scales the bottom books sink below the desk.  Compute a group Y that
  // keeps the lowest book sitting on (not inside) the desk.
  const groupY = useMemo(() => {
    const deskTop = -1.76;
    // Lowest book's local-space centre Y:
    const lowestLocalY = -(total - 1) * (BOOK_D + STACK_GAP);
    // Its bottom face in world = groupY + (lowestLocalY - BOOK_D/2) * scale
    // Solve for groupY so that bottom face = deskTop:
    const needed = deskTop - (lowestLocalY - BOOK_D / 2) * responsiveScale;
    // For a single album needed ≈ -1.66, but we don't want to float above
    // where it used to be, so cap at the original -1.7 (lower is more negative).
    return Math.max(-1.7, needed);
  }, [total, responsiveScale]);

  return (
    <group ref={groupRef} scale={responsiveScale} position-y={groupY}>
      {albums.map((album, i) => (
        <PileBook
          key={album.slug}
          title={album.title}
          coverUrl={album.coverImage}
          slug={album.slug}
          date={album.date}
          stackIndex={i}
          displayIndex={displayIndex}
          total={total}
          isSliding={sliding && ((i - displayIndex) % total + total) % total === 0}
          slideDirection={slideDir}
          fadeOut={opening}
          onClick={() => onSelect(i)}
        />
      ))}
    </group>
  );
}
