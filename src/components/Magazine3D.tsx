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

const WATER_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uAngle;   // surface tilt in radians (counter-rotates the glass)
  uniform float uOffset;  // vertical bob of the surface
  uniform float uAmp;     // slosh energy, 0 calm .. 1 agitated
  uniform float uAspect;  // plane width / height
  uniform vec3 uC1;       // far swell colour
  uniform vec3 uC2;       // mid swell colour
  uniform vec3 uC3;       // near swell colour
  uniform vec3 uLight;    // sun / moon light tint

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // One travelling swell: a few sine octaves around a base height
  float swell(vec2 q, float base, float amp, float k, float speed,
              float phase, float t) {
    float w = sin(q.x * k + t * speed + phase) * amp;
    w += sin(q.x * k * 1.8 - t * speed * 1.4 + phase * 2.0) * amp * 0.45;
    w += sin(q.x * k * 3.1 + t * speed * 2.1 + phase * 0.5) * amp * 0.2;
    return q.y - base - w; // signed height above this swell
  }

  void main() {
    // Centered, aspect-correct coordinates
    vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y - 0.5);

    // Rotate space so the surface stays level in the world while the
    // "glass" (the screen) tilts with the phone.
    float s = sin(uAngle);
    float c = cos(uAngle);
    vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);

    float t = uTime;
    // Waves grow when the phone moves, settle to a calm swell when still
    float amp = 0.016 + uAmp * 0.05;

    // Three overlapping swells, back to front, like real ocean layers.
    // The slosh mode (uAmp) also rocks the whole set side to side.
    float rock = sin(q.x * 3.0 - t * 1.1) * uAmp * 0.04;
    float d1 = swell(q, uOffset + 0.045 + rock, amp * 0.8, 9.0, 0.9, 0.0, t);
    float d2 = swell(q, uOffset + rock, amp, 13.0, 1.3, 2.1, t);
    float d3 = swell(q, uOffset - 0.05 + rock, amp * 1.2, 17.0, 1.7, 4.4, t);

    float b1 = smoothstep(0.006, -0.006, d1);
    float b2 = smoothstep(0.006, -0.006, d2);
    float b3 = smoothstep(0.006, -0.006, d3);

    // Water layers over the sky; the sun / moon mesh sets behind them
    vec3 col = uC1;
    float alpha = b1 * 0.8;
    col = mix(col, uC2, b2 * 0.9);
    alpha = max(alpha, b2 * 0.88);
    col = mix(col, uC3, b3 * 0.92);
    alpha = max(alpha, b3 * 0.95);

    // Deepen toward the bottom of the front swell
    float depth = clamp(-d3 * 1.2, 0.0, 1.0);
    col = mix(col, uC3 * 0.55, depth * 0.7 * b3);

    // Foam – a light-tinted sparkling crest on every swell line
    float foam = exp(-abs(d1) * 90.0) * 0.35 +
                 exp(-abs(d2) * 90.0) * 0.55 +
                 exp(-abs(d3) * 90.0) * 0.8;
    foam *= 0.65 + 0.7 * noise(vec2(q.x * 60.0, t * 2.5));
    col += uLight * foam * 0.55;
    alpha += foam * 0.4;

    // Caustic shimmer drifting inside the water, fading with depth
    float caus = noise(q * 11.0 + vec2(t * 0.3, -t * 0.4)) *
                 noise(q * 7.0 - vec2(t * 0.2, t * 0.3));
    col += caus * 0.18 * b2 * (1.0 - depth * 0.6);

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

// ── Orange County sky: time of day → colours and sun / moon position ──
// Day runs 6:00–18:00 with the sun; night gets the moon. Both travel
// left to right on an arc over their 12-hour window.
type SkyState = {
  isDay: boolean;
  frac: number; // progress through the current 12-h window
  night: number; // 0 full day .. 1 full night (stars fade in with this)
  top: THREE.Color; // sky at the top of the frame
  horizon: THREE.Color; // sky at the waterline
  light: THREE.Color; // sun / moon light tint (foam, glint)
};

// hour, sky top, horizon, light, night factor — soft pastel gradient stops
const SKY_STOPS: [number, string, string, string, number][] = [
  [0.0, "#232a4d", "#565d8a", "#c3cbe8", 1],
  [4.5, "#2a3157", "#6a6f9e", "#c3cbe8", 1],
  [5.5, "#454a7d", "#b98ba4", "#e8c4c9", 0.7],
  [6.5, "#7d9ac9", "#ffc9a0", "#ffe3c4", 0.25],
  [8.0, "#8ec1ea", "#e4f2fa", "#fff7ea", 0],
  [12.0, "#7db8e8", "#e8f4fb", "#ffffff", 0],
  [16.5, "#7ba6d4", "#f7ddb0", "#ffeccd", 0],
  [18.5, "#5b6ba8", "#ffb490", "#ffd9b8", 0.25],
  [20.0, "#383e6e", "#8d7ba6", "#d3cbe4", 0.7],
  [21.5, "#262d52", "#5d6390", "#c3cbe8", 1],
  [24.0, "#232a4d", "#565d8a", "#c3cbe8", 1],
];

