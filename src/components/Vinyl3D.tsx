"use client";

import { useRef, useMemo, useCallback, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ── Constants ──
const RECORD_RADIUS = 1.4;
const RECORD_THICKNESS = 0.018;
const LABEL_RADIUS = 0.45;
const SPINDLE_RADIUS = 0.035;
const SPINDLE_HEIGHT = 0.05;
const PLATTER_RADIUS = 1.5;
const PLATTER_THICKNESS = 0.035;
const BASE_W = 4.0;
const BASE_D = 3.4;
const BASE_H = 0.1;

// Colors — orange turntable
const VINYL_COLOR = "#1a1a1a";
const LABEL_COLOR = "#282828";
const PLATTER_COLOR = "#000000";
const BASE_COLOR = "#ff6b00";
const BASE_EDGE = "#e85f00";
const ARM_SILVER = "#b0b0b0";
const BTN_COLOR = "#ff9440";
const BTN_HOVER = "#ff8220";
const BTN_ACTIVE = "#ff7010";
const ACCENT = "#ff5500";

// ── Artwork label (separate component so Suspense can wrap it) ──
function ArtworkLabel({ url, y }: { url: string; y: number }) {
  const texture = useLoader(THREE.TextureLoader, url);
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <circleGeometry args={[LABEL_RADIUS, 64]} />
      <meshStandardMaterial map={texture} roughness={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Vinyl record with grooves ──
function VinylRecord({ artworkUrl }: { artworkUrl?: string }) {
  const grooves = useMemo(() => {
    const rings: { inner: number; outer: number }[] = [];
    for (let r = LABEL_RADIUS + 0.06; r < RECORD_RADIUS - 0.04; r += 0.055) {
      rings.push({ inner: r, outer: r + 0.018 });
    }
    return rings;
  }, []);

  const yDisc = PLATTER_THICKNESS + RECORD_THICKNESS / 2;
  const yTop = PLATTER_THICKNESS + RECORD_THICKNESS + 0.001;

  return (
    <group>
      <mesh position={[0, yDisc, 0]}>
        <cylinderGeometry args={[RECORD_RADIUS, RECORD_RADIUS, RECORD_THICKNESS, 64]} />
        <meshPhongMaterial
          color={VINYL_COLOR}
          specular="#ffffff"
          shininess={120}
        />
      </mesh>

      {grooves.map((g, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, yTop, 0]}>
          <ringGeometry args={[g.inner, g.outer, 64]} />
          <meshPhongMaterial
            color={i % 2 === 0 ? "#3a3a3a" : "#1a1a1a"}
            specular={i % 2 === 0 ? "#aaaaaa" : "#666666"}
            shininess={i % 2 === 0 ? 150 : 80}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Center label — artwork texture or plain color */}
      <Suspense
        fallback={
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yTop + 0.001, 0]}>
            <circleGeometry args={[LABEL_RADIUS, 64]} />
            <meshStandardMaterial color={LABEL_COLOR} roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
        }
      >
        {artworkUrl ? (
          <ArtworkLabel url={artworkUrl} y={yTop + 0.001} />
        ) : (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yTop + 0.001, 0]}>
            <circleGeometry args={[LABEL_RADIUS, 64]} />
            <meshStandardMaterial color={LABEL_COLOR} roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
        )}
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yTop + 0.002, 0]}>
        <ringGeometry args={[0.008, 0.03, 32]} />
        <meshStandardMaterial color="#000000" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Animated vinyl swap wrapper ──
// Phases: idle -> removeUp -> removeOut -> (swap) -> enterIn -> placeDown -> idle
type SwapPhase = "idle" | "removeUp" | "removeOut" | "enterIn" | "placeDown";

const SWAP_LIFT = 0.6;       // how high the record lifts before sliding
const SWAP_SLIDE = 3.5;      // how far right it slides off
const SWAP_TILT = 0.04;      // slight tilt while airborne
const ANIM_SPEED = 5;        // lerp speed for all phases

function setGroupOpacity(group: THREE.Group, opacity: number) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = opacity;
    }
  });
}

