"use client";

import {
  useRef,
  useEffect,
  Suspense,
  useMemo,
  type MutableRefObject,
} from "react";
import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { computeSkyPalette, orangeCountyHour } from "@/lib/skyPalette";

if (typeof window !== "undefined") {
  useLoader.preload(THREE.TextureLoader, [
    "/cover/front.jpg",
    "/cover/back.jpg",
    "/cover/spine.jpg",
  ]);
}

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
      color: texture ? "#e2e2e2" : PAGE_COLOR,
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
      // A touch below white so the cover sits into the scene light
      color: "#e2e2e2",
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
      color: texture ? "#e2e2e2" : "#f0f0f0",
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

// ── Shared device-tilt state ──
type TiltState = {
  enabled: boolean;
  baseBeta: number;
  baseGamma: number;
  beta: number;
  gamma: number;
};

// Device-tilt state: the first reading is the neutral pose, so everything
// leans relative to how the phone was held on page load. One hook instance
// feeds both the magazine and the water backdrop.
function useDeviceTilt() {
  const gyro = useRef<TiltState>({
    enabled: false,
    baseBeta: 0,
    baseGamma: 0,
    beta: 0,
    gamma: 0,
  });

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const g = gyro.current;
      if (!g.enabled) {
        g.enabled = true;
        g.baseBeta = e.beta;
        g.baseGamma = e.gamma;
      }
      g.beta = e.beta;
      g.gamma = e.gamma;
    };

    const start = () =>
      window.addEventListener("deviceorientation", handleOrientation);

    // iOS 13+ requires a permission request from inside a user gesture
    type DOEWithPermission = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const DOE =
      typeof DeviceOrientationEvent !== "undefined"
        ? (DeviceOrientationEvent as DOEWithPermission)
        : null;

    let removeGestureListeners: (() => void) | null = null;

    if (DOE?.requestPermission) {
      const ask = () => {
        removeGestureListeners?.();
        DOE.requestPermission!()
          .then((res) => {
            if (res === "granted") start();
          })
          .catch(() => {});
      };
      window.addEventListener("touchend", ask);
      window.addEventListener("click", ask);
      removeGestureListeners = () => {
        window.removeEventListener("touchend", ask);
        window.removeEventListener("click", ask);
      };
    } else if (DOE) {
      start();
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      removeGestureListeners?.();
    };
  }, []);

  return gyro;
}

