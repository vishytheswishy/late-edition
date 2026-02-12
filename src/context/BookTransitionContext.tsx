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

export type TransitionPhase =
  | "idle"
  | "exiting"
  | "holding"
  | "entering"
  | "done";

export interface TransitionData {
  coverDataUrl: string;
  originRect: DOMRect;
  slug: string;
}

interface BookTransitionContextValue {
  phase: TransitionPhase;
  data: TransitionData | null;
  startTransition: (data: TransitionData) => void;
  /** Move to "holding" — call once the cover fills the viewport */
  holdTransition: () => void;
  /** Move to "entering" — call on detail page once 3D scene is ready */
  enterTransition: (targetRect?: DOMRect) => void;
  /** Clean up — call once entry animation is fully complete */
  clearTransition: () => void;
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
/*  Durations (ms)                                                     */
/* ------------------------------------------------------------------ */

const EXIT_DURATION = 450;
const ENTER_DURATION = 600;
const FADE_DURATION = 400;

/* ------------------------------------------------------------------ */
/*  Provider + Overlay                                                 */
/* ------------------------------------------------------------------ */

export function BookTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [data, setData] = useState<TransitionData | null>(null);

  // Track overlay style separately for transform animations
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  // Ref to avoid stale closures in callbacks
  const phaseRef = useRef<TransitionPhase>("idle");
  phaseRef.current = phase;

  /* ---------- startTransition ---------- */
  const startTransition = useCallback((incoming: TransitionData) => {
    setData(incoming);
    setOverlayOpacity(1);
    setOverlayVisible(true);

    // Position the overlay at the book's screen rect
    const { originRect } = incoming;
    setOverlayStyle({
      left: originRect.left,
      top: originRect.top,
      width: originRect.width,
      height: originRect.height,
      transform: "none",
      transition: "none",
      borderRadius: "4px",
    });

    setPhase("exiting");

    // After one frame, animate to fullscreen
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
        const d = `${EXIT_DURATION}ms`;
        setOverlayStyle({
          left: 0,
          top: 0,
          width: "100vw",
          height: "100vh",
          transform: "none",
          transition: [
            `left ${d} ${ease}`,
            `top ${d} ${ease}`,
            `width ${d} ${ease}`,
            `height ${d} ${ease}`,
            `border-radius ${d} ${ease}`,
          ].join(", "),
          borderRadius: "0px",
        });
      });
    });
  }, []);

  /* ---------- holdTransition ---------- */
  const holdTransition = useCallback(() => {
    setPhase("holding");
  }, []);

  /* ---------- enterTransition ---------- */
  const enterTransition = useCallback(
    (targetRect?: DOMRect) => {
      setPhase("entering");

      const ease = "cubic-bezier(0.4, 0, 0.2, 1)";
      const d = `${ENTER_DURATION}ms`;

      if (targetRect) {
        // Animate overlay to the target position (the book on the table)
        setOverlayStyle({
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          transform: "perspective(800px) rotateX(12deg)",
          transition: [
            `left ${d} ${ease}`,
            `top ${d} ${ease}`,
            `width ${d} ${ease}`,
            `height ${d} ${ease}`,
            `transform ${d} ${ease}`,
            `border-radius ${d} ${ease}`,
          ].join(", "),
          borderRadius: "4px",
        });
      } else {
        // No target rect — just scale down slightly as a dissolve effect
        setOverlayStyle((prev) => ({
          ...prev,
          transform: "scale(1.02)",
          transition: `transform ${d} ease-out`,
        }));
      }

      // Fade out the overlay
      setTimeout(() => {
        setOverlayOpacity(0);
      }, ENTER_DURATION * 0.25);

      // Clean up after full fade
      setTimeout(() => {
        setPhase("done");
        setOverlayVisible(false);
        setData(null);
      }, ENTER_DURATION + FADE_DURATION);
    },
    []
  );

  /* ---------- clearTransition ---------- */
  const clearTransition = useCallback(() => {
    setPhase("idle");
    setOverlayVisible(false);
    setOverlayOpacity(1);
    setData(null);
  }, []);

  /* ---------- Auto-hold after exit duration ---------- */
  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(() => {
      if (phaseRef.current === "exiting") {
        setPhase("holding");
      }
    }, EXIT_DURATION + 50);
    return () => clearTimeout(timer);
  }, [phase]);

  /* ---------- Context value ---------- */
  const value: BookTransitionContextValue = {
    phase,
    data,
    startTransition,
    holdTransition,
    enterTransition,
    clearTransition,
  };

  return (
    <BookTransitionContext.Provider value={value}>
      {children}

      {/* Cover overlay — persists across route changes */}
      {overlayVisible && data && (
        <div
          style={{
            position: "fixed",
            zIndex: 150,
            pointerEvents: "none",
            overflow: "hidden",
            willChange: "left, top, width, height, transform, opacity",
            ...overlayStyle,
          }}
        >
          {/* Inner element handles opacity separately to avoid transition conflicts */}
          <div
            style={{
              width: "100%",
              height: "100%",
              opacity: overlayOpacity,
              transition: `opacity ${FADE_DURATION}ms ease-out`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.coverDataUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </BookTransitionContext.Provider>
  );
}