function AnimatedVinylRecord({
  artworkUrl,
  swapKey,
  onPlaced,
}: {
  artworkUrl?: string;
  swapKey: number;
  onPlaced?: () => void;
}) {
  const onPlacedRef = useRef(onPlaced);
  onPlacedRef.current = onPlaced;
  const groupRef = useRef<THREE.Group>(null);
  const phase = useRef<SwapPhase>("idle");
  // Animated values
  const posY = useRef(0);
  const posX = useRef(0);
  const tilt = useRef(0);
  const opacity = useRef(1);
  const [visibleArtwork, setVisibleArtwork] = useState(artworkUrl);
  const pendingArtwork = useRef(artworkUrl);
  const prevKey = useRef(swapKey);
  const isFirstMount = useRef(true);

  // Track the latest artworkUrl for when swap completes
  useEffect(() => {
    pendingArtwork.current = artworkUrl;
  }, [artworkUrl]);

  // Trigger animation when swapKey changes
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (swapKey > 0) {
        // First track ever: slide in from the left
        posX.current = -SWAP_SLIDE;
        posY.current = SWAP_LIFT;
        tilt.current = SWAP_TILT;
        opacity.current = 0;
        setVisibleArtwork(pendingArtwork.current);
        phase.current = "enterIn";
      }
      prevKey.current = swapKey;
      return;
    }

    if (swapKey !== prevKey.current) {
      prevKey.current = swapKey;
      phase.current = "removeUp";
    }
  }, [swapKey]);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    const lerp = Math.min(dt * ANIM_SPEED, 1);
    const p = phase.current;

    if (p === "removeUp") {
      // Lift the old record up off the platter
      posY.current += (SWAP_LIFT - posY.current) * lerp;
      tilt.current += (SWAP_TILT - tilt.current) * lerp;
      if (Math.abs(posY.current - SWAP_LIFT) < 0.01) {
        posY.current = SWAP_LIFT;
        phase.current = "removeOut";
      }
    } else if (p === "removeOut") {
      // Slide the old record off to the right and fade out
      posX.current += (SWAP_SLIDE - posX.current) * lerp;
      opacity.current += (0 - opacity.current) * lerp;
      if (Math.abs(posX.current - SWAP_SLIDE) < 0.05) {
        // Off-screen — swap to new artwork and bring in from the left
        posX.current = -SWAP_SLIDE;
        posY.current = SWAP_LIFT;
        opacity.current = 0;
        setVisibleArtwork(pendingArtwork.current);
        phase.current = "enterIn";
      }
    } else if (p === "enterIn") {
      // Slide the new record in from the left and fade in
      posX.current += (0 - posX.current) * lerp;
      opacity.current += (1 - opacity.current) * lerp;
      if (Math.abs(posX.current) < 0.05) {
        posX.current = 0;
        opacity.current = 1;
        phase.current = "placeDown";
      }
    } else if (p === "placeDown") {
      // Lower the new record onto the platter
      posY.current += (0 - posY.current) * lerp;
      tilt.current += (0 - tilt.current) * lerp;
      if (Math.abs(posY.current) < 0.005) {
        posY.current = 0;
        posX.current = 0;
        tilt.current = 0;
        opacity.current = 1;
        phase.current = "idle";
        onPlacedRef.current?.();
      }
    }
    // idle: everything stays at 0, opacity 1

    groupRef.current.position.y = posY.current;
    groupRef.current.position.x = posX.current;
    groupRef.current.rotation.z = tilt.current;
    setGroupOpacity(groupRef.current, opacity.current);
  });

  return (
    <group ref={groupRef}>
      <VinylRecord artworkUrl={visibleArtwork} />
    </group>
  );
}

