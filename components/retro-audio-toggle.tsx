"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORAGE_KEY = "missioncontrol.retro-audio.enabled";
const VOLUME_KEY = "missioncontrol.retro-audio.volume";

const melody = [
  392, 440, 523.25, 587.33, 523.25, 659.25, 587.33, 523.25, 440, 392, 349.23,
  392,
];
const bass = [98, 98, 110, 123.47, 130.81, 123.47, 110, 98, 87.31, 98, 110, 123.47];
const harmony = [196, 220, 261.63, 293.66, 261.63, 329.63, 293.66, 261.63, 220, 196, 174.61, 196];

export function RetroAudioToggle() {
  const enabled = useSyncExternalStore(subscribeAudioPreferences, readEnabledPreference, () => false);
  const volume = useSyncExternalStore(subscribeAudioPreferences, readVolumePreference, () => 0.4);
  const audioContextRef = useRef<AudioContext | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  const stopAudio = useCallback(() => {
    if (loopTimerRef.current !== null) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state === "running") {
      void audioContextRef.current.suspend();
    }
  }, []);

  const startAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    const context = audioContextRef.current;

    if (context.state === "suspended") {
      await context.resume();
    }

    if (loopTimerRef.current !== null) {
      return;
    }

    const tick = () => {
      const note = melody[stepRef.current % melody.length];
      const bassNote = bass[stepRef.current % bass.length];
      const harmonyNote = harmony[stepRef.current % harmony.length];
      playTone(context, note, 0.18, "square", 0.028 * volume);
      playTone(context, harmonyNote, 0.22, "triangle", 0.018 * volume);
      playTone(context, bassNote, 0.32, "triangle", 0.022 * volume);
      stepRef.current = (stepRef.current + 1) % melody.length;
      loopTimerRef.current = window.setTimeout(tick, 360);
    };

    tick();
  }, [volume]);

  useEffect(() => {
    if (enabled) {
      void startAudio();
    } else {
      stopAudio();
    }

    return () => {
      stopAudio();
    };
  }, [enabled, startAudio, stopAudio]);

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

function playTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainAmount: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(gainAmount, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}
