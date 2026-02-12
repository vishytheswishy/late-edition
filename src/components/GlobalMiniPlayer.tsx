"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useMusic } from "@/context/MusicPlayerContext";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function GlobalMiniPlayer() {
  const pathname = usePathname();
  const {
    state,
    activeMix,
    coverArt,
    toggle,
    miniPlayerDismissed,
    dismissMiniPlayer,
  } = useMusic();

  // Hide on the music page itself, or when dismissed, or when no track is active
  const isOnMusicPage = pathname === "/music";
  const visible = !!activeMix && !isOnMusicPage && !miniPlayerDismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-4 right-4 z-[90] w-[300px] bg-white/70 backdrop-blur-xl border border-black/10 rounded-xl shadow-lg overflow-hidden"
        >
          {/* Progress bar at top */}
          <div className="h-[2px] bg-black/5 w-full">
            <div
              className="h-full bg-black/40 transition-none"
              style={{ width: `${state.position * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2.5 p-3">
            {/* Thumbnail */}
            {coverArt ? (
              <Link href="/music" className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/5 shadow-sm">
                  <img
                    src={coverArt}
                    alt={activeMix!.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
            ) : (
              <Link href="/music" className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-black/30"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
              </Link>
            )}

            {/* Track info — links back to music page */}
            <Link href="/music" className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-black truncate leading-tight">
                {activeMix!.title}
              </p>
              <p className="text-[10px] text-black/40 truncate leading-tight">
                {activeMix!.artist}
              </p>
              <p className="text-[9px] text-black/25 tabular-nums mt-0.5">
                {formatTime(state.position * state.duration)}
                {state.duration > 0 && (
                  <span> / {formatTime(state.duration)}</span>
                )}
              </p>
            </Link>

            {/* Play/pause */}
            <button
              onClick={toggle}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 active:scale-95 transition-all cursor-pointer"
            >
              {state.isPlaying ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="currentColor"
                  className="text-black"
                >
                  <rect x="1" y="1" width="4" height="12" rx="1" />
                  <rect x="9" y="1" width="4" height="12" rx="1" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="currentColor"
                  className="text-black ml-0.5"
                >
                  <path d="M3 1.5v11l9-5.5L3 1.5z" />
                </svg>
              )}
            </button>

            {/* Dismiss */}
            <button
              onClick={dismissMiniPlayer}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-black/30"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
