"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORAGE_KEY = "missioncontrol.retro-audio.enabled";
const VOLUME_KEY = "missioncontrol.retro-audio.volume";
const AUDIO_SRC = "/arcade-ahri.mp3";

export function RetroAudioToggle() {
  const enabled = useSyncExternalStore(subscribeAudioPreferences, readEnabledPreference, () => false);
  const volume = useSyncExternalStore(subscribeAudioPreferences, readVolumePreference, () => 0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const startAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(AUDIO_SRC);
      audioRef.current.loop = true;
    }

    if (audioRef.current.paused) {
      void audioRef.current.play();
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startAudio();
    } else {
      stopAudio();
    }

    return () => {
      stopAudio();
    };
  }, [enabled, startAudio, stopAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a1223]/80 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => writeAudioPreferences({ enabled: !enabled })}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
          enabled
            ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100"
            : "border-white/15 bg-white/5 text-slate-200"
        }`}
        title={enabled ? "Desactivar musica retro" : "Activar musica retro"}
      >
        {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        {enabled ? "Musica activa" : "Musica apagada"}
      </button>
      <div className="hidden items-center gap-2 sm:flex">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300">
          Vol
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(volume * 100)}
          onChange={(event) =>
            writeAudioPreferences({
              volume: Number(event.target.value) / 100,
            })
          }
          className="retro-slider h-2 w-24 accent-cyan-300"
          aria-label="Volumen de musica"
        />
      </div>
    </div>
  );
}

function subscribeAudioPreferences(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY || event.key === VOLUME_KEY) {
      onStoreChange();
    }
  };

  const handleCustomEvent = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("missioncontrol-audio-change", handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("missioncontrol-audio-change", handleCustomEvent);
  };
}

function readAudioPreferences() {
  return {
    enabled: readEnabledPreference(),
    volume: readVolumePreference(),
  };
}

function readEnabledPreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function readVolumePreference() {
  if (typeof window === "undefined") {
    return 0.4;
  }

  const storedVolume = Number(window.localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(storedVolume) && storedVolume >= 0 ? storedVolume : 0.4;
}

function writeAudioPreferences(next: Partial<{ enabled: boolean; volume: number }>) {
  const current = readAudioPreferences();
  const enabled = next.enabled ?? current.enabled;
  const volume = next.volume ?? current.volume;

  window.localStorage.setItem(STORAGE_KEY, String(enabled));
  window.localStorage.setItem(VOLUME_KEY, String(volume));
  window.dispatchEvent(new Event("missioncontrol-audio-change"));
}