// ── Water backdrop – a glass half full that stays level as the phone tilts ──
const WATER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ── Stylized ocean – flat pastel plane with drifting voronoi caustics,
// after the Codrops "stylized water" look ──
const OCEAN_VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying float vWave;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    // Gentle rolling swells, layered so they never repeat obviously
    float t = uTime;
    // Peak height ~0.3 – the magazine floats at a safe clearance above
    float h = sin(wp.x * 0.55 + t * 0.8) * 0.11;
    h += sin(wp.z * 0.45 - t * 0.6 + 1.7) * 0.09;
    h += sin((wp.x + wp.z) * 0.28 + t * 0.45) * 0.07;
    h += sin(wp.x * 1.3 - t * 1.4 + 4.2) * 0.03;
    // Waves flatten with distance so the horizon stays a clean line
    float falloff = 1.0 - smoothstep(8.0, 28.0, distance(wp.xz, cameraPosition.xz));
    h *= falloff;
    wp.y += h;
    vWorld = wp.xyz;
    vWave = h;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const OCEAN_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;
  varying float vWave;
  uniform float uTime;
  uniform vec3 uCol;     // base water colour
  uniform vec3 uLine;    // caustic line colour
  uniform vec3 uHor;     // sky horizon colour for the distance fade

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  vec2 hash2(vec2 p) {
    return fract(
      sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) *
      43758.5453);
  }

  // Voronoi cell-border distance (F2 - F1): thin where two cells meet.
  // The cell points swim in circles, so the web of lines keeps drifting.
  float caustic(vec2 p, float t) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 g = vec2(float(x), float(y));
        vec2 h = hash2(i + g);
        vec2 o = g + 0.5 + 0.45 * sin(t + 6.2831 * h) - f;
        float d = dot(o, o);
        if (d < f1) { f2 = f1; f1 = d; }
        else if (d < f2) { f2 = d; }
      }
    }
    return sqrt(f2) - sqrt(f1);
  }

  void main() {
    vec2 p = vWorld.xz;
    float t = uTime * 0.4;

    // Two caustic webs at different scales and speeds
    float lines = 1.0 - smoothstep(0.0, 0.07, caustic(p * 1.4, t));
    float lines2 = 1.0 - smoothstep(0.0, 0.11, caustic(p * 0.55 + 31.7, t * 0.6));

    // Distance from the camera drives the misty horizon fade; far away
    // the water becomes exactly the sky's horizon colour, so the two
    // surfaces meet without a seam
    float dist = length(vWorld - cameraPosition);
    float fade = smoothstep(8.0, 70.0, dist);

    // Crests catch the light, troughs sit deeper
    vec3 col = uCol * (1.0 + vWave * 0.5);
    col = mix(col, uLine, lines * 0.28 * (1.0 - fade));
    col = mix(col, uLine, lines2 * 0.14 * (1.0 - fade * 0.7));

    // Tiny drifting flecks on the surface
    vec2 cell = floor(p * 1.4);
    vec2 fc = fract(p * 1.4) - 0.5;
    vec2 jitter = (hash2(cell) - 0.5) * 0.6;
    float fleck = smoothstep(0.06, 0.02, length(fc - jitter)) *
                  step(0.9, hash(cell + 7.0));
    col = mix(col, uLine, fleck * 0.5 * (1.0 - fade));

    // Melt into the sky at the horizon
    col = mix(col, uHor, fade);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ── Orange County sky: time of day → colours and sun / moon position ──
// Day runs 6:00–18:00 with the sun; night gets the moon. Both travel
// left to right on an arc over their 12-hour window.
type SkyState = {
  isDay: boolean;
  frac: number; // progress through the current 12-h window
  night: number; // 0 full day .. 1 full night
  top: THREE.Color; // sky at the top of the frame
  mid: THREE.Color; // sky between top and horizon
  horizon: THREE.Color; // sky at the waterline
  light: THREE.Color; // ambient light tint (foam, sparkle)
};

function computeSky(hf: number): SkyState {
  const p = computeSkyPalette(hf);
  return {
    isDay: p.isDay,
    frac: p.frac,
    night: p.night,
    top: new THREE.Color(p.top),
    mid: new THREE.Color(p.mid),
    horizon: new THREE.Color(p.horizon),
    light: new THREE.Color(p.light),
  };
}

// One shared sky state, refreshed every 10 s so you can sit and watch
// the sunrise or the sunset happen.
function useOrangeCountySky() {
  const sky = useRef<SkyState>(computeSky(orangeCountyHour()));
  useEffect(() => {
    const id = setInterval(() => {
      sky.current = computeSky(orangeCountyHour());
    }, 10000);
    return () => clearInterval(id);
  }, []);
  return sky;
}

// Sizes a plane at the given z so it always fills the whole view
function useViewPlane(z: number) {
  const { size, camera } = useThree();
  const persp = camera as THREE.PerspectiveCamera;
  const dist = persp.position.z - z;
  const h = 2 * dist * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2));
  const w = h * (size.width / size.height);
  return { w, h };
}

