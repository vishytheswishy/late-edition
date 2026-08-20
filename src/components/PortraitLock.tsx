"use client";

// The mobile web cannot truly lock orientation (iOS has no
// screen.orientation.lock outside fullscreen), so this is the standard
// pattern: on phones turned to landscape, a full-screen card asks for
// portrait. Rendered on the homepage only; the max-height guard keeps
// desktops and tablets untouched.
export default function PortraitLock() {
  return (
    <div className="fixed inset-0 z-[9995] bg-white hidden [@media(orientation:landscape)_and_(max-height:500px)]:flex flex-col items-center justify-center gap-4">
      {/* Phone glyph, tipped over */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-black rotate-90"
        aria-hidden
      >
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18.5" x2="13" y2="18.5" />
      </svg>
      <p className="text-[11px] uppercase tracking-[0.3em] text-black font-medium">
        Please rotate your phone
      </p>
      <p
        className="text-[10px] uppercase tracking-[0.2em] font-mono"
        style={{ color: "#dc2626" }}
      >
        Best enjoyed in portrait
      </p>
    </div>
  );
}
