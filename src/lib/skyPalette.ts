// Orange County sky palette – shared by the 3D scene (Magazine3D) and
// the HTML overlay labels (LookbookLayout), so text always matches the
// gradient behind it. No three.js import here: plain hex math keeps the
// overlay bundle small.

export type SkyPalette = {
  isDay: boolean;
  frac: number; // progress through the current 12-h window
  night: number; // 0 full day .. 1 full night
  top: string; // sky at the top of the frame
  mid: string; // sky between top and horizon
  horizon: string; // sky at the waterline
  light: string; // ambient light tint (foam, sparkle)
};

// hour, sky top, sky mid, horizon, light, night factor — pastel stops
const SKY_STOPS: [number, string, string, string, string, number][] = [
  [0.0, "#1c2347", "#3b4070", "#6f739f", "#c3cbe8", 1],
  [5.0, "#242b54", "#4c4a7c", "#92739c", "#d0c4dc", 1],
  [6.0, "#4a6fa8", "#c98f92", "#f7a173", "#ffd9b8", 0.25],
  [7.5, "#4f9ade", "#a9b6dd", "#ffc09a", "#fff0d8", 0.05],
  [12.0, "#3f8fe0", "#7ab8ef", "#bfe0f8", "#ffffff", 0],
  [16.5, "#4a90d4", "#8cbde8", "#ffd9a8", "#ffedd0", 0],
  [18.5, "#47548f", "#9d7ba0", "#ff9d78", "#ffcfae", 0.5],
  [20.0, "#2a3160", "#56548a", "#8f7099", "#d0c4dc", 0.9],
  [21.5, "#1f264c", "#414674", "#73779f", "#c3cbe8", 1],
  [24.0, "#1c2347", "#3b4070", "#6f739f", "#c3cbe8", 1],
];

// The site lives at golden hour: the scene hour is pinned to sunrise
// so the gradient always carries its orange horizon. (The clock text
// still shows the real time — it formats its own date.)
const PINNED_SUNRISE_HOUR = 7.0;

export function orangeCountyHour(): number {
  return PINNED_SUNRISE_HOUR;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

export function computeSkyPalette(hf: number): SkyPalette {
  const isDay = hf >= 6 && hf < 18;
  const frac = isDay
    ? (hf - 6) / 12
    : hf >= 18
      ? (hf - 18) / 12
      : (hf + 6) / 12;

  let i = 0;
  while (i < SKY_STOPS.length - 2 && hf >= SKY_STOPS[i + 1][0]) i++;
  const [h0, top0, mid0, hor0, li0, n0] = SKY_STOPS[i];
  const [h1, top1, mid1, hor1, li1, n1] = SKY_STOPS[i + 1];
  const t = Math.min(1, Math.max(0, (hf - h0) / (h1 - h0)));

  return {
    isDay,
    frac,
    night: n0 + (n1 - n0) * t,
    top: mixHex(top0, top1, t),
    mid: mixHex(mid0, mid1, t),
    horizon: mixHex(hor0, hor1, t),
    light: mixHex(li0, li1, t),
  };
}

// The water colours live here so the scene and the overlay text agree
export const OCEAN_DAY_HEX = "#7fd8ca";
export const OCEAN_NIGHT_HEX = "#2a3b5e";

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Text colours for the scene overlays. The label (top right) reads
// against the sky; the clock accent (bottom right) reads against the
// water — each picks dark ink or warm cream from its own background.
export function skyTextColors(p: SkyPalette): {
  label: string;
  accent: string;
} {
  // Deep rust on light backgrounds, warm peach on dark ones — the
  // complement of the teal water and the blue sky, never black/white
  const RUST = "#a63a1e";
  const PEACH = "#ffb08a";
  const label = luminance(p.top) < 0.45 ? PEACH : RUST;
  const water = mixHex(OCEAN_DAY_HEX, OCEAN_NIGHT_HEX, p.night);
  const accent = luminance(water) < 0.5 ? PEACH : RUST;
  return { label, accent };
}