// ── Sky backdrop – a clean gradient that follows the time of day ──
const SKY_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // The horizon line sits at the plane centre (camera eye level)
    float f = clamp((vUv.y - 0.5) * 2.0, 0.0, 1.0);
    // Blend in a roughly-perceptual space so the midtones stay rich
    vec3 lo = mix(uHorizon * uHorizon, uMid * uMid,
                  smoothstep(0.0, 0.55, f));
    vec3 col = sqrt(mix(lo, uTop * uTop, smoothstep(0.45, 1.0, f)));
    // Soft bloom above the horizon only – below it the colour must stay
    // flat so the water fade can meet it exactly
    col += uHorizon * 0.15 * exp(-abs(vUv.y - 0.5) * 8.0) *
           smoothstep(0.49, 0.51, vUv.y);
    // Tiny dither breaks up gradient banding
    col += (hash(vUv * 913.7) - 0.5) * 0.012;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyBackdrop({ sky }: { sky: MutableRefObject<SkyState> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { w, h } = useViewPlane(-61);

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color("#63a9e6") },
      uMid: { value: new THREE.Color("#a5cdef") },
      uHorizon: { value: new THREE.Color("#e2f2fb") },
    }),
    []
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    const k = 1 - Math.exp(-2 * Math.min(delta, 0.05));
    (m.uniforms.uTop.value as THREE.Color).lerp(sky.current.top, k);
    (m.uniforms.uMid.value as THREE.Color).lerp(sky.current.mid, k);
    (m.uniforms.uHorizon.value as THREE.Color).lerp(sky.current.horizon, k);
  });

  return (
    // Far behind the ocean, centred on the camera's eye level so the
    // gradient horizon meets the sea
    <mesh position={[0, 1.2, -61]}>
      <planeGeometry args={[w * 1.4, h * 1.4]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={WATER_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}


// ── Little floating island with a palm tree ──
// The palm is "Palm Detailed Short" by Kenney (CC0), served from
// public/models/palm.gltf via the pmndrs market-assets library.
const PALM_MODEL = "/models/palm.gltf";
useGLTF.preload(PALM_MODEL);

const ISLAND_TINTS = {
  sandDay: new THREE.Color("#ecd0a0"),
  sandNight: new THREE.Color("#4a4a68"),
  wetDay: new THREE.Color("#c9ad82"),
  wetNight: new THREE.Color("#414868"),
  // The palm's own colours darken toward this at night
  palmNight: new THREE.Color("#3d4468"),
};

function PalmIsland({ sky }: { sky: MutableRefObject<SkyState> }) {
  const bobRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(PALM_MODEL);

  // Clone the model and swap its lit materials for unlit ones that keep
  // the asset's colours, remembering each daytime colour for tinting
  const palm = useMemo(() => {
    const clone = scene.clone(true);
    const tints: { mat: THREE.MeshBasicMaterial; day: THREE.Color }[] = [];
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = mesh.material as THREE.MeshStandardMaterial;
      const basic = new THREE.MeshBasicMaterial({ color: src.color.clone() });
      mesh.material = basic;
      tints.push({ mat: basic, day: src.color.clone() });
    });
    return { clone, tints };
  }, [scene]);

  const sandMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ecd0a0" }),
    []
  );
  const wetMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#c9ad82" }),
    []
  );
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const s = sky.current;
    const k = 1 - Math.exp(-2 * Math.min(delta, 0.05));
    const tint = (
      mat: THREE.MeshBasicMaterial,
      day: THREE.Color,
      night: THREE.Color
    ) => {
      // Day/night blend, plus a light kiss of horizon haze
      tmpColor.copy(day).lerp(night, s.night).lerp(s.horizon, 0.12);
      mat.color.lerp(tmpColor, k);
    };
    tint(sandMaterial, ISLAND_TINTS.sandDay, ISLAND_TINTS.sandNight);
    tint(wetMaterial, ISLAND_TINTS.wetDay, ISLAND_TINTS.wetNight);
    for (const t of palm.tints) tint(t.mat, t.day, ISLAND_TINTS.palmNight);

    // Ride the water: a light, happy bob and sway
    const t = state.clock.elapsedTime;
    if (bobRef.current) {
      bobRef.current.position.y = Math.sin(t * 0.7) * 0.06;
      bobRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
      bobRef.current.rotation.x = Math.sin(t * 0.36 + 1.3) * 0.03;
    }
  });

  return (
    <group position={[4.2, -1.74, -13]} scale={0.85}>
      <group ref={bobRef}>
        {/* Thin wet-sand sliver at the waterline, then the dry dome */}
        <mesh scale={[1.42, 0.3, 1.2]} material={wetMaterial}>
          <sphereGeometry args={[1, 24, 12]} />
        </mesh>
        <mesh
          position={[0, 0.12, 0]}
          scale={[1.32, 0.58, 1.12]}
          material={sandMaterial}
        >
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>

        {/* Kenney palm, planted on the dome */}
        <primitive
          object={palm.clone}
          position={[-0.2, 0.52, 0]}
          scale={1.5}
          rotation={[0, 0.6, 0]}
        />
      </group>
    </group>
  );
}

// Base water colours; the sky's night factor blends between them
const OCEAN_DAY = new THREE.Color("#7fd8ca");
const OCEAN_NIGHT = new THREE.Color("#2a3b5e");

function Ocean({
  gyro,
  sky,
}: {
  gyro: MutableRefObject<TiltState>;
  sky: MutableRefObject<SkyState>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Damped-spring simulation: the sea tilts subtly with the phone and
  // settles gracefully. No pointer input — desktop stays calm.
  const sim = useRef({ angle: 0, angleVel: 0, off: 0, offVel: 0 });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCol: { value: OCEAN_DAY.clone() },
      uLine: { value: new THREE.Color("#ffffff") },
      uHor: { value: new THREE.Color("#e2f2fb") },
    }),
    []
  );
  // Scratch colour reused every frame, no per-frame allocation
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = gyro.current;
    const s = sim.current;

    let targetAngle = 0;
    let targetOff = 0;
    if (g.enabled) {
      // The phone rolls one way; the level sea counter-tilts, subtly
      const roll = THREE.MathUtils.clamp(g.gamma - g.baseGamma, -30, 30);
      targetAngle = -THREE.MathUtils.degToRad(roll) * 0.35;
      const pitch = THREE.MathUtils.clamp(g.beta - g.baseBeta, -30, 30);
      targetOff = (-pitch / 30) * 0.25;
    }

    const stiffness = 16;
    const damping = 2.2;
    s.angleVel += (targetAngle - s.angle) * stiffness * dt;
    s.angleVel *= Math.exp(-damping * dt);
    s.angle += s.angleVel * dt;
    s.offVel += (targetOff - s.off) * stiffness * dt;
    s.offVel *= Math.exp(-damping * dt);
    s.off += s.offVel * dt;

    if (groupRef.current) {
      groupRef.current.rotation.z = s.angle;
      groupRef.current.position.y = s.off;
    }

    const m = matRef.current;
    if (m) {
      m.uniforms.uTime.value = state.clock.elapsedTime;
      const skyNow = sky.current;
      const k = 1 - Math.exp(-2 * dt);
      // Water: mint by day, deep indigo-teal by night, kissed by the sky
      tmpColor
        .copy(OCEAN_DAY)
        .lerp(OCEAN_NIGHT, skyNow.night)
        .lerp(skyNow.mid, 0.15);
      (m.uniforms.uCol.value as THREE.Color).lerp(tmpColor, k);
      (m.uniforms.uLine.value as THREE.Color).lerp(skyNow.light, k);
      (m.uniforms.uHor.value as THREE.Color).lerp(skyNow.horizon, k);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, -60]}>
        <planeGeometry args={[220, 160, 200, 90]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={OCEAN_VERT}
          fragmentShader={OCEAN_FRAG}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}