function orangeCountyHour(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

function computeSky(hf: number): SkyState {
  const isDay = hf >= 6 && hf < 18;
  const frac = isDay
    ? (hf - 6) / 12
    : hf >= 18
      ? (hf - 18) / 12
      : (hf + 6) / 12;

  let i = 0;
  while (i < SKY_STOPS.length - 2 && hf >= SKY_STOPS[i + 1][0]) i++;
  const [h0, top0, hor0, li0, n0] = SKY_STOPS[i];
  const [h1, top1, hor1, li1, n1] = SKY_STOPS[i + 1];
  const t = THREE.MathUtils.clamp((hf - h0) / (h1 - h0), 0, 1);

  return {
    isDay,
    frac,
    night: THREE.MathUtils.lerp(n0, n1, t),
    top: new THREE.Color(top0).lerp(new THREE.Color(top1), t),
    horizon: new THREE.Color(hor0).lerp(new THREE.Color(hor1), t),
    light: new THREE.Color(li0).lerp(new THREE.Color(li1), t),
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
  uniform vec3 uHorizon;

  void main() {
    // Horizon sits at the waterline (frame centre), glowing upward
    float upward = smoothstep(0.5, 1.0, vUv.y);
    vec3 col = mix(uHorizon, uTop, upward);
    // Soft horizon bloom just above the waterline
    col += uHorizon * 0.2 * exp(-abs(vUv.y - 0.5) * 9.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyBackdrop({ sky }: { sky: MutableRefObject<SkyState> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { w, h } = useViewPlane(-3);

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color("#7db8e8") },
      uHorizon: { value: new THREE.Color("#e8f4fb") },
    }),
    []
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    const k = 1 - Math.exp(-2 * Math.min(delta, 0.05));
    (m.uniforms.uTop.value as THREE.Color).lerp(sky.current.top, k);
    (m.uniforms.uHorizon.value as THREE.Color).lerp(sky.current.horizon, k);
  });

  return (
    <mesh position={[0, 0, -3]}>
      <planeGeometry args={[w, h]} />
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


// Day and night water palettes; the sky's night factor blends them
const WATER_DAY = [
  new THREE.Color("#a4d4ec"),
  new THREE.Color("#5da9dc"),
  new THREE.Color("#2678bd"),
];
const WATER_NIGHT = [
  new THREE.Color("#454e7d"),
  new THREE.Color("#353e6b"),
  new THREE.Color("#272f57"),
];

function WaterBackdrop({
  gyro,
  sky,
}: {
  gyro: MutableRefObject<TiltState>;
  sky: MutableRefObject<SkyState>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { w: planeW, h: planeH } = useViewPlane(-2);
  const PLANE_Z = -2;

  // Damped-spring simulation so the water settles gracefully, not instantly
  const sim = useRef({
    angle: 0,
    angleVel: 0,
    off: 0,
    offVel: 0,
    energy: 0,
    lastBeta: 0,
    lastGamma: 0,
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAngle: { value: 0 },
      uOffset: { value: 0 },
      uAmp: { value: 0 },
      uAspect: { value: 1 },
      uC1: { value: WATER_DAY[0].clone() },
      uC2: { value: WATER_DAY[1].clone() },
      uC3: { value: WATER_DAY[2].clone() },
      uLight: { value: new THREE.Color("#ffffff") },
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
      // The phone rolls one way; the level water appears to rotate the
      // other way on screen — that is what sells "glass half full".
      const roll = THREE.MathUtils.clamp(g.gamma - g.baseGamma, -40, 40);
      targetAngle = -THREE.MathUtils.degToRad(roll);
      const pitch = THREE.MathUtils.clamp(g.beta - g.baseBeta, -30, 30);
      targetOff = (-pitch / 30) * 0.05;

      // Movement pumps slosh energy into the water
      const rate =
        Math.abs(g.gamma - s.lastGamma) + Math.abs(g.beta - s.lastBeta);
      s.lastBeta = g.beta;
      s.lastGamma = g.gamma;
      s.energy = Math.min(1, s.energy + rate * 0.02);
    } else {
      // Desktop: a gentle sway follows the pointer
      targetAngle = state.pointer.x * -0.1;
    }

    const stiffness = 16;
    const damping = 2.2;
    s.angleVel += (targetAngle - s.angle) * stiffness * dt;
    s.angleVel *= Math.exp(-damping * dt);
    s.angle += s.angleVel * dt;
    s.offVel += (targetOff - s.off) * stiffness * dt;
    s.offVel *= Math.exp(-damping * dt);
    s.off += s.offVel * dt;
    s.energy = Math.max(0, s.energy - dt * 0.4);

    const m = matRef.current;
    if (m) {
      m.uniforms.uTime.value = state.clock.elapsedTime;
      m.uniforms.uAngle.value = s.angle;
      m.uniforms.uOffset.value = s.off;
      const energyNow = Math.min(1, s.energy + Math.abs(s.angleVel) * 1.2);
      m.uniforms.uAmp.value +=
        (energyNow - m.uniforms.uAmp.value) * (1 - Math.exp(-6 * dt));
      const aspect = planeW / planeH;
      m.uniforms.uAspect.value = aspect;

      // Tint the water with the sky: darker at night, warm at golden hour
      const skyNow = sky.current;
      const k = 1 - Math.exp(-2 * dt);
      for (let i = 0; i < 3; i++) {
        tmpColor
          .copy(WATER_DAY[i])
          .lerp(WATER_NIGHT[i], skyNow.night)
          .lerp(skyNow.horizon, i === 0 ? 0.25 : 0.1);
        const u = [m.uniforms.uC1, m.uniforms.uC2, m.uniforms.uC3][i];
        (u.value as THREE.Color).lerp(tmpColor, k);
      }
      (m.uniforms.uLight.value as THREE.Color).lerp(skyNow.light, k);
    }
  });

  return (
    <mesh position={[0, 0, PLANE_Z]}>
      <planeGeometry args={[planeW, planeH]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
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
    <group
      ref={wholeRef}
      position={[0, 0, 0]}
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
      <WaterBackdrop gyro={gyro} sky={sky} />
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
      camera={{ position: [0, 0, 5], fov: 50 }}
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
