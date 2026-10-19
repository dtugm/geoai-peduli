"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Clapperboard, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";

import { TimelinePreset } from "@/lib/fire/gibs";

const BASE_DELAY_MS = 900;
const SPEEDS = [0.5, 1, 2, 4];

interface TimelineProps {
  active: boolean;
  /** Label tampilan untuk satu frame */
  labelFor: (time: string) => string;
  /** Teks bantuan opsional di bawah judul frame */
  hint?: string;
  frames: string[];
  index: number;
  isReady: (time: string) => boolean;
  preset: TimelinePreset;
  presets: TimelinePreset[];
  onActiveChange: (active: boolean) => void;
  onIndexChange: (index: number) => void;
  onPresetChange: (key: string) => void;
}

export default function Timeline({
  active,
  labelFor,
  hint,
  frames,
  index,
  isReady,
  preset,
  presets,
  onActiveChange,
  onIndexChange,
  onPresetChange,
}: TimelineProps) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const count = frames.length;
  const readyCount = frames.filter(isReady).length;

  // PEMUTARAN: maju satu frame setelah jeda, menunggu tile frame berikutnya siap
  useEffect(() => {
    if (!active || !playing || count < 2) return;

    const next = (index + 1) % count;
    // Jeda lebih lama di akhir sebelum mengulang dari awal
    const delay = BASE_DELAY_MS / speed + (next === 0 ? 1200 : 0);
    const started = Date.now();
    let timer: number;

    const tick = () => {
      const waited = Date.now() - started;

      if (waited >= delay && (isReady(frames[next]) || waited > delay + 4000)) {
        onIndexChange(next);
      } else {
        timer = window.setTimeout(tick, 100);
      }
    };

    timer = window.setTimeout(tick, 100);

    return () => window.clearTimeout(timer);
  }, [active, playing, index, count, frames, speed, isReady, onIndexChange]);

  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);

  // Pintasan keyboard: spasi = putar/jeda, panah = frame sebelum/berikut
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        onIndexChange((index + 1) % count);
      } else if (e.key === "ArrowLeft") {
        onIndexChange((index - 1 + count) % count);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [active, index, count, onIndexChange]);

  // Berada di dalam bingkai peta dashboard
  const position = "absolute inset-x-3 bottom-3 z-10";

  if (!active) {
    return (
      <div className={clsx(position, "flex justify-center")}>
        <button
          className="inline-flex items-center gap-2 rounded-full bg-[#2f80ed] px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-black/40 hover:bg-[#3b8cf5] transition hover:opacity-90"
          type="button"
          onClick={() => {
            onActiveChange(true);
            setPlaying(false);
          }}
        >
          <Clapperboard size={16} />
          Putar ulang citra
        </button>
      </div>
    );
  }

  const current = frames[index];

  return (
    <div
      className={clsx(
        position,
        "mx-auto max-w-[760px] rounded-[20px] bg-[#141d2a]/95 p-3 shadow-2xl",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <IconButton
            label="Frame sebelumnya"
            onClick={() => onIndexChange((index - 1 + count) % count)}
          >
            <SkipBack size={16} />
          </IconButton>
          <button
            aria-label={playing ? "Jeda" : "Putar"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2f80ed] text-white shadow transition hover:bg-[#3b8cf5] disabled:opacity-40"
            disabled={count < 2}
            type="button"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause size={18} /> : <Play className="ml-0.5" size={18} />}
          </button>
          <IconButton
            label="Frame berikutnya"
            onClick={() => onIndexChange((index + 1) % count)}
          >
            <SkipForward size={16} />
          </IconButton>
        </div>

        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold tabular-nums">
            {current ? labelFor(current) : "Menyiapkan frame…"}
          </p>
          <p className="text-[11px] text-slate-400">
            Frame {Math.min(index + 1, count)}/{count}
            {readyCount < count && (
              <span className="text-amber-300"> · memuat citra {readyCount}/{count}</span>
            )}
            {hint && <span> · {hint}</span>}
          </p>
        </div>

        <select
          aria-label="Rentang animasi"
          className="rounded-lg bg-[#0f1722] px-2 py-1.5 text-xs text-white [color-scheme:dark]"
          value={preset.key}
          onChange={(e) => onPresetChange(e.target.value)}
        >
          {presets.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Kecepatan"
          className="rounded-lg bg-[#0f1722] px-2 py-1.5 text-xs text-white [color-scheme:dark]"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {String(s).replace(".", ",")}×
            </option>
          ))}
        </select>
        <IconButton label="Tutup animasi" onClick={() => onActiveChange(false)}>
          <X size={16} />
        </IconButton>
      </div>

      {/* Scrubber: tiap frame satu segmen, warnanya menandakan sudah dimuat */}
      <div className="mt-3">
        <input
          aria-label="Posisi animasi"
          className="w-full accent-[#2f80ed]"
          max={Math.max(count - 1, 0)}
          min={0}
          step={1}
          type="range"
          value={index}
          onChange={(e) => {
            setPlaying(false);
            onIndexChange(Number(e.target.value));
          }}
        />
        <div className="mt-1 flex gap-px">
          {frames.map((f, i) => (
            <button
              key={f}
              aria-label={labelFor(f)}
              className={clsx(
                "h-1.5 flex-1 rounded-full transition",
                i === index ? "bg-[#2f80ed]" : isReady(f) ? "bg-white/30" : "bg-white/10",
              )}
              title={labelFor(f)}
              type="button"
              onClick={() => {
                setPlaying(false);
                onIndexChange(i);
              }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-500">
          <span>{frames[0] ? labelFor(frames[0]) : ""}</span>
          <span>{frames[count - 1] ? labelFor(frames[count - 1]) : ""}</span>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
