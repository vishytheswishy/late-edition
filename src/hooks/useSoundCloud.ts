"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export interface SoundCloudState {
  isPlaying: boolean;
  isReady: boolean;
  isLoading: boolean;
  position: number; // 0-1
  duration: number; // ms
  volume: number; // 0-100
  artworkUrl: string | null;
  currentTrackUrl: string | null;
}

export function useSoundCloud() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceCreated = useRef(false);
  const suppressTimeUpdate = useRef(false);

  const [state, setState] = useState<SoundCloudState>({
    isPlaying: false,
    isReady: false,
    isLoading: false,
    position: 0,
    duration: 0,
    volume: 80,
    artworkUrl: null,
    currentTrackUrl: null,
  });

  // Keep refs of state for callbacks that need current values without re-creating
  const isPlayingRef = useRef(false);
  isPlayingRef.current = state.isPlaying;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Create audio element and wire up Web Audio API on first use
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = state.volume / 100;
    audioRef.current = audio;

    // Audio element events
    audio.addEventListener("play", () => {
      setState((s) => ({ ...s, isPlaying: true }));
    });

    audio.addEventListener("pause", () => {
      setState((s) => ({ ...s, isPlaying: false }));
    });

    audio.addEventListener("ended", () => {
      setState((s) => ({ ...s, isPlaying: false, position: 0 }));
    });

    audio.addEventListener("loadedmetadata", () => {
      setState((s) => {
        // Only update duration from the native element if it's a valid finite number
        // and we don't already have a duration from the API
        const nativeDur = audio.duration * 1000;
        const duration =
          Number.isFinite(nativeDur) && nativeDur > 0 ? nativeDur : s.duration;
        return { ...s, duration, isReady: true, isLoading: false };
      });
    });

    audio.addEventListener("timeupdate", () => {
      // Skip updates while a seek is in progress to prevent snap-back
      if (suppressTimeUpdate.current) return;

      // Use native duration if valid, otherwise fall back to API-provided duration
      const dur =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : stateRef.current.duration / 1000;

      if (dur > 0) {
        setState((s) => ({
          ...s,
          position: audio.currentTime / dur,
        }));
      }
    });

    audio.addEventListener("error", () => {
      setState((s) => ({ ...s, isLoading: false }));
    });

    return audio;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create AudioContext + AnalyserNode (must happen after user gesture)
  const ensureAnalyser = useCallback(() => {
    if (analyserRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      if (!sourceCreated.current) {
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;
        sourceCreated.current = true;
      }
    } catch (e) {
      console.warn("Could not create AudioContext:", e);
    }
  }, []);

  // Load a new track via the server-side resolver
  const loadTrack = useCallback(
    async (url: string) => {
      const audio = ensureAudio();

      setState((s) => ({
        ...s,
        isLoading: true,
        isReady: false,
        currentTrackUrl: url,
        position: 0,
        duration: 0,
        artworkUrl: null,
      }));

      try {
        const res = await fetch(
          `/api/sc-stream?url=${encodeURIComponent(url)}`
        );

        if (!res.ok) {
          setState((s) => ({ ...s, isLoading: false }));
          return;
        }

        const data = await res.json();

        if (data.artworkUrl) {
          setState((s) => ({ ...s, artworkUrl: data.artworkUrl }));
        }

        if (data.duration) {
          setState((s) => ({ ...s, duration: data.duration }));
        }

        audio.src = data.streamUrl;
        audio.load();

        // Ensure analyser is created (needs user gesture context)
        ensureAnalyser();

        // Resume AudioContext if suspended (autoplay policy)
        if (ctxRef.current?.state === "suspended") {
          await ctxRef.current.resume();
        }

        await audio.play();
      } catch (err) {
        console.error("Failed to load track:", err);
        setState((s) => ({ ...s, isLoading: false }));
      }
    },
    [ensureAudio, ensureAnalyser]
  );

  // Playback controls
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (ctxRef.current?.state === "suspended") {
      await ctxRef.current.resume();
    }
    await audio.play();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(async () => {
    if (isPlayingRef.current) {
      pause();
    } else {
      await play();
    }
  }, [play, pause]);

  // Seek (0-1 position)
  const seekTo = useCallback((position: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Prefer the native duration, but fall back to the API-provided duration
    // (streamed audio may report NaN/Infinity for audio.duration)
    const dur =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : stateRef.current.duration / 1000; // state.duration is in ms

    if (!dur || dur <= 0) return;

    // Temporarily suppress timeupdate so it doesn't snap the position back
    suppressTimeUpdate.current = true;
    audio.currentTime = position * dur;
    setState((s) => ({ ...s, position }));

    // Re-enable after the seek has taken effect
    requestAnimationFrame(() => {
      suppressTimeUpdate.current = false;
    });
  }, []);

  // Volume (0-100)
  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
    }
    setState((s) => ({ ...s, volume: clamped }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current?.remove();
      ctxRef.current?.close();
    };
  }, []);

  return {
    state,
    loadTrack,
    play,
    pause,
    toggle,
    seekTo,
    setVolume,
    analyserRef,
  };
}