// ── Main interactive magazine ──
function RotatingMagazine({
  frontCover,
  backCover,
  spineCover,
  gyro,
}: {
  frontCover?: string;
  backCover?: string;
  spineCover?: string;
  gyro: MutableRefObject<TiltState>;
}) {
  const wholeRef = useRef<THREE.Group>(null);
  const smoothRotSpeed = useRef(0.5);
  // Drag state so only touches that start ON the magazine rotate it —
  // touches elsewhere fall through to normal page scrolling.
  const drag = useRef({ active: false, lastX: 0, velocity: 0 });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    drag.current.active = true;
    drag.current.lastX = e.clientX;
    drag.current.velocity = 0;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - drag.current.lastX;
      drag.current.lastX = ev.clientX;
      if (wholeRef.current) wholeRef.current.rotation.y += dx * 0.01;
      drag.current.velocity = dx * 0.01;
    };
    const onEnd = () => {
      drag.current.active = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  };

  useFrame((_, delta) => {
    if (!wholeRef.current) return;

    // Lean with the phone: beta (front/back tilt) drives X, gamma
    // (left/right tilt) drives Z, clamped and smoothed so it stays subtle.
    const g = gyro.current;
    if (g.enabled) {
      const tiltX =
        THREE.MathUtils.degToRad(
          THREE.MathUtils.clamp(g.beta - g.baseBeta, -35, 35)
        ) * 0.45;
      const tiltZ =
        THREE.MathUtils.degToRad(
          THREE.MathUtils.clamp(g.gamma - g.baseGamma, -35, 35)
        ) * 0.45;
      wholeRef.current.rotation.x = THREE.MathUtils.lerp(
        wholeRef.current.rotation.x,
        tiltX,
        0.08
      );
      wholeRef.current.rotation.z = THREE.MathUtils.lerp(
        wholeRef.current.rotation.z,
        -tiltZ,
        0.08
      );
    }

    if (drag.current.active) return;
    // Flick inertia decays back into the idle auto-rotation
    drag.current.velocity *= 0.95;
    wholeRef.current.rotation.y +=
      delta * smoothRotSpeed.current + drag.current.velocity;
  });

  const spineX = -(COVER_W / 2);

  return (
    // Centred on the camera axis, well clear of the wave crests
    <group
      ref={wholeRef}
      position={[0, 0.95, 0]}
      scale={1}
      onPointerDown={handlePointerDown}
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
}: {
  frontCover?: string;
  backCover?: string;
  spineCover?: string;
}) {
  const gyro = useDeviceTilt();
  const sky = useOrangeCountySky();

  return (
    <>
      <SkyBackdrop sky={sky} />
      <PalmIsland sky={sky} />
      <Ocean gyro={gyro} sky={sky} />
      <RotatingMagazine
        frontCover={frontCover}
        backCover={backCover}
        spineCover={spineCover}
        gyro={gyro}
      />
    </>
  );
}

// ── Public component ──
export default function Magazine3D({
  frontCover,
  backCover,
  spineCover,
}: {
  frontCover?: string;
  backCover?: string;
  spineCover?: string;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
        toneMapping: THREE.NoToneMapping,
        outputColorSpace: THREE.LinearSRGBColorSpace,
      }}
      // Gentle downward pitch: horizon sits just above the frame centre,
      // so the water fills the lower half and the magazine centres
      camera={{ position: [0, 1.2, 5], rotation: [-0.05, 0, 0], fov: 50 }}
      style={{ width: "100%", height: "100%", touchAction: "pan-y" }}
    >
      <MagazineScene
        frontCover={frontCover}
        backCover={backCover}
        spineCover={spineCover}
      />
    </Canvas>
  );
}
