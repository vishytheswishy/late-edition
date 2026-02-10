"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSoundCloud } from "@/hooks/useSoundCloud";
import AudioBars from "@/components/AudioBars";

// Dynamic import to avoid SSR issues with Three.js
const Vinyl3D = dynamic(() => import("@/components/Vinyl3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-xs uppercase tracking-wider text-black/40">
        Loading...
      </p>
    </div>
  ),
});

// ── Data ──

import type { Mix, StaffPick } from "@/lib/music";

// ── Helpers ──

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ── Component ──

export default function MusicPage() {
  const { state, loadTrack, toggle, seekTo, setVolume, analyserRef } = useSoundCloud();
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const [scrubPos, setScrubPos] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const mobileProgressRef = useRef<HTMLDivElement>(null);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [playerCollapsed, setPlayerCollapsed] = useState(true);
  const [swapKey, setSwapKey] = useState(0);
  const [coverArt, setCoverArt] = useState<string | undefined>(undefined);
  const pendingTrackUrl = useRef<string | null>(null);
  const [mixesList, setMixesList] = useState<Mix[]>([]);
  const [staffPicksList, setStaffPicksList] = useState<StaffPick[]>([]);

  // Fetch music data from API (auto-seeds from lateedition.org on first call)
  useEffect(() => {
    fetch("/api/music")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.mixes?.length) setMixesList(data.mixes);
          if (data.staffPicks?.length) setStaffPicksList(data.staffPicks);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectMix = useCallback(
    (mix: Mix) => {
      if (activeMixId === mix.id) {
        // Same track — toggle play/pause
        toggle();
      } else {
        // New track — pre-fetch artwork, then start swap animation
        setActiveMixId(mix.id);
        pendingTrackUrl.current = mix.url;

        // Fetch cover art via SoundCloud oEmbed before the vinyl enters
        fetch(
          `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(mix.url)}`
        )
          .then((r) => r.json())
          .then((data) => {
            const thumb = data.thumbnail_url as string | undefined;
            if (thumb) {
              // oEmbed returns a small thumbnail — swap to 500x500
              setCoverArt(thumb.replace("-large", "-t500x500"));
            } else {
              setCoverArt(undefined);
            }
          })
          .catch(() => setCoverArt(undefined))
          .finally(() => {
            // Start the swap animation after artwork is ready
            setSwapKey((k) => k + 1);
          });
      }
    },
    [activeMixId, toggle]
  );

  const handleVinylPlaced = useCallback(() => {
    if (pendingTrackUrl.current) {
      loadTrack(pendingTrackUrl.current);
      pendingTrackUrl.current = null;
    }
  }, [loadTrack]);

  const volumeBeforeScrub = useRef(state.volume);

  const handleVinylScrub = useCallback(
    (delta: number) => {
      const newPos = Math.max(0, Math.min(1, state.position + delta));
      seekTo(newPos);
    },
    [state.position, seekTo]
  );

  const handleVinylScrubStart = useCallback(() => {
    volumeBeforeScrub.current = state.volume;
    setVolume(0);
  }, [state.volume, setVolume]);

  const handleVinylScrubEnd = useCallback(() => {
    setVolume(volumeBeforeScrub.current);
  }, [setVolume]);

  // Keep coverArt in sync once the SoundCloud widget provides artwork
  useEffect(() => {
    if (state.artworkUrl) {
      setCoverArt(state.artworkUrl);
    }
  }, [state.artworkUrl]);

  const activeMix = mixesList.find((m) => m.id === activeMixId);

  // Scrub helpers — use a ref so pointer-move/up always see latest value
  const getScrubPosition = useCallback((clientX: number) => {
    const el = mobileProgressRef.current ?? progressRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleScrubStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      scrubbingRef.current = true;
      setScrubbing(true);
      const pos = getScrubPosition(e.clientX);
      setScrubPos(pos);
    },
    [getScrubPosition]
  );

  const handleScrubMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbingRef.current) return;
      e.stopPropagation();
      setScrubPos(getScrubPosition(e.clientX));
    },
    [getScrubPosition]
  );

  const handleScrubEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbingRef.current) return;
      e.stopPropagation();
      scrubbingRef.current = false;
      setScrubbing(false);
      const pos = getScrubPosition(e.clientX);
      seekTo(pos);
    },
    [getScrubPosition, seekTo]
  );

  const displayPosition = scrubbing ? scrubPos : state.position;

  // Animation variants
  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* ── Hero: 3D Turntable + Mixes sidebar ── */}
      <section className="relative w-full border-b border-black/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-stretch min-h-[60vh] md:min-h-[70vh]">
            {/* 3D Vinyl with glass overlay */}
            <div className="relative flex-1 min-h-[350px] md:min-h-0 bg-gray-50 overflow-hidden">
              <AudioBars isPlaying={state.isPlaying} analyserNode={analyserRef.current} />
              <div className="absolute inset-0 z-[1]">
                <Vinyl3D
                  isPlaying={state.isPlaying}
                  onToggle={activeMixId ? toggle : undefined}
                  artworkUrl={coverArt}
                  swapKey={swapKey}
                  onPlaced={handleVinylPlaced}
                  onScrub={activeMixId ? handleVinylScrub : undefined}
                  onScrubStart={activeMixId ? handleVinylScrubStart : undefined}
                  onScrubEnd={activeMixId ? handleVinylScrubEnd : undefined}
                />
              </div>

              {/* Glass "Now Playing" overlay */}
              <AnimatePresence>
                {activeMix && (
                  <motion.div
                    key={activeMix.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.3 }}
                    className="absolute bottom-2 left-2 right-2 md:left-6 md:right-6 md:bottom-6 z-10 bg-white/60 backdrop-blur-xl border border-white/30 rounded-lg md:rounded-xl shadow-lg overflow-hidden"
                  >
                    {/* ── Mobile: collapsed mini bar ── */}
                    <div
                      className="md:hidden cursor-pointer"
                      onClick={() => setPlayerCollapsed((c) => !c)}
                    >
                      {/* Thin progress line at top */}
                      <div className="h-[2px] bg-black/10 w-full">
                        <div
                          className="h-full bg-black/40 transition-none"
                          style={{ width: `${displayPosition * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2">
                        {/* Play/pause button */}
                        <button
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-95 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle();
                          }}
                        >
                          {state.isPlaying ? (
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="currentColor" className="text-black">
                              <rect x="1" y="1" width="4" height="12" rx="1" />
                              <rect x="9" y="1" width="4" height="12" rx="1" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="currentColor" className="text-black ml-0.5">
                              <path d="M3 1.5v11l9-5.5L3 1.5z" />
                            </svg>
                          )}
                        </button>

                        {/* Track info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-black truncate leading-tight">
                            {activeMix.title}
                          </p>
                          <p className="text-[10px] text-black/40 truncate leading-tight">
                            {activeMix.artist}
                          </p>
                        </div>

                        {/* Time */}
                        <span className="text-[10px] text-black/30 tabular-nums flex-shrink-0">
                          {formatTime(displayPosition * state.duration)}
                        </span>

                        {/* Chevron */}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`text-black/30 flex-shrink-0 transition-transform duration-200 ${playerCollapsed ? "" : "rotate-180"}`}
                        >
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </div>

                      {/* ── Mobile expanded content ── */}
                      <AnimatePresence>
                        {!playerCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3 pb-2.5 pt-0.5 space-y-2">
                              {/* Scrubbable progress bar */}
                              <div className="space-y-1">
                                <div
                                  ref={mobileProgressRef}
                                  className="relative w-full h-5 flex items-center cursor-pointer group touch-none select-none"
                                  onPointerDown={handleScrubStart}
                                  onPointerMove={handleScrubMove}
                                  onPointerUp={handleScrubEnd}
                                  onPointerCancel={handleScrubEnd}
                                  onLostPointerCapture={() => {
                                    if (scrubbingRef.current) {
                                      scrubbingRef.current = false;
                                      setScrubbing(false);
                                    }
                                  }}
                                >
                                  <div className="absolute inset-x-0 h-[2px] bg-black/10 rounded-full overflow-hidden top-1/2 -translate-y-1/2">
                                    <div
                                      className="h-full bg-black/50 rounded-full transition-none"
                                      style={{ width: `${displayPosition * 100}%` }}
                                    />
                                  </div>
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                    style={{ left: `${displayPosition * 100}%` }}
                                  />
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[10px] text-black/30 tabular-nums">
                                    {formatTime(displayPosition * state.duration)}
                                  </span>
                                  <span className="text-[10px] text-black/30 tabular-nums">
                                    {state.duration > 0 ? formatTime(state.duration) : "--:--"}
                                  </span>
                                </div>
                              </div>

                              {/* Volume */}
                              <div className="flex items-center gap-2">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-black/35 flex-shrink-0 cursor-pointer"
                                  onClick={() => setVolume(state.volume > 0 ? 0 : 80)}
                                >
                                  {state.volume === 0 ? (
                                    <>
                                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                      <line x1="23" y1="9" x2="17" y2="15" />
                                      <line x1="17" y1="9" x2="23" y2="15" />
                                    </>
                                  ) : (
                                    <>
                                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                      <path d="M15.54 8.46a5 5 0 010 7.07" />
                                    </>
                                  )}
                                </svg>
                                <div
                                  className="relative flex-1 h-5 flex items-center cursor-pointer touch-none"
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const vol = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                                    setVolume(vol);
                                  }}
                                  onPointerMove={(e) => {
                                    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const vol = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                                    setVolume(vol);
                                  }}
                                  onPointerUp={(e) => {
                                    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                                  }}
                                >
                                  <div className="absolute inset-x-0 h-[2px] bg-black/10 rounded-full overflow-hidden top-1/2 -translate-y-1/2">
                                    <div
                                      className="h-full bg-black/40 rounded-full transition-none"
                                      style={{ width: `${state.volume}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ── Desktop: full player (unchanged) ── */}
                    <div className="hidden md:block px-5 py-4">
                      {/* Volume control — top right */}
                      <div className="absolute top-3 right-4 flex items-center gap-2 group/vol">
                        <div
                          className="relative w-0 group-hover/vol:w-20 h-5 flex items-center overflow-hidden transition-all duration-200 cursor-pointer touch-none"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                            const rect = e.currentTarget.getBoundingClientRect();
                            const vol = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                            setVolume(vol);
                          }}
                          onPointerMove={(e) => {
                            if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const vol = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                            setVolume(vol);
                          }}
                          onPointerUp={(e) => {
                            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                          }}
                        >
                          <div className="absolute inset-x-0 h-[2px] bg-black/10 rounded-full overflow-hidden top-1/2 -translate-y-1/2">
                            <div
                              className="h-full bg-black/40 rounded-full transition-none"
                              style={{ width: `${state.volume}%` }}
                            />
                          </div>
                        </div>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-black/35 flex-shrink-0 cursor-pointer hover:text-black/60 transition-colors"
                          onClick={() => setVolume(state.volume > 0 ? 0 : 80)}
                        >
                          {state.volume === 0 ? (
                            <>
                              <path d="M11 5L6 9H2v6h4l5 4V5z" />
                              <line x1="23" y1="9" x2="17" y2="15" />
                              <line x1="17" y1="9" x2="23" y2="15" />
                            </>
                          ) : (
                            <>
                              <path d="M11 5L6 9H2v6h4l5 4V5z" />
                              {state.volume > 50 && (
                                <path d="M19.07 4.93a10 10 0 010 14.14" />
                              )}
                              <path d="M15.54 8.46a5 5 0 010 7.07" />
                            </>
                          )}
                        </svg>
                      </div>

                      <p className="text-[10px] uppercase tracking-widest text-black/40 mb-2">
                        Now Playing
                      </p>
                      <h2 className="text-base font-medium tracking-tight text-black leading-snug mb-1 truncate">
                        {activeMix.title}
                      </h2>
                      <p className="text-xs text-black/50 mb-4">{activeMix.artist}</p>

                      {/* Scrubbable progress bar */}
                      <div className="space-y-1.5">
                        <div
                          ref={progressRef}
                          className="relative w-full h-5 flex items-center cursor-pointer group touch-none select-none"
                          onPointerDown={handleScrubStart}
                          onPointerMove={handleScrubMove}
                          onPointerUp={handleScrubEnd}
                          onPointerCancel={handleScrubEnd}
                          onLostPointerCapture={() => {
                            if (scrubbingRef.current) {
                              scrubbingRef.current = false;
                              setScrubbing(false);
                            }
                          }}
                        >
                          <div className="absolute inset-x-0 h-[2px] bg-black/10 rounded-full overflow-hidden top-1/2 -translate-y-1/2">
                            <div
                              className="h-full bg-black/50 rounded-full transition-none"
                              style={{ width: `${displayPosition * 100}%` }}
                            />
                          </div>
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            style={{ left: `${displayPosition * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-black/30 tabular-nums">
                            {formatTime(displayPosition * state.duration)}
                          </span>
                          <span className="text-[10px] text-black/30 tabular-nums">
                            {state.duration > 0 ? formatTime(state.duration) : "--:--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mixes sidebar */}
            <div className="flex flex-col md:w-[320px] lg:w-[380px] border-t md:border-t-0 md:border-l border-black/10">
              <div className="px-5 pt-5 pb-3 md:px-6 md:pt-6 md:pb-3">
                <h2 className="text-lg font-normal tracking-tight text-black">
                  Mixes
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-black/10 border-t border-black/10">
                {mixesList.map((mix, index) => {
                  const isActive = activeMixId === mix.id;
                  const isPlaying = isActive && state.isPlaying;

                  return (
                    <button
                      key={mix.id}
                      onClick={() => handleSelectMix(mix)}
                      className={`w-full flex items-center gap-3 py-3.5 px-5 md:px-6 text-left transition-colors cursor-pointer group ${
                        isActive ? "bg-gray-50" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="w-6 flex-shrink-0 flex items-center justify-center">
                        {isPlaying ? (
                          <div className="flex items-end gap-[2px] h-3.5">
                            <span className="w-[2.5px] bg-black/70 rounded-full animate-pulse" style={{ height: "60%", animationDelay: "0ms" }} />
                            <span className="w-[2.5px] bg-black/70 rounded-full animate-pulse" style={{ height: "100%", animationDelay: "150ms" }} />
                            <span className="w-[2.5px] bg-black/70 rounded-full animate-pulse" style={{ height: "40%", animationDelay: "300ms" }} />
                          </div>
                        ) : (
                          <span className="text-[11px] text-black/30 tabular-nums group-hover:hidden">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        )}
                        {!isPlaying && (
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 14 14"
                            fill="currentColor"
                            className="text-black/50 hidden group-hover:block"
                          >
                            <path d="M3 1.5v11l9-5.5L3 1.5z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs md:text-sm truncate ${
                            isActive
                              ? "text-black font-medium"
                              : "text-black/80 group-hover:text-black"
                          }`}
                        >
                          {mix.title}
                        </p>
                        <p className="text-[11px] text-black/40 mt-0.5 truncate">{mix.artist}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 py-4 md:px-6 border-t border-black/10 flex justify-center">
                <Link
                  href="https://soundcloud.com/lateedition"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black/70 transition-colors"
                >
                  View All Mixes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Staff Picks Section ── */}
      <section className="py-16 md:py-20 border-t border-black/10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-normal tracking-tight text-black">
              Staff Picks
            </h2>
          </motion.div>

          <motion.div
            key={staffPicksList.length}
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
          >
            {staffPicksList.map((pick) => (
              <motion.a
                key={pick.id}
                variants={itemVariants}
                href={pick.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border border-black/10 p-6 hover:bg-gray-50 transition-colors"
              >
                <p className="text-lg font-normal tracking-tight text-black mb-1">
                  {pick.name}
                </p>
                <p className="text-xs text-black/40 mb-6">{pick.label}</p>
                <div className="flex items-center gap-1.5 text-black/30 group-hover:text-black/60 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-widest">
                    Listen on Spotify
                  </span>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
