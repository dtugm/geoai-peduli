"use client";

// Kerangka & komponen UI bersama untuk semua dashboard GeoAI Peduli
// (banjir, kebakaran, tutupan lahan). Pola panel mengikuti Digital Twin FT UGM:
// grid 3 kolom — analisis di kiri, peta di tengah, lapisan di kanan — dan panel
// yang bisa dilipat menjadi rel ikon.

import type { LucideIcon } from "lucide-react";
import type maplibregl from "maplibre-gl";

import Link from "next/link";
import { CSSProperties, ReactNode, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";

import "./dashboard.css";

// TOKEN WARNA --------------------------------------------------------------
// canvas #0b111a · surface #141d2a · line #1f2b3c · mist #2a374b
// ink #e7edf6 · muted #9aa7b9 · subtle #6e7b8f · brand #2f80ed

const LEFT_WIDTH = 372;
const RIGHT_WIDTH = 336;
const RAIL_WIDTH = 56;

export interface RailItem {
  icon: LucideIcon;
  label: string;
  /** id kartu yang dituju saat ikon diklik */
  target: string;
}

const scrollToCard = (target: string) =>
  setTimeout(
    () => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    450,
  );

function Rail({
  side,
  items,
  onOpen,
}: {
  side: "left" | "right";
  items: RailItem[];
  onOpen: () => void;
}) {
  const OpenIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <nav className="flex h-full w-14 flex-col items-center gap-1 rounded-[20px] bg-[#141d2a] p-2">
      <button
        aria-label="Buka panel"
        className="grid size-10 place-items-center rounded-xl bg-[#1f2b3c] text-[#c9d4e3] transition-colors hover:bg-[#1c3050] hover:text-white"
        title="Buka panel"
        type="button"
        onClick={onOpen}
      >
        <OpenIcon size={18} />
      </button>
      <span className="my-1.5 h-px w-6 bg-[#2a374b]" />
      {items.map((item) => (
        <button
          key={item.target}
          aria-label={item.label}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-[#9aa7b9] transition-colors hover:bg-[#1f2b3c] hover:text-white"
          title={item.label}
          type="button"
          onClick={() => {
            onOpen();
            scrollToCard(item.target);
          }}
        >
          <item.icon size={18} />
        </button>
      ))}
    </nav>
  );
}

function SideColumn({
  side,
  open,
  width,
  rail,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  width: number;
  rail: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside
      className={clsx(
        "no-scrollbar relative min-h-0 min-w-0 lg:overflow-x-hidden",
        open ? "lg:overflow-y-auto" : "lg:overflow-y-hidden",
      )}
    >
      <div className={side === "right" ? "lg:ml-auto" : undefined} style={{ width: "100%" }}>
        <div
          className={clsx(
            "flex flex-col gap-3 transition-[opacity,translate] duration-300 ease-out lg:w-[var(--col-w)]",
            !open &&
              clsx(
                "lg:pointer-events-none lg:opacity-0",
                side === "left" ? "lg:-translate-x-6" : "lg:translate-x-6",
              ),
          )}
          style={{ "--col-w": `${width}px` } as CSSProperties}
        >
          {children}
        </div>
      </div>
      <div
        className={clsx(
          "absolute inset-y-0 hidden transition-opacity duration-300 lg:block",
          side === "left" ? "left-0" : "right-0",
          open ? "pointer-events-none opacity-0" : "opacity-100 delay-200",
        )}
      >
        {rail}
      </div>
    </aside>
  );
}

export function DashboardLayout({
  title,
  subtitle,
  icon: Icon,
  backHref,
  left,
  right,
  leftRail,
  rightRail,
  map,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  backHref: string;
  left: ReactNode;
  right: ReactNode;
  leftRail: RailItem[];
  rightRail: RailItem[];
  map: ReactNode;
}) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const columns = {
    "--dash-left": `${leftOpen ? LEFT_WIDTH : RAIL_WIDTH}px`,
    "--dash-right": `${rightOpen ? RIGHT_WIDTH : RAIL_WIDTH}px`,
  } as CSSProperties;

  return (
    <div className="flex min-h-screen flex-col bg-[#0b111a] p-3 text-[#e7edf6] lg:h-screen">
      <div
        className="grid min-h-0 flex-1 grid-cols-1 gap-3 transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid-cols-[var(--dash-left)_minmax(0,1fr)_var(--dash-right)]"
        style={columns}
      >
        <SideColumn
          open={leftOpen}
          rail={<Rail items={leftRail} side="left" onOpen={() => setLeftOpen(true)} />}
          side="left"
          width={LEFT_WIDTH}
        >
          {/* Kartu judul */}
          <section className="animate-[dash-pop_.42s_cubic-bezier(0.22,1,0.36,1)_both] rounded-[20px] bg-[#141d2a] p-3.5">
            <div className="flex items-center gap-3">
              <Link
                aria-label="Kembali ke katalog"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1f2b3c] text-[#c9d4e3] transition-colors hover:bg-[#1c3050] hover:text-white"
                href={backHref}
              >
                <ArrowLeft size={16} />
              </Link>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#2f80ed]/20 text-[#7fb2ff]">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[15px] font-bold">{title}</h1>
                <p className="truncate text-xs text-[#9aa7b9]">{subtitle}</p>
              </div>
              <button
                aria-label="Lipat panel kiri"
                className="hidden size-8 shrink-0 place-items-center rounded-full text-[#9aa7b9] transition-colors hover:bg-[#1f2b3c] hover:text-white lg:grid"
                type="button"
                onClick={() => setLeftOpen(false)}
              >
                <PanelLeftClose size={17} />
              </button>
            </div>
          </section>
          {left}
        </SideColumn>

        <main className="relative min-h-[62vh] overflow-hidden rounded-[24px] bg-[#111a26] max-lg:order-first lg:min-h-0">
          {map}
        </main>

        <SideColumn
          open={rightOpen}
          rail={<Rail items={rightRail} side="right" onOpen={() => setRightOpen(true)} />}
          side="right"
          width={RIGHT_WIDTH}
        >
          <div className="flex items-center justify-between rounded-[20px] bg-[#141d2a] px-4 py-3">
            <h2 className="text-[15px] font-bold">Lapisan peta</h2>
            <button
              aria-label="Lipat panel kanan"
              className="hidden size-8 place-items-center rounded-full text-[#9aa7b9] transition-colors hover:bg-[#1f2b3c] hover:text-white lg:grid"
              type="button"
              onClick={() => setRightOpen(false)}
            >
              <PanelRightClose size={17} />
            </button>
          </div>
          {right}
        </SideColumn>
      </div>
    </div>
  );
}