// ── Platter ──
function Platter({
  isPlaying,
  artworkUrl,
  swapKey,
  onPlaced,
}: {
  isPlaying: boolean;
  artworkUrl?: string;
  swapKey: number;
  onPlaced?: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const speed = useRef(0);

  useFrame((_, dt) => {
    const target = isPlaying ? 1.2 : 0;
    speed.current += (target - speed.current) * Math.min(dt * 3, 1);
    if (ref.current) ref.current.rotation.y += dt * speed.current;
  });

  return (
    <group ref={ref}>
      <mesh position={[0, PLATTER_THICKNESS / 2, 0]}>
        <cylinderGeometry args={[PLATTER_RADIUS, PLATTER_RADIUS, PLATTER_THICKNESS, 64]} />
        <meshPhongMaterial color={PLATTER_COLOR} specular="#888888" shininess={100} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, PLATTER_THICKNESS + 0.001, 0]}>
        <circleGeometry args={[PLATTER_RADIUS - 0.06, 64]} />
        <meshPhongMaterial color="#111111" specular="#555555" shininess={60} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, PLATTER_THICKNESS + RECORD_THICKNESS + SPINDLE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[SPINDLE_RADIUS, SPINDLE_RADIUS, SPINDLE_HEIGHT, 16]} />
        <meshStandardMaterial color="#777777" roughness={0.3} metalness={0.55} />
      </mesh>

      <AnimatedVinylRecord artworkUrl={artworkUrl} swapKey={swapKey} onPlaced={onPlaced} />
    </group>
  );
}

