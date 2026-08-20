"use client";

import { useState, useEffect } from "react";

export default function BombClock({
  accent = "#dc2626",
}: {
  accent?: string;
}) {
  const [time, setTime] = useState<string>("");
  const [suffix, setSuffix] = useState<string>("");
  const [colonVisible, setColonVisible] = useState(true);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    const update = () => {
      const parts = formatter.formatToParts(new Date());
      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "";
      setTime(`${get("hour")}:${get("minute")}:${get("second")}`);
      // e.g. "AM PDT" / "PM PST"
      setSuffix(`${get("dayPeriod")} ${get("timeZoneName")}`);
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
    color: accent,
    letterSpacing: "-0.05em",
    transform: "scaleY(1.3)",
    display: "inline-block",
  };

  const colonStyle: React.CSSProperties = {
    color: accent,
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
        className="text-[13px] md:text-sm uppercase tracking-wider font-medium"
        style={{ color: accent }}
      >
        Orange County, CA
      </p>

      {/* Time */}
      <div className="flex items-center leading-none">
        <span className="text-[13px] md:text-sm font-bold tabular-nums" style={digitStyle}>
          {hours}
        </span>
        <span className="text-[13px] md:text-sm font-bold" style={colonStyle}>
          :
        </span>
        <span className="text-[13px] md:text-sm font-bold tabular-nums" style={digitStyle}>
          {minutes}
        </span>
        <span className="text-[13px] md:text-sm font-bold" style={colonStyle}>
          :
        </span>
        <span className="text-[13px] md:text-sm font-bold tabular-nums" style={digitStyle}>
          {seconds}
        </span>
      </div>

      {/* AM/PM + Pacific zone */}
      <p
        className="text-[10px] md:text-[11px] uppercase tracking-wider font-medium"
        style={{ color: accent }}
      >
        {suffix}
      </p>
    </div>
  );
}
