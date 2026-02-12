"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { Mix, StaffPick } from "@/lib/music";

// ── Types ──

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

interface MusicPlayerContextValue {
  // Audio state
  state: SoundCloudState;
  loadTrack: (url: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seekTo: (position: number) => void;
  setVolume: (vol: number) => void;
  analyserRef: React.RefObject<AnalyserNode | null>;

  // Music data
  activeMixId: string | null;
  activeMix: Mix | null;
  coverArt: string | undefined;
  mixesList: Mix[];
  staffPicksList: StaffPick[];
  swapKey: number;

  // Actions
  selectMix: (mix: Mix) => void;
  onVinylPlaced: () => void;
  setCoverArt: (art: string | undefined) => void;

  // Mini-player dismiss
  miniPlayerDismissed: boolean;
  dismissMiniPlayer: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | undefined>(
  undefined
);

// ── Provider ──

export function MusicPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Audio engine (lifted from useSoundCloud) ──
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

  const isPlayingRef = useRef(false);
  isPlayingRef.current = state.isPlaying;
  const stateRef = useRef(state);
  stateRef.current = state;

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = stateRef.current.volume / 100;
    audioRef.current = audio;

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
        const nativeDur = audio.duration * 1000;
        const duration =
          Number.isFinite(nativeDur) && nativeDur > 0 ? nativeDur : s.duration;
        return { ...s, duration, isReady: true, isLoading: false };
      });
    });

    audio.addEventListener("timeupdate", () => {
      if (suppressTimeUpdate.current) return;
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
  }, []);

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

        ensureAnalyser();

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

  const seekTo = useCallback((position: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const dur =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : stateRef.current.duration / 1000;

    if (!dur || dur <= 0) return;

    suppressTimeUpdate.current = true;
    audio.currentTime = position * dur;
    setState((s) => ({ ...s, position }));

    requestAnimationFrame(() => {
      suppressTimeUpdate.current = false;
    });
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
    }
    setState((s) => ({ ...s, volume: clamped }));
  }, []);

  // No cleanup on unmount — the provider lives in the root layout and
  // should persist audio across page navigations.

  // ── Music data ──

  const [mixesList, setMixesList] = useState<Mix[]>([]);
  const [staffPicksList, setStaffPicksList] = useState<StaffPick[]>([]);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [coverArt, setCoverArt] = useState<string | undefined>(undefined);
  const [swapKey, setSwapKey] = useState(0);
  const pendingTrackUrl = useRef<string | null>(null);
  const [miniPlayerDismissed, setMiniPlayerDismissed] = useState(false);

  // Fetch music data from API on mount
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

  const activeMix = useMemo(
    () => mixesList.find((m) => m.id === activeMixId) ?? null,
    [mixesList, activeMixId]
  );

  const selectMix = useCallback(
    (mix: Mix) => {
      // Un-dismiss the mini player whenever a new track is selected
      setMiniPlayerDismissed(false);

      if (activeMixId === mix.id) {
        toggle();
      } else {
        setActiveMixId(mix.id);
        pendingTrackUrl.current = mix.url;

        fetch(
          `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(mix.url)}`
        )
          .then((r) => r.json())
          .then((data) => {
            const thumb = data.thumbnail_url as string | undefined;
            if (thumb) {
              setCoverArt(thumb.replace("-large", "-t500x500"));
            } else {
              setCoverArt(undefined);
            }
          })
          .catch(() => setCoverArt(undefined))
          .finally(() => {
            setSwapKey((k) => k + 1);
          });
      }
    },
    [activeMixId, toggle]
  );

  const onVinylPlaced = useCallback(() => {
    if (pendingTrackUrl.current) {
      loadTrack(pendingTrackUrl.current);
      pendingTrackUrl.current = null;
    }
  }, [loadTrack]);

  // Keep coverArt in sync once the SoundCloud widget provides artwork
  useEffect(() => {
    if (state.artworkUrl) {
      setCoverArt(state.artworkUrl);
    }
  }, [state.artworkUrl]);

  const dismissMiniPlayer = useCallback(() => {
    setMiniPlayerDismissed(true);
  }, []);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      state,
      loadTrack,
      play,
      pause,
      toggle,
      seekTo,
      setVolume,
      analyserRef,
      activeMixId,
      activeMix,
      coverArt,
      mixesList,
      staffPicksList,
      swapKey,
      selectMix,
      onVinylPlaced,
      setCoverArt,
      miniPlayerDismissed,
      dismissMiniPlayer,
    }),
    [
      state,
      loadTrack,
      play,
      pause,
      toggle,
      seekTo,
      setVolume,
      activeMixId,
      activeMix,
      coverArt,
      mixesList,
      staffPicksList,
      swapKey,
      selectMix,
      onVinylPlaced,
      miniPlayerDismissed,
      dismissMiniPlayer,
    ]
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

// ── Hook ──

export function useMusic() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx)
    throw new Error("useMusic must be used within a MusicPlayerProvider");
  return ctx;
}