// ── Tonearm ──
function Tonearm({ isPlaying }: { isPlaying: boolean }) {
  const armRef = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const playAngle = 0.32;
  const restAngle = 0;

  useFrame((_, dt) => {
    const target = isPlaying ? playAngle : restAngle;
    angle.current += (target - angle.current) * Math.min(dt * 3, 1);
    if (armRef.current) armRef.current.rotation.y = angle.current;
  });

  const armLen = 1.95;
  const tube = 0.022;
  const pivotY = BASE_H + 0.01;
  const armY = 0.14;

  return (
    <group position={[1.35, pivotY, 1.15]}>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.055, 0.07, 0.12, 16]} />
        <meshStandardMaterial color={ARM_SILVER} roughness={0.2} metalness={0.65} />
      </mesh>

      <group ref={armRef}>
        <mesh position={[0, armY, -armLen / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[tube, tube, armLen, 8]} />
          <meshStandardMaterial color={ARM_SILVER} roughness={0.2} metalness={0.65} />
        </mesh>

        <mesh position={[0, armY, 0.2]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#999999" roughness={0.3} metalness={0.45} />
        </mesh>

        <group position={[0, armY, -armLen + 0.05]}>
          <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[tube * 0.9, tube * 1.3, 0.16, 8]} />
            <meshStandardMaterial color={ARM_SILVER} roughness={0.2} metalness={0.65} />
          </mesh>
          <mesh position={[0, -0.035, -0.16]}>
            <coneGeometry args={[0.008, 0.035, 6]} />
            <meshStandardMaterial color="#555555" roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ── Play / pause icon shapes ──
function PlayIcon() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const r = 0.035;
    s.moveTo(-r * 0.6, -r);
    s.lineTo(-r * 0.6, r);
    s.lineTo(r * 0.8, 0);
    s.closePath();
    return s;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={ACCENT} roughness={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PauseIcon() {
  const barW = 0.018;
  const barH = 0.055;
  const gap = 0.015;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[-gap - barW / 2, 0, 0]}>
        <planeGeometry args={[barW, barH]} />
        <meshStandardMaterial color={ACCENT} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[gap + barW / 2, 0, 0]}>
        <planeGeometry args={[barW, barH]} />
        <meshStandardMaterial color={ACCENT} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Power button ──
function PowerButton({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const iconRef = useRef<THREE.Group>(null);

  const yRef = useRef(0);
  useFrame((_, dt) => {
    const target = pressed ? -0.008 : 0;
    yRef.current += (target - yRef.current) * Math.min(dt * 12, 1);
    const y = BASE_H + 0.025 + yRef.current;
    if (meshRef.current) meshRef.current.position.y = y;
    if (iconRef.current) iconRef.current.position.y = y + 0.012;
  });

  const handleClick = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onToggle?.();
    },
    [onToggle]
  );

  const btnX = BASE_W / 2 - 0.35;
  const btnZ = -BASE_D / 2 + 0.35;
  const color = pressed ? BTN_ACTIVE : hovered ? BTN_HOVER : BTN_COLOR;

  return (
    <group position={[btnX, 0, btnZ]}>
      {/* Housing ring */}
      <mesh position={[0, BASE_H + 0.008, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.016, 24]} />
        <meshStandardMaterial color={ACCENT} roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Button cap */}
      <mesh
        ref={meshRef}
        position={[0, BASE_H + 0.025, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          setPressed(true);
        }}
        onPointerUp={(e) => {
          setPressed(false);
          handleClick(e);
        }}
        onPointerLeave={() => {
          setPressed(false);
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
      >
        <cylinderGeometry args={[0.09, 0.09, 0.02, 24]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Play/pause icon on button face */}
      <group ref={iconRef} position={[0, BASE_H + 0.037, 0]}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </group>

      {/* LED */}
      <mesh position={[0.16, BASE_H + 0.012, 0]}>
        <sphereGeometry args={[0.02, 12, 12]} />
        <meshStandardMaterial
          color={isPlaying ? "#4ade80" : "#666666"}
          emissive={isPlaying ? "#22c55e" : "#000000"}
          emissiveIntensity={isPlaying ? 0.8 : 0}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

// ── Base ──
function TurntableBase() {
  return (
    <group>
      <mesh position={[0, BASE_H / 2, 0]}>
        <boxGeometry args={[BASE_W, BASE_H, BASE_D]} />
        <meshPhongMaterial color={BASE_COLOR} specular="#ffcc99" shininess={80} />
      </mesh>

      <mesh position={[0, 0.004, 0]}>
        <boxGeometry args={[BASE_W + 0.008, 0.008, BASE_D + 0.008]} />
        <meshPhongMaterial color={BASE_EDGE} specular="#ffbb88" shininess={80} />
      </mesh>


      {(
        [
          [-BASE_W / 2 + 0.2, 0, -BASE_D / 2 + 0.2],
          [BASE_W / 2 - 0.2, 0, -BASE_D / 2 + 0.2],
          [-BASE_W / 2 + 0.2, 0, BASE_D / 2 - 0.2],
          [BASE_W / 2 - 0.2, 0, BASE_D / 2 - 0.2],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.05, 0.065, 0.025, 16]} />
          <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ── Scene ──
function TurntableScene({
  isPlaying,
  onToggle,
  artworkUrl,
  swapKey,
  onPlaced,
}: {
  isPlaying: boolean;
  onToggle?: () => void;
  artworkUrl?: string;
  swapKey: number;
  onPlaced?: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 8, 3]} intensity={1.2} />
      <directionalLight position={[-2, 6, -1]} intensity={0.4} />

      <group position={[0, 0, 0]} rotation={[0, -0.3, 0]}>
        <TurntableBase />

        <group position={[-0.35, BASE_H, 0]}>
          <Platter isPlaying={isPlaying} artworkUrl={artworkUrl} swapKey={swapKey} onPlaced={onPlaced} />
        </group>

        <Tonearm isPlaying={isPlaying} />
        <PowerButton isPlaying={isPlaying} onToggle={onToggle} />
      </group>
    </>
  );
}

// ── Public ──
export default function Vinyl3D({
  isPlaying = false,
  onToggle,
  artworkUrl,
  swapKey = 0,
  onPlaced,
}: {
  isPlaying?: boolean;
  onToggle?: () => void;
  artworkUrl?: string;
  swapKey?: number;
  onPlaced?: () => void;
}) {
  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ position: [0, 6.5, 5], fov: 38 }}
      style={{ width: "100%", height: "100%" }}
    >
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
      />
      <TurntableScene
        isPlaying={isPlaying}
        onToggle={onToggle}
        artworkUrl={artworkUrl}
        swapKey={swapKey}
        onPlaced={onPlaced}
      />
    </Canvas>
  );
}
