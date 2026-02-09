"use client";

import { useRef, useEffect, useCallback } from "react";

const BAR_COUNT = 48;
const BAR_GAP = 2;
const LERP_UP = 0.12;
const LERP_DOWN = 0.06;
const REST_HEIGHT = 0.02; // fraction of canvas height when paused

export default function AudioBars({
  isPlaying,
  analyserNode,
}: {
  isPlaying: boolean;
  analyserNode?: AnalyserNode | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const barsRef = useRef<Float32Array | null>(null);
  const targetsRef = useRef<Float32Array | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const analyserRef = useRef(analyserNode);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const tickRef = useRef(0);

  // Keep refs in sync
  isPlayingRef.current = isPlaying;
  analyserRef.current = analyserNode;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas resolution to display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width * dpr;
    const h = rect.height * dpr;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Init bar arrays
    if (!barsRef.current || barsRef.current.length !== BAR_COUNT) {
      barsRef.current = new Float32Array(BAR_COUNT).fill(REST_HEIGHT);
      targetsRef.current = new Float32Array(BAR_COUNT).fill(REST_HEIGHT);
    }

    const bars = barsRef.current;
    const targets = targetsRef.current!;
    const playing = isPlayingRef.current;
    const analyser = analyserRef.current;

    // ── Compute targets ──
    if (playing && analyser) {
      // Real frequency data mode
      const binCount = analyser.frequencyBinCount;
      if (!freqDataRef.current || freqDataRef.current.length !== binCount) {
        freqDataRef.current = new Uint8Array(binCount);
      }
      analyser.getByteFrequencyData(freqDataRef.current);

      const freqData = freqDataRef.current;
      const binsPerBar = Math.floor(binCount / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        const start = i * binsPerBar;
        for (let j = start; j < start + binsPerBar && j < binCount; j++) {
          sum += freqData[j];
        }
        // Normalize 0-255 to 0-1, with a slight boost
        const avg = sum / binsPerBar / 255;
        targets[i] = Math.min(avg * 1.3, 1.0) * 0.9;
      }
    } else if (playing) {
      // Fallback: simulated bars when no analyser available
      tickRef.current++;
      if (tickRef.current % 3 === 0) {
        for (let i = 0; i < BAR_COUNT; i++) {
          const bassWeight = 1 - (i / BAR_COUNT) * 0.5;
          const randomness = 0.3 + Math.random() * 0.7;
          targets[i] = randomness * bassWeight * 0.85;
        }
      }
    } else {
      // Paused — decay to rest
      for (let i = 0; i < BAR_COUNT; i++) {
        targets[i] = REST_HEIGHT;
      }
    }

    // Lerp current bars toward targets
    for (let i = 0; i < BAR_COUNT; i++) {
      const diff = targets[i] - bars[i];
      const rate = diff > 0 ? LERP_UP : LERP_DOWN;
      bars[i] += diff * rate;
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw bars from the bottom
    const totalBarWidth = (w - BAR_GAP * dpr * (BAR_COUNT - 1)) / BAR_COUNT;
    const barWidth = Math.max(totalBarWidth, 1);
    const gap = BAR_GAP * dpr;

    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = bars[i] * h;
      const x = i * (barWidth + gap);
      const y = h - barH;

      // Vibrant orange-to-coral gradient
      const grad = ctx.createLinearGradient(x, h, x, y);
      grad.addColorStop(0, "rgba(255, 90, 0, 0.7)");
      grad.addColorStop(0.4, "rgba(255, 130, 30, 0.55)");
      grad.addColorStop(0.75, "rgba(255, 170, 60, 0.35)");
      grad.addColorStop(1, "rgba(255, 200, 100, 0.15)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      // Rounded top
      const radius = Math.min(barWidth / 2, 3 * dpr);
      ctx.moveTo(x, h);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, h);
      ctx.closePath();
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-0 pointer-events-none"
    />
  );
}
