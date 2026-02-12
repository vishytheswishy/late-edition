"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TransitionPhase = "idle" | "fading-out" | "black" | "fading-in";

interface BookTransitionContextValue {
  phase: TransitionPhase;
  /** Fade to black, then call onBlack once fully opaque */
  fadeOut: (onBlack: () => void) => void;
  /** Fade from black back to transparent */
  fadeIn: () => void;
}

const BookTransitionContext = createContext<
  BookTransitionContextValue | undefined
>(undefined);

export function useBookTransition() {
  const ctx = useContext(BookTransitionContext);
  if (!ctx)
    throw new Error(
      "useBookTransition must be used inside BookTransitionProvider"
    );
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Durations                                                          */
/* ------------------------------------------------------------------ */

const FADE_OUT_MS = 350;
const FADE_IN_MS = 400;

/* ------------------------------------------------------------------ */
/*  Provider + Overlay                                                 */
/* ------------------------------------------------------------------ */

export function BookTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const onBlackRef = useRef<(() => void) | null>(null);

  /* ---------- fadeOut ---------- */
  const fadeOut = useCallback((onBlack: () => void) => {
    onBlackRef.current = onBlack;
    setPhase("fading-out");
  }, []);

  // Once the CSS transition ends and we're fully black, fire the callback
  useEffect(() => {
    if (phase !== "fading-out") return;
    const timer = setTimeout(() => {
      setPhase("black");
      onBlackRef.current?.();
      onBlackRef.current = null;
    }, FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  /* ---------- fadeIn ---------- */
  const fadeIn = useCallback(() => {
    setPhase("fading-in");
    setTimeout(() => {
      setPhase("idle");
    }, FADE_IN_MS);
  }, []);

  /* ---------- Context value ---------- */
  const value: BookTransitionContextValue = { phase, fadeOut, fadeIn };

  const isVisible = phase !== "idle";
  const isOpaque = phase === "black" || phase === "fading-out";

  return (
    <BookTransitionContext.Provider value={value}>
      {children}

      {/* Full-screen black overlay */}
      {isVisible && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 150,
            pointerEvents: "none",
            backgroundColor: "#000",
            opacity: isOpaque ? 1 : 0,
            transition:
              phase === "fading-out"
                ? `opacity ${FADE_OUT_MS}ms ease-in`
                : `opacity ${FADE_IN_MS}ms ease-out`,
          }}
        />
      )}
    </BookTransitionContext.Provider>
  );
}
