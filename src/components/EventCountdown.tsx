"use client";

import { useEffect, useState } from "react";

interface Props {
  targetISO: string;
  eventTitle: string;
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds };
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function EventCountdown({ targetISO, eventTitle }: Props) {
  const [now, setNow] = useState<number | null>(null);
  const [colonVisible, setColonVisible] = useState(true);

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const blink = setInterval(() => setColonVisible((v) => !v), 500);
    return () => {
      clearInterval(tick);
      clearInterval(blink);
    };
  }, []);

  if (now === null) return null;

  const target = new Date(targetISO).getTime();
  const diff = target - now;
  const past = diff <= 0;
  const { days, hours, minutes, seconds } = parts(diff);

  const digit: React.CSSProperties = {
    color: "#dc2626",
    letterSpacing: "-0.05em",
    transform: "scaleY(1.3)",
    display: "inline-block",
  };
  const colon: React.CSSProperties = {
    color: "#dc2626",
    opacity: colonVisible ? 1 : 0.2,
    transition: "opacity 0.1s",
    transform: "scaleY(1.3)",
    display: "inline-block",
    letterSpacing: "-0.08em",
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none font-mono py-6 md:py-8">
      <p
        className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium"
        style={{ color: "#dc2626" }}
      >
        {past ? "Last event was" : "Next event in"}
      </p>

      <div className="flex items-baseline leading-none gap-1">
        {days > 0 && (
          <>
            <span className="text-2xl md:text-4xl font-bold tabular-nums" style={digit}>
              {pad(days)}
            </span>
            <span className="text-[10px] md:text-xs font-bold mr-1" style={{ ...digit, transform: "scaleY(1)" }}>
              d
            </span>
          </>
        )}
        <span className="text-2xl md:text-4xl font-bold tabular-nums" style={digit}>
          {pad(hours)}
        </span>
        <span className="text-2xl md:text-4xl font-bold" style={colon}>
          :
        </span>
        <span className="text-2xl md:text-4xl font-bold tabular-nums" style={digit}>
          {pad(minutes)}
        </span>
        <span className="text-2xl md:text-4xl font-bold" style={colon}>
          :
        </span>
        <span className="text-2xl md:text-4xl font-bold tabular-nums" style={digit}>
          {pad(seconds)}
        </span>
      </div>

      <p className="text-[11px] md:text-sm uppercase tracking-[0.15em] text-black/70 mt-1 text-center px-4">
        {eventTitle}
      </p>
    </div>
  );
}
