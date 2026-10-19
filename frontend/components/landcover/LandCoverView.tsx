"use client";

import type { FeatureCollection } from "geojson";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Eye,
  Layers,
  Palette,
  PieChart,
  Satellite,
  TreePine,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bbox as turfBbox } from "@turf/turf";

import {
  Card,
  Chip,
  DashboardLayout,
  Kpi,
  MethodCard,
  Segmented,
  Slider,
  ToggleRow,
  tooltipStyle,
} from "@/components/dash/kit";
import {
  areaByClass,
  availability,
  classByKey,
  Epoch,
  EPOCHS,
  LC_BOUNDS,
  LC_PROVINCES,
  lcClasses,
  LcProvince,
} from "@/lib/landcover/landcover";

const LandCoverMap = dynamic(() => import("./LandCoverMap"), { ssr: false });

const provinceColor: Record<LcProvince, string> = {
  Aceh: "#38bdf8",
  "Sumatera Utara": "#a78bfa",
  "Sumatera Barat": "#34d399",
};

const fmt = (n: number, d = 0) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: d, minimumFractionDigits: d });

const compact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${fmt(n / 1_000_000, 2)} jt` : Math.abs(n) >= 10_000 ? `${fmt(n / 1000)} rb` : fmt(n);

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

const TREND_CLASSES = ["Vegetasi Tinggi", "Sawit", "Vegetasi Rendah", "Emplacement"];

export default function LandCoverView() {
  const [epoch, setEpoch] = useState<Epoch>(2025);
  const [comparing, setComparing] = useState(false);
  const [leftEpoch, setLeftEpoch] = useState<Epoch>(2021);
  const [provinceFilter, setProvinceFilter] = useState<LcProvince | null>(null);
  const [showLandcover, setShowLandcover] = useState(true);
  const [showImagery, setShowImagery] = useState(true);
  const [opacity, setOpacity] = useState(75);
  const [hidden, setHidden] = useState<number[]>([]);
  const [provincesGeo, setProvincesGeo] = useState<FeatureCollection | null>(null);
  const [focus, setFocus] = useState<{ bounds: [number, number, number, number]; key: number } | null>(null);

  useEffect(() => {
    fetch("/data/indonesia-provinsi.json")
      .then((r) => r.json())
      .then((fc: FeatureCollection) =>
        setProvincesGeo({
          ...fc,
          features: fc.features.filter((f) => (LC_PROVINCES as readonly string[]).includes(f.properties?.nama)),
        }),
      )
      .catch(() => setProvincesGeo(null));
  }, []);

  const scope: LcProvince[] = provinceFilter ? [provinceFilter] : [...LC_PROVINCES];
  // Perbandingan antar-tahun hanya bermakna untuk wilayah dengan data multi-epoch (Sumut)
  const multiEpoch = scope.filter((p) => availability[p].length > 1);
  const fromEpoch: Epoch = comparing ? leftEpoch : 2021;
  const toEpoch: Epoch = comparing ? epoch : 2025;

  const current = useMemo(() => areaByClass(scope, epoch === 2025 || multiEpoch.length ? epoch : 2025), [scope, epoch, multiEpoch.length]);
  const totalLand = Object.values(current).reduce((s, v) => s + v, 0);

  const change = useMemo(() => {
    const target = multiEpoch.length ? multiEpoch : (["Sumatera Utara"] as LcProvince[]);
    const a = areaByClass(target, fromEpoch);
    const b = areaByClass(target, toEpoch);

    return Object.keys({ ...a, ...b })
      .map((k) => ({ key: k, before: a[k] ?? 0, after: b[k] ?? 0, delta: (b[k] ?? 0) - (a[k] ?? 0) }))
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  }, [multiEpoch, fromEpoch, toEpoch]);
  const changeOf = (k: string) => change.find((c) => c.key === k);

  const trend = useMemo(
    () =>
      EPOCHS.map((e) => {
        const a = areaByClass(["Sumatera Utara"], e);

        return { year: String(e), ...Object.fromEntries(TREND_CLASSES.map((k) => [k, Math.round(a[k] ?? 0)])) };
      }),
    [],
  );

  const composition = Object.entries(current)
    .map(([key, ha]) => ({ key, ha, cls: classByKey[key] }))
    .filter((c) => c.cls && c.ha > 0)
    .sort((a, b) => b.ha - a.ha);

  const focusProvince = (p: LcProvince | null) => {
    setProvinceFilter(p);
    const f = p ? provincesGeo?.features.find((x) => x.properties?.nama === p) : null;

    setFocus((old) => ({
      bounds: f ? (turfBbox(f) as [number, number, number, number]) : LC_BOUNDS,
      key: (old?.key ?? 0) + 1,
    }));
  };

  const kpiChange = (k: string) => {
    const c = changeOf(k);

    if (!c || !c.before) return undefined;
    const v = pct(c.after, c.before);

    return `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v), 1)}% sejak ${fromEpoch} (Sumut)`;
  };

  const onlySumutNote = scope.some((p) => !availability[p].includes(epoch));

  // PANEL KIRI -----------------------------------------------------------------
  const left = (
    <>
      <Card icon={BarChart3} id="ringkasan" title={`Ringkasan ${multiEpoch.length ? epoch : 2025}`}>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[null, ...LC_PROVINCES].map((p) => (
            <Chip
              key={p ?? "all"}
              active={provinceFilter === p}
              color={p ? provinceColor[p] : undefined}
              onClick={() => focusProvince(p)}
            >
              {p ?? "Semua"}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Kpi
            label="Hutan / vegetasi tinggi"
            sub={kpiChange("Vegetasi Tinggi")}
            tone="good"
            value={`${compact(current["Vegetasi Tinggi"] ?? 0)} ha`}
          />
          <Kpi
            label="Kebun sawit"
            sub={kpiChange("Sawit")}
            tone="warn"
            value={`${compact(current["Sawit"] ?? 0)} ha`}
          />
          <Kpi
            label="Lahan terbangun"
            sub={kpiChange("Emplacement")}
            tone="danger"
            value={`${compact(current["Emplacement"] ?? 0)} ha`}
          />
          <Kpi
            label="Lahan terbuka"
            sub={kpiChange("Tanah Terbuka")}
            value={`${compact(current["Tanah Terbuka"] ?? 0)} ha`}
          />
        </div>
        {onlySumutNote && (
          <p className="mt-2 text-[11px] text-[#9aa7b9]">
            {multiEpoch.length
              ? `Aceh & Sumatera Barat baru tersedia untuk 2025 — angka ${epoch} hanya mencakup Sumatera Utara.`
              : `Data ${provinceFilter} baru tersedia untuk 2025 — menampilkan 2025.`}
          </p>
        )}
      </Card>

      <Card icon={PieChart} id="komposisi" title="Komposisi lahan">
        <div className="flex h-3 overflow-hidden rounded-full bg-[#0f1722]">
          {composition.map((c) => (
            <div
              key={c.key}
              style={{ width: `${(c.ha / totalLand) * 100}%`, background: c.cls.color }}
              title={c.cls.label}
            />
          ))}
        </div>
        <ul className="mt-2.5 space-y-1 text-[12px]">
          {composition.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 truncate text-[#c9d4e3]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: c.cls.color }} />
                {c.cls.label}
              </span>
              <span className="tabular-nums text-[#9aa7b9]">
                {compact(c.ha)} ha
                <span className="ml-2 inline-block w-11 text-right text-[11px] text-[#6e7b8f]">
                  {fmt((c.ha / totalLand) * 100, 1)}%
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-[#6e7b8f]">Tanpa badan air (sebagian mencakup laut).</p>
      </Card>

      <Card icon={TrendingUp} id="tren" title="Tren Sumatera Utara 2021–2025">
        <div className="h-44">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis axisLine={false} dataKey="year" tick={{ fill: "#9aa7b9", fontSize: 10 }} tickLine={false} />
              <YAxis
                axisLine={false}
                tick={{ fill: "#9aa7b9", fontSize: 10 }}
                tickFormatter={(v) => `${fmt(v / 1_000_000, 1)} jt`}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${fmt(Number(v))} ha`, classByKey[String(n)]?.label ?? n]} />
              <ReferenceLine stroke="#2f80ed" strokeDasharray="3 3" x={String(epoch)} />
              {TREND_CLASSES.map((k) => (
                <Line
                  key={k}
                  dataKey={k}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                  stroke={classByKey[k].color === "#166534" ? "#22c55e" : classByKey[k].color}
                  strokeWidth={2}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {TREND_CLASSES.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-[#c9d4e3]">
              <span
                className="h-0.5 w-3 rounded"
                style={{ background: classByKey[k].color === "#166534" ? "#22c55e" : classByKey[k].color }}
              />
              {classByKey[k].label}
            </span>
          ))}
        </div>
      </Card>

      <Card icon={ArrowLeftRight} id="perubahan" title={`Perubahan ${fromEpoch} → ${toEpoch}`}>
        {fromEpoch === toEpoch ? (
          <p className="text-[12px] text-[#9aa7b9]">Pilih dua tahun berbeda untuk melihat perubahan.</p>
        ) : (
          <ul className="space-y-1.5 text-[12px]">
            {change
              .filter((c) => classByKey[c.key])
              .map((c) => {
                const up = c.delta >= 0;

                return (
                  <li key={c.key} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 truncate text-[#c9d4e3]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: classByKey[c.key].color }} />
                      {classByKey[c.key].label}
                    </span>
                    <span
                      className={clsx(
                        "inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums",
                        up ? "text-emerald-300" : "text-rose-300",
                      )}
                    >
                      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {up ? "+" : "−"}
                      {compact(Math.abs(c.delta))} ha
                      <span className="w-12 text-right text-[11px] font-normal text-[#6e7b8f]">
                        {up ? "+" : "−"}
                        {fmt(Math.abs(pct(c.after, c.before)), 1)}%
                      </span>
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
        <p className="mt-2 text-[10px] text-[#6e7b8f]">Sumatera Utara · aktifkan “Bandingkan” untuk memilih tahun.</p>
      </Card>

      <MethodCard
        points={[
          { label: "Data", text: "Citra Sentinel-2 tahunan (bebas awan) untuk tiap epoch." },
          {
            label: "Klasifikasi",
            text: "Model GeoAI memetakan hutan, sawit, perkebunan lain, lahan terbangun, lahan terbuka, dan badan air.",
          },
          {
            label: "Perubahan",
            text: "Luas tiap kelas dibandingkan antar-tahun; swipe map memperlihatkan lokasi perubahannya.",
          },
          { label: "Cakupan", text: "Sumatera Utara 2021–2025; Aceh & Sumatera Barat 2025." },
        ]}
      />
    </>
  );

  // PANEL KANAN ----------------------------------------------------------------
  const yearOptions = (disabledFor?: Epoch) =>
    EPOCHS.map((e) => ({ key: e, label: String(e).slice(2), sub: undefined, disabled: e === disabledFor }));

  const right = (
    <>
      <Card icon={CalendarRange} id="tahun" title="Tahun">
        <Segmented options={EPOCHS.map((e) => ({ key: e, label: String(e) }))} size="sm" value={epoch} onChange={setEpoch} />
        <div className="mt-3">
          <ToggleRow checked={comparing} icon={ArrowLeftRight} label="Bandingkan dua tahun" onChange={setComparing} />
        </div>
        {comparing && (
          <div className="mt-2 space-y-2 rounded-xl bg-[#0f1722] p-2.5">
            <div>
              <p className="mb-1 text-[11px] text-[#9aa7b9]">◀ Kiri</p>
              <Segmented options={yearOptions(epoch)} size="sm" value={leftEpoch} onChange={setLeftEpoch} />
            </div>
            <div>
              <p className="mb-1 text-[11px] text-[#9aa7b9]">Kanan ▶ (tahun di atas)</p>
              <Segmented options={yearOptions(leftEpoch)} size="sm" value={epoch} onChange={setEpoch} />
            </div>
          </div>
        )}
      </Card>

      <Card icon={Layers} id="lapisan" title="Lapisan">
        <ToggleRow checked={showLandcover} icon={TreePine} label="Tutupan lahan GeoAI" onChange={setShowLandcover} />
        <ToggleRow checked={showImagery} icon={Satellite} label="Citra Sentinel-2 tahunan" onChange={setShowImagery} />
        <div className="mt-2">
          <Slider format={(v) => `${v}%`} label="Opasitas tutupan lahan" max={100} min={10} value={opacity} onChange={setOpacity} />
        </div>
      </Card>

      <Card hint="klik untuk sembunyikan" icon={Palette} id="kelas" title="Kelas lahan">
        <div className="flex flex-wrap gap-1.5">
          {lcClasses
            .filter((c) => ["Vegetasi Tinggi", "Vegetasi Rendah", "Sawit", "Perkebunan Lain", "Emplacement", "Tanah Terbuka", "Badan Air"].includes(c.key))
            .map((c) => {
              const off = hidden.includes(c.id);

              return (
                <button
                  key={c.id}
                  aria-pressed={!off}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                    off ? "bg-[#0f1722] text-[#6e7b8f] line-through" : "bg-[#1f2b3c] text-[#e7edf6]",
                  )}
                  type="button"
                  onClick={() => setHidden((h) => (off ? h.filter((x) => x !== c.id) : [...h, c.id]))}
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color, opacity: off ? 0.3 : 1 }} />
                  {c.label}
                </button>
              );
            })}
        </div>
      </Card>
    </>
  );

  return (
    <DashboardLayout
      backHref="/katalog/perubahan-lahan-sumatra"
      icon={TreePine}
      left={left}
      leftRail={[
        { icon: BarChart3, label: "Ringkasan", target: "ringkasan" },
        { icon: PieChart, label: "Komposisi", target: "komposisi" },
        { icon: TrendingUp, label: "Tren", target: "tren" },
        { icon: ArrowLeftRight, label: "Perubahan", target: "perubahan" },
      ]}
      map={
        <>
          <LandCoverMap
            compareEpoch={comparing ? leftEpoch : null}
            epoch={epoch}
            focus={focus}
            hiddenClasses={hidden}
            opacity={opacity}
            provinces={scope}
            provincesGeo={provincesGeo}
            showImagery={showImagery}
            showLandcover={showLandcover}
          />
          {comparing && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <div className="flex items-center overflow-hidden rounded-full bg-[#141d2a]/95 text-xs font-semibold shadow-xl">
                <span className="px-3.5 py-2">◀ {leftEpoch}</span>
                <span className="h-4 w-px bg-[#2a374b]" />
                <span className="px-3.5 py-2 text-[#7fb2ff]">{epoch} ▶</span>
              </div>
            </div>
          )}
        </>
      }
      right={right}
      rightRail={[
        { icon: CalendarRange, label: "Tahun", target: "tahun" },
        { icon: Eye, label: "Lapisan", target: "lapisan" },
        { icon: Palette, label: "Kelas", target: "kelas" },
      ]}
      subtitle="Aceh · Sumatera Utara · Sumatera Barat"
      title="Tutupan Lahan Sumatra"
    />
  );
}
