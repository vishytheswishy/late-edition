"use client";

import { useRef, useState, useEffect, useCallback } from "react";

type TTSState = "idle" | "playing" | "paused";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function estimateReadingTime(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180)); // ~180 wpm for speech
}

export default function ArticleTTS({ content }: { content: string }) {
  const [ttsState, setTtsState] = useState<TTSState>("idle");
  const [progress, setProgress] = useState(0);
  const [supported, setSupported] = useState(false);
  const [readTime, setReadTime] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textRef = useRef("");
  const totalCharsRef = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const text = stripHtml(content);
    textRef.current = text;
    totalCharsRef.current = text.length;
    setReadTime(estimateReadingTime(text));
  }, [content, supported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  const handlePlay = useCallback(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    if (ttsState === "paused") {
      synth.resume();
      setTtsState("playing");
      return;
    }

    // Start fresh
    synth.cancel();
    setProgress(0);

    const utterance = new SpeechSynthesisUtterance(textRef.current);
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onboundary = (e) => {
      if (totalCharsRef.current > 0) {
        setProgress(e.charIndex / totalCharsRef.current);
      }
    };

    utterance.onend = () => {
      setTtsState("idle");
      setProgress(0);
    };

    utterance.onerror = () => {
      setTtsState("idle");
      setProgress(0);
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
    setTtsState("playing");
  }, [supported, ttsState]);

  const handlePause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setTtsState("paused");
  }, [supported]);

  const handleStop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setTtsState("idle");
    setProgress(0);
  }, [supported]);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-3 border border-black/10 rounded-lg px-4 py-3 mb-10">
      {/* Play / Pause button */}
      <button
        onClick={ttsState === "playing" ? handlePause : handlePlay}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-black/15 hover:bg-black/5 transition-colors flex-shrink-0"
        aria-label={ttsState === "playing" ? "Pause" : "Listen to article"}
      >
        {ttsState === "playing" ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-black/70">
            <rect x="2" y="1" width="3" height="10" rx="0.5" />
            <rect x="7" y="1" width="3" height="10" rx="0.5" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-black/70 ml-0.5">
            <path d="M2 1.5v9l8-4.5L2 1.5z" />
          </svg>
        )}
      </button>

      {/* Label + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-black/40">
            {ttsState === "idle"
              ? "Listen to article"
              : ttsState === "playing"
              ? "Playing..."
              : "Paused"}
          </span>
          <span className="text-[10px] text-black/30 tabular-nums">
            ~{readTime} min
          </span>
        </div>
        <div className="w-full h-[2px] bg-black/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-black/40 rounded-full transition-all duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Stop button — only visible when active */}
      {ttsState !== "idle" && (
        <button
          onClick={handleStop}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
          aria-label="Stop"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-black/40">
            <rect x="1" y="1" width="8" height="8" rx="1" />
          </svg>
        </button>
      )}
    </div>
  );
}
