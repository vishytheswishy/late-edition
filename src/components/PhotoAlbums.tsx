"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Album, AlbumPhoto } from "@/lib/albums";
import type { IntroPhase, PageData } from "./book/types";
import { groupPhotosIntoPages } from "./book/textures";
import BookScene from "./book/BookScene";
import BookPile from "./book/BookPile";
import { BookUI } from "./book/ControlBar";
import DownloadModal from "./book/DownloadModal";
import FlatPageViewer from "./book/FlatViewer";
import { CAMERA_POS } from "./book/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AppState = "loading" | "browsing" | "opening" | "reading" | "closing";

interface AlbumPages {
  pageDataList: PageData[];
  pageCount: number;
}

/* ------------------------------------------------------------------ */
/*  Mobile detection                                                   */
/* ------------------------------------------------------------------ */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ------------------------------------------------------------------ */
/*  Browsing overlay                                                   */
/* ------------------------------------------------------------------ */

function BrowsingOverlay({
  albums,
  activeIndex,
  onCycleNext,
  onCyclePrev,
  onOpen,
}: {
  albums: Album[];
  activeIndex: number;
  onCycleNext: () => void;
  onCyclePrev: () => void;
  onOpen: () => void;
}) {
  const album = albums[activeIndex];
  const total = albums.length;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end pb-4 md:pb-6">
      <div className="pointer-events-auto mx-auto max-w-lg w-[calc(100%-2rem)] rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_2px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] px-4 py-4 md:py-5">
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-sm md:text-base font-light tracking-tight text-black/80 text-center truncate w-full">
            {album?.title}
          </h2>
          <div className="flex items-center gap-4">
            {total > 1 && (
              <button
                onClick={onCyclePrev}
                className="w-10 h-10 md:w-9 md:h-9 rounded-full border border-white/30 bg-white/20 flex items-center justify-center hover:bg-white/40 active:bg-white/50 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <button
              onClick={onOpen}
              className="px-6 py-2.5 rounded-full bg-black text-white text-xs uppercase tracking-wider hover:bg-black/80 active:bg-black/90 transition-colors"
            >
              Open Album
            </button>
            {total > 1 && (
              <button
                onClick={onCycleNext}
                className="w-10 h-10 md:w-9 md:h-9 rounded-full border border-white/30 bg-white/20 flex items-center justify-center hover:bg-white/40 active:bg-white/50 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
          {total > 1 && (
            <p className="text-[10px] uppercase tracking-wider text-black/30">
              {activeIndex + 1} / {total}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Persistent scene elements (desk, lights)                           */
/* ------------------------------------------------------------------ */

function SceneFixtures() {
  return (
    <>
      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>

      <directionalLight
        position={[2, 5, 2]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <ambientLight intensity={0.35} />

      {/* Desk surface */}
      <mesh position={[0, -1.8, -0.2]} receiveShadow castShadow>
        <boxGeometry args={[8, 0.08, 6]} />
        <meshStandardMaterial color="#b08960" roughness={0.8} metalness={0.05} />
      </mesh>

      {/* Shadow catcher */}
      <mesh position={[0, -1.85, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main orchestrator                                                  */
/* ------------------------------------------------------------------ */

export default function PhotoAlbums({ albums }: { albums: Album[] }) {
  const [state, setState] = useState<AppState>("loading");
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingAlbumName, setLoadingAlbumName] = useState("");
  const [completedAlbumCount, setCompletedAlbumCount] = useState(0);
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState(0);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [introPhase, setIntroPhase] = useState<IntroPhase>("laying");
  const [selectedPhoto, setSelectedPhoto] = useState<AlbumPhoto | null>(null);
  const [viewMode, setViewMode] = useState<"3d" | "flat" | null>(null);
  const isMobile = useIsMobile();

  const [allAlbumPages, setAllAlbumPages] = useState<AlbumPages[]>([]);
  const pageFlipCooldownRef = useRef(0);
  const PAGE_FLIP_COOLDOWN = 300; // ms – one page-turn animation

  // ── Eye-blink transition ──
  const [blinkPhase, setBlinkPhase] = useState<
    "idle" | "closing" | "black" | "revealing"
  >("idle");
  const blinkCallbackRef = useRef<(() => void) | null>(null);

  const triggerBlink = useCallback((onBlack: () => void) => {
    if (blinkPhase !== "idle") return;
    blinkCallbackRef.current = onBlack;
    setBlinkPhase("closing");
  }, [blinkPhase]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (blinkPhase === "closing") {
      t = setTimeout(() => {
        blinkCallbackRef.current?.();
        blinkCallbackRef.current = null;
        setBlinkPhase("black");
      }, 300);
    } else if (blinkPhase === "black") {
      t = setTimeout(() => setBlinkPhase("revealing"), 100);
    } else if (blinkPhase === "revealing") {
      t = setTimeout(() => setBlinkPhase("idle"), 500);
    }
    return () => clearTimeout(t);
  }, [blinkPhase]);

  useEffect(() => {
    setViewMode(isMobile ? "flat" : "3d");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load all album textures on mount
  useEffect(() => {
    if (albums.length === 0) {
      setState("browsing");
      return;
    }

    let cancelled = false;

    async function loadAll() {
      const results: AlbumPages[] = [];
      let completed = 0;

      for (const album of albums) {
        if (cancelled) return;
        setLoadingAlbumName(album.title);
        const { pageDataPromises, pageCount } = groupPhotosIntoPages(
          album.photos,
          album.title,
          album.coverImage || null,
          album.createdAt || null
        );
        const pageDataList = await Promise.all(pageDataPromises);
        results.push({ pageDataList, pageCount });
        completed++;
        if (!cancelled) {
          setCompletedAlbumCount(completed);
          setLoadProgress(Math.round((completed / albums.length) * 100));
        }
      }

      if (!cancelled) {
        setAllAlbumPages(results);
        setState("browsing");
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [albums]);

  const total = albums.length;
  const currentAlbumPages = allAlbumPages[selectedAlbumIndex] ?? null;
  const currentAlbum = albums[selectedAlbumIndex] ?? null;

  // ── Browsing cycling ──

  const handleBrowseIndexChange = useCallback((index: number) => {
    setBrowseIndex(index);
  }, []);

  // ── Selection / Opening ──

  const handleSelectAlbum = useCallback(
    (index: number) => {
      triggerBlink(() => {
        setSelectedAlbumIndex(index);
        setBrowseIndex(index);
        setPage(0);
        setIntroPhase("laying");
        setState("opening");
      });
    },
    [triggerBlink]
  );

  const handleOpenFromOverlay = useCallback(() => {
    handleSelectAlbum(browseIndex);
  }, [browseIndex, handleSelectAlbum]);

  const cycleNext = useCallback(() => {
    setBrowseIndex((i) => (i + 1) % total);
  }, [total]);

  const cyclePrev = useCallback(() => {
    setBrowseIndex((i) => (i - 1 + total) % total);
  }, [total]);

  // ── Reading ──

  const handleIntroPhaseChange = useCallback(
    (phase: IntroPhase) => {
      setIntroPhase(phase);
      if (phase === "done" && state === "opening") {
        setState("reading");
      }
    },
    [state]
  );

  useEffect(() => {
    if (introPhase === "opening" && page === 0) {
      setPage(1);
    }
  }, [introPhase, page]);

  const handleBackToAlbums = useCallback(() => {
    if (viewMode !== "3d") {
      setState("browsing");
      setPage(0);
      return;
    }
    triggerBlink(() => {
      setState("browsing");
      setPage(0);
    });
  }, [viewMode, triggerBlink]);

  const handleSetPage = useCallback(
    (p: number) => {
      if (!currentAlbumPages) return;
      const now = Date.now();
      if (now - pageFlipCooldownRef.current < PAGE_FLIP_COOLDOWN) return;
      pageFlipCooldownRef.current = now;
      setPage(Math.max(0, Math.min(p, currentAlbumPages.pageCount)));
    },
    [currentAlbumPages]
  );

  useEffect(() => {
    if (state !== "reading" || viewMode !== "3d" || introPhase !== "done") return;
    if (!currentAlbumPages) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const now = Date.now();
        if (now - pageFlipCooldownRef.current < PAGE_FLIP_COOLDOWN) return;
        pageFlipCooldownRef.current = now;
        if (e.key === "ArrowRight")
          setPage((p) => Math.min(p + 1, currentAlbumPages.pageCount));
        else
          setPage((p) => Math.max(p - 1, 0));
      }
      if (e.key === "Escape") {
        if (selectedPhoto) {
          setSelectedPhoto(null);
        } else {
          handleBackToAlbums();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, viewMode, introPhase, currentAlbumPages, selectedPhoto, handleBackToAlbums]);

  const handleExpand = useCallback(() => {
    setIntroPhase("laying");
    setPage(0);
    setViewMode("3d");
  }, []);

  const handleMinimize = useCallback(() => {
    setViewMode("flat");
  }, []);

  // ─── Loading state ───
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-8">
        <style>{`
          @keyframes bookOpen {
            0%, 10%, 90%, 100% { transform: rotateY(0deg); }
            30%, 70% { transform: rotateY(-160deg); }
          }
          @keyframes pageFlip1 {
            0%, 15%, 85%, 100% { transform: rotateY(0deg); }
            35%, 65% { transform: rotateY(-150deg); }
          }
          @keyframes pageFlip2 {
            0%, 20%, 80%, 100% { transform: rotateY(0deg); }
            40%, 60% { transform: rotateY(-130deg); }
          }
        `}</style>

        {/* Animated book */}
        <div style={{ perspective: 500 }}>
          <div className="relative w-14 h-[72px]" style={{ transformStyle: "preserve-3d" }}>
            {/* Back cover */}
            <div className="absolute inset-0 rounded-r bg-[#2a1a0a] shadow-lg" />
            {/* Page block (visible when open) */}
            <div className="absolute top-1 bottom-1 left-0 right-2 rounded-r-sm bg-[#f5f0e8]" />
            {/* Page 2 */}
            <div
              className="absolute top-0.5 bottom-0.5 left-0 right-1.5 rounded-r-sm bg-[#faf6ef]"
              style={{
                transformOrigin: "left",
                animation: "pageFlip2 3.5s ease-in-out infinite",
                backfaceVisibility: "hidden",
              }}
            />
            {/* Page 1 */}
            <div
              className="absolute top-0.5 bottom-0.5 left-0 right-1.5 rounded-r-sm bg-[#f5f0e8]"
              style={{
                transformOrigin: "left",
                animation: "pageFlip1 3.5s ease-in-out infinite",
                backfaceVisibility: "hidden",
              }}
            />
            {/* Front cover */}
            <div
              className="absolute inset-0 rounded-r bg-[#1a1a2a] shadow-md"
              style={{
                transformOrigin: "left",
                animation: "bookOpen 3.5s ease-in-out infinite",
                backfaceVisibility: "hidden",
              }}
            />
          </div>
        </div>

        {/* Progress info */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-light text-black/50 min-h-[20px] transition-all duration-300">
            {loadingAlbumName}
          </p>
          {albums.length <= 10 ? (
            <div className="flex items-center gap-1.5">
              {albums.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all duration-700"
                  style={{
                    backgroundColor:
                      i < completedAlbumCount
                        ? "rgba(0,0,0,0.3)"
                        : "rgba(0,0,0,0.08)",
                    transform:
                      i < completedAlbumCount ? "scale(1)" : "scale(0.75)",
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-[10px] uppercase tracking-widest text-black/25">
              {completedAlbumCount} of {albums.length}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── No albums ───
  if (albums.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-sm text-black/40 font-light">No albums yet.</p>
      </div>
    );
  }

  // ─── Flat viewer mode ───
  if (
    viewMode === "flat" &&
    (state === "reading" || state === "opening") &&
    currentAlbumPages &&
    currentAlbum
  ) {
    return (
      <FlatPageViewer
        title={currentAlbum.title}
        pageDataList={currentAlbumPages.pageDataList}
        onExpand={handleExpand}
        onBack={handleBackToAlbums}
      />
    );
  }

  // ─── Determine which 3D components are active ───
  const showPile = state === "browsing";
  const showBook = state === "opening" || state === "reading";
  const isReading = showBook;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#fafafa] relative">
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          camera={{
            position: [CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z],
            fov: 40,
          }}
          style={{ background: "#fafafa" }}
        >
          {/* Persistent scene: desk, lights, env */}
          <SceneFixtures />

          {/* Book pile: rendered during browsing AND opening (fades out during opening) */}
          {showPile && (
            <BookPile
              albums={albums.map((a) => ({
                title: a.title,
                coverImage: a.coverImage,
                slug: a.slug,
                date: a.createdAt,
              }))}
              activeIndex={browseIndex}
              opening={false}
              onSelect={handleSelectAlbum}
              onActiveIndexChange={handleBrowseIndexChange}
            />
          )}

          {/* Book reader: rendered during opening, reading, closing */}
          {showBook && currentAlbumPages && (
            <BookScene
              pageDataList={currentAlbumPages.pageDataList}
              page={page}
              introPhase={introPhase}
              onIntroPhaseChange={handleIntroPhaseChange}
              onPhotoClick={setSelectedPhoto}
            />
          )}
        </Canvas>
      </div>

      {/* DOM: browsing controls (only in browsing state, not during opening) */}
      {state === "browsing" && (
        <BrowsingOverlay
          albums={albums}
          activeIndex={browseIndex}
          onCycleNext={cycleNext}
          onCyclePrev={cyclePrev}
          onOpen={handleOpenFromOverlay}
        />
      )}

      {/* DOM: reading controls */}
      {isReading && currentAlbum && currentAlbumPages && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <BookUI
            title={currentAlbum.title}
            page={page}
            totalPages={currentAlbumPages.pageCount}
            onSetPage={handleSetPage}
            onMinimize={handleMinimize}
            onBack={handleBackToAlbums}
            showControls={introPhase === "done" && state === "reading"}
          />
        </div>
      )}

      {selectedPhoto && (
        <DownloadModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {/* Eye-blink transition overlay */}
      <div
        className="absolute inset-0 z-50 pointer-events-none bg-black"
        style={{
          opacity: blinkPhase === "closing" || blinkPhase === "black" ? 1 : 0,
          transition:
            blinkPhase === "closing"
              ? "opacity 300ms ease-in"
              : blinkPhase === "revealing"
                ? "opacity 500ms ease-out"
                : "none",
        }}
      />
    </div>
  );
}
