"use client";

import { useState, useEffect } from "react";

export default function BombClock() {
  const [time, setTime] = useState<string>("");
  const [colonVisible, setColonVisible] = useState(true);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const formatted = new Intl.DateTimeFormat("en-US", options).format(now);
      setTime(formatted);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const blink = setInterval(() => setColonVisible((v) => !v), 500);
    return () => clearInterval(blink);
  }, []);

  if (!time) return null;

  const [hours, minutes, seconds] = time.split(":");

  const digitStyle: React.CSSProperties = {
    color: "#dc2626",
    letterSpacing: "-0.05em",
    transform: "scaleY(1.3)",
    display: "inline-block",
  };

  const colonStyle: React.CSSProperties = {
    color: "#dc2626",
    opacity: colonVisible ? 1 : 0.2,
    transition: "opacity 0.1s",
    transform: "scaleY(1.3)",
    display: "inline-block",
    letterSpacing: "-0.08em",
  };

  return (
    <div className="flex items-center gap-1.5 select-none font-mono">
      {/* Location */}
      <p
        className="text-[11px] md:text-xs uppercase tracking-wider font-medium"
        style={{ color: "#dc2626" }}
      >
        Orange County, CA
      </p>

      {/* Time */}
      <div className="flex items-center leading-none">
        <span className="text-[11px] md:text-xs font-bold tabular-nums" style={digitStyle}>
          {hours}
        </span>
        <span className="text-[11px] md:text-xs font-bold" style={colonStyle}>
          :
        </span>
        <span className="text-[11px] md:text-xs font-bold tabular-nums" style={digitStyle}>
          {minutes}
        </span>
        <span className="text-[11px] md:text-xs font-bold" style={colonStyle}>
          :
        </span>
        <span className="text-[11px] md:text-xs font-bold tabular-nums" style={digitStyle}>
          {seconds}
        </span>
      </div>
    </div>
  );
}