// KARTU & LIPATAN -------------------------------------------------------------

function Fold({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={clsx(
        "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function Card({
  id,
  title,
  icon: Icon,
  hint,
  defaultOpen = true,
  collapsible = true,
  preview,
  children,
}: {
  id?: string;
  title: string;
  icon?: LucideIcon;
  hint?: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  /** Ringkasan kecil yang tampil di header saat kartu dilipat */
  preview?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="scroll-mt-3 animate-[dash-pop_.42s_cubic-bezier(0.22,1,0.36,1)_both] rounded-[20px] bg-[#141d2a] p-4"
      id={id}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[14px] font-bold">
          {Icon && (
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#2f80ed]/15 text-[#7fb2ff]">
              <Icon size={13} />
            </span>
          )}
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {!open && preview}
          {open && hint && <span className="text-[11px] text-[#6e7b8f]">{hint}</span>}
          {collapsible && (
            <button
              aria-expanded={open}
              aria-label={open ? `Lipat ${title}` : `Buka ${title}`}
              className="grid size-5 place-items-center rounded-full bg-[#1c3050] text-[#7fb2ff] transition-colors hover:bg-[#2f80ed] hover:text-white"
              type="button"
              onClick={() => setOpen((o) => !o)}
            >
              <ChevronUp
                className={clsx("transition-transform duration-300", !open && "rotate-180")}
                size={12}
              />
            </button>
          )}
        </div>
      </div>
      <Fold open={open}>
        <div className="pt-3.5">{children}</div>
      </Fold>
    </section>
  );
}

// KONTROL -------------------------------------------------------------------

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={clsx(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300",
        checked ? "bg-[#2f80ed]" : "bg-[#2a374b]",
      )}
      role="switch"
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span
        className={clsx(
          "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
  icon: Icon,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: LucideIcon;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 text-[13px]">
      <span className="inline-flex items-center gap-2 text-[#c9d4e3]">
        {Icon && <Icon className="text-[#7fb2ff]" size={14} />}
        {label}
      </span>
      <Toggle checked={checked} label={typeof label === "string" ? label : "Aktifkan"} onChange={onChange} />
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = "md",
}: {
  value: T;
  options: { key: T; label: ReactNode; sub?: ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-[#0f1722] p-1">
      {options.map((o) => (
        <button
          key={String(o.key)}
          aria-pressed={value === o.key}
          className={clsx(
            "flex-1 rounded-lg px-2 text-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-30",
            size === "sm" ? "py-1 text-[11px]" : "py-1.5 text-xs",
            value === o.key
              ? "bg-[#2f80ed] text-white shadow"
              : "text-[#9aa7b9] hover:bg-[#1f2b3c] hover:text-white",
          )}
          disabled={o.disabled}
          type="button"
          onClick={() => onChange(o.key)}
        >
          {o.label}
          {o.sub && (
            <span
              className={clsx(
                "block text-[10px] font-normal",
                value === o.key ? "text-white/75" : "text-[#6e7b8f]",
              )}
            >
              {o.sub}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="flex justify-between text-[#9aa7b9]">
        {label}
        <span className="font-semibold tabular-nums text-[#e7edf6]">
          {format ? format(value) : value}
        </span>
      </span>
      <input
        aria-label={label}
        className="mt-1.5 w-full accent-[#2f80ed]"
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export interface ModeItem<T extends string> {
  key: T;
  label: string;
  sub: string;
  swatch: string;
  icon: LucideIcon;
}

/** Latar kartu lapisan dari cuplikan data asli (public/images/thumbs) */
export const thumb = (name: string) => `#0b111a url(/images/thumbs/${name}.jpg) center / cover no-repeat`;

/** Kartu pilihan lapisan dengan cuplikan data */
export function ModeCards<T extends string>({
  items,
  value,
  onChange,
  columns = 2,
}: {
  items: ModeItem<T>[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className={clsx("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {items.map((m) => {
        const active = value === m.key;

        return (
          <button
            key={m.key}
            aria-pressed={active}
            className={clsx(
              "overflow-hidden rounded-xl text-left ring-1 transition",
              active
                ? "bg-[#1c3050] ring-[#2f80ed]"
                : "bg-[#0f1722] ring-transparent hover:ring-[#2a374b]",
            )}
            type="button"
            onClick={() => onChange(m.key)}
          >
            <span className="relative block h-12" style={{ background: m.swatch }}>
              <span
                className={clsx(
                  "absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full",
                  active ? "bg-[#2f80ed] text-white" : "bg-[#0b111a]/70 text-[#c9d4e3]",
                )}
              >
                <m.icon size={12} />
              </span>
            </span>
            <span className="block px-2.5 py-2">
              <span className="block truncate text-[13px] font-semibold">{m.label}</span>
              <span className="block truncate text-[11px] text-[#9aa7b9]">{m.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ANALISIS -------------------------------------------------------------------

export function Kpi({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "brand" | "warn" | "danger" | "good";
}) {
  return (
    <div className="rounded-2xl bg-[#0f1722] px-3.5 py-3">
      <p className="text-[11px] text-[#9aa7b9]">{label}</p>
      <p
        className={clsx(
          "mt-0.5 text-[20px] font-bold leading-tight tabular-nums",
          {
            default: "text-[#e7edf6]",
            brand: "text-[#7fb2ff]",
            warn: "text-amber-300",
            danger: "text-rose-300",
            good: "text-emerald-300",
          }[tone],
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-[#6e7b8f]">{sub}</p>}
    </div>
  );
}

/** Daftar batang horizontal yang bisa diklik */
export function BarList({
  rows,
  selected,
  onSelect,
  format,
}: {
  rows: { key: string | number; label: string; value: number; color?: string }[];
  selected?: string | number | null;
  onSelect?: (key: string | number) => void;
  format: (v: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            className={clsx(
              "relative w-full overflow-hidden rounded-lg px-2.5 py-1.5 text-left text-xs transition",
              selected === r.key ? "ring-1 ring-[#2f80ed]" : "hover:bg-[#1f2b3c]",
              !onSelect && "cursor-default",
            )}
            type="button"
            onClick={() => onSelect?.(r.key)}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-lg opacity-30 transition-all duration-300"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "#2f80ed" }}
            />
            <span className="relative flex justify-between gap-2">
              <span className="truncate text-[#e7edf6]">{r.label}</span>
              <span className="shrink-0 tabular-nums text-[#c9d4e3]">{format(r.value)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function LegendDots({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-[11px] text-[#c9d4e3]">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function GradientLegend({
  gradient,
  labels,
}: {
  gradient: string;
  labels: ReactNode[];
}) {
  return (
    <div>
      <div className="h-2 rounded-full" style={{ background: gradient }} />
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[#9aa7b9]">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/** Kartu metode singkat — butir pendek, seragam di semua dashboard */
export function MethodCard({ points }: { points: { label: string; text: ReactNode }[] }) {
  return (
    <Card defaultOpen={false} id="metode" title="Metode singkat">
      <dl className="space-y-2 text-[12px] leading-relaxed">
        {points.map((p) => (
          <div key={p.label}>
            <dt className="font-semibold text-[#e7edf6]">{p.label}</dt>
            <dd className="text-[#9aa7b9]">{p.text}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
        active ? "bg-[#e7edf6] text-[#0b111a]" : "bg-[#0f1722] text-[#9aa7b9] hover:bg-[#1f2b3c]",
      )}
      type="button"
      onClick={onClick}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

export const tooltipStyle = {
  background: "#0b111a",
  border: "1px solid #2a374b",
  borderRadius: 10,
  fontSize: 12,
  color: "#e7edf6",
};

// KONTROL PETA ------------------------------------------------------------------

/** Penunjuk arah utara sederhana: lingkaran kecil dengan huruf U dan panah */
export class NorthArrow {
  private map: maplibregl.Map | null = null;
  private el: HTMLButtonElement | null = null;

  onAdd(map: maplibregl.Map) {
    this.map = map;
    const el = document.createElement("button");

    el.type = "button";
    el.title = "Arah utara (klik untuk meluruskan)";
    el.className = "maplibregl-ctrl geoai-north";
    el.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3l4.5 10H7.5z" fill="#ef4444"/><path d="M12 21l-4.5-8h9z" fill="#c9d4e3"/></svg><span>U</span>';
    el.onclick = () => map.resetNorthPitch({ duration: 400 });
    this.el = el;
    map.on("rotate", this.update);
    this.update();

    return el;
  }

  onRemove() {
    this.map?.off("rotate", this.update);
    this.el?.remove();
  }

  private update = () => {
    const svg = this.el?.querySelector("svg");

    if (svg && this.map) svg.style.transform = `rotate(${-this.map.getBearing()}deg)`;
  };
}

/** Lipat teks atribusi MapLibre (tetap bisa dibuka lewat tombol ⓘ) */
export const collapseAttribution = (map: maplibregl.Map) =>
  map.once("load", () =>
    map
      .getContainer()
      .querySelectorAll(".maplibregl-ctrl-attrib")
      .forEach((el) => el.classList.remove("maplibregl-compact-show")),
  );

// BATAS ADMINISTRASI ---------------------------------------------------------
// Garis terang dengan "casing" gelap di bawahnya agar tetap terbaca di atas citra apa pun.

type BoundaryKind = "province" | "kabupaten";
type Expr = maplibregl.ExpressionSpecification;

const BOUNDARY = {
  province: { color: "#fbbf24", width: [4, 1.3, 10, 2.6], casing: 2.4, opacity: 0.95 },
  kabupaten: { color: "#e2e8f0", width: [4, 0.6, 10, 1.4], casing: 1.8, opacity: 0.75 },
} as const;
const SELECTED = "#38bdf8";

const byZoom = (kind: BoundaryKind, extra: number, selected?: Expr) => {
  const [z0, w0, z1, w1] = BOUNDARY[kind].width;
  const w = (base: number) => (selected ? (["case", selected, base + 1.4, base] as Expr) : base);

  return ["interpolate", ["linear"], ["zoom"], z0, w(w0 + extra), z1, w(w1 + extra)] as unknown as Expr;
};

/** Tambah batas (casing + garis). Id garis = `id`, casing = `${id}-casing` */
export function addBoundary(
  map: maplibregl.Map,
  { id, source, kind, before }: { id: string; source: string; kind: BoundaryKind; before?: string },
) {
  map.addLayer(
    {
      id: `${id}-casing`,
      type: "line",
      source,
      layout: { "line-join": "round" },
      paint: {
        "line-color": "#05080d",
        "line-width": byZoom(kind, BOUNDARY[kind].casing),
        "line-opacity": 0.7,
        "line-blur": 0.6,
      },
    },
    before,
  );
  map.addLayer(
    {
      id,
      type: "line",
      source,
      layout: { "line-join": "round" },
      paint: {
        "line-color": BOUNDARY[kind].color,
        "line-width": byZoom(kind, 0),
        "line-opacity": BOUNDARY[kind].opacity,
      },
    },
    before,
  );
}

/** Sorot satu fitur batas (id fitur = properti `id`) */
export function highlightBoundary(map: maplibregl.Map, id: string, kind: BoundaryKind, featureId: number | null) {
  const sel = ["==", ["get", "id"], featureId ?? -1] as Expr;

  map.setPaintProperty(id, "line-color", ["case", sel, SELECTED, BOUNDARY[kind].color]);
  map.setPaintProperty(id, "line-width", byZoom(kind, 0, sel));
  map.setPaintProperty(id, "line-opacity", ["case", sel, 1, BOUNDARY[kind].opacity]);
  map.setPaintProperty(`${id}-casing`, "line-width", byZoom(kind, BOUNDARY[kind].casing, sel));
}

export function setBoundaryVisible(map: maplibregl.Map, id: string, on: boolean) {
  for (const l of [id, `${id}-casing`]) map.setLayoutProperty(l, "visibility", on ? "visible" : "none");
}
