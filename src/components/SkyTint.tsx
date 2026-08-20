"use client";

import { useEffect, useState } from "react";
import { computeSkyPalette, orangeCountyHour } from "@/lib/skyPalette";

// A whisper of the homepage sky: a very soft gradient wash that follows
// the same Orange County time-of-day palette, so other sections share
// the hero's vibe without competing with their content. Place inside a
// `relative` container.
export default function SkyTint() {
  const [colors, setColors] = useState({ top: "#63a9e6", horizon: "#e2f2fb" });

  useEffect(() => {
    const update = () => {
      const p = computeSkyPalette(orangeCountyHour());
      setColors({ top: p.top, horizon: p.horizon });
    };
    // Deferred so the first paint keeps the SSR default (no hydration
    // mismatch, no synchronous set-state in the effect)
    const t = setTimeout(update, 0);
    const id = setInterval(update, 60000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        // 8-digit hex: ~9% at the top melting to nothing
        background: `linear-gradient(180deg, ${colors.top}18 0%, ${colors.horizon}10 45%, transparent 80%)`,
      }}
    />
  );
}
