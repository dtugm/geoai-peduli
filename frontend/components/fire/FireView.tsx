"use client";

import type { FeatureCollection, Geometry } from "geojson";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Cloud,
  CloudFog,
  Eye,
  Factory,
  Flame,
  Layers,
  Loader2,
  MapPin,
  Moon,
  RefreshCw,
  Satellite,
  Sun,
  TrendingUp,
  Wind,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bbox as turfBbox } from "@turf/turf";

import { RasterStack } from "./FireMap";
import Timeline from "./Timeline";

import {
  BarList,
  Card,
  DashboardLayout,
  GradientLegend,
  Kpi,
  MethodCard,
  ModeCards,
  ModeItem,
  thumb,
  Segmented,
  Slider,
  ToggleRow,
  tooltipStyle,
} from "@/components/dash/kit";
import { FIRMS_RANGES, FirmsRange, FirmsResponse } from "@/lib/fire/firms.types";
import {
  dailyFrames,
  dailyPresets,
  formatWib,
  frameLabel,
  gibsLayers,
  gibsLegendUrl,
  himawariFrames,
  himawariPresets,
  latestHimawariTime,
  shiftDate,
  utcDate,
} from "@/lib/fire/gibs";
import {
  acquiredAt,
  ConfidenceFilter,
  DayNightFilter,
  filterRows,
  summarize,
  wibDate,
} from "@/lib/fire/hotspots";
import {
  isForecast,
  nowFrameIndex,
  smokeFrames,
  smokeLayers,
  smokePresets,
  SmokeResponse,
} from "@/lib/fire/smoke.types";
import { exposureGradient, exposureStops, renderSmokeFrame } from "@/lib/fire/smokeRender";
import { fetchSmokeHistory } from "@/lib/fire/smokeClient";
import {
  computeExposure,
  dailySummary,
  exposureLevels,
  levelOf,
  SMOKE_THRESHOLD,
  WilayahData,
  wibDay,
} from "@/lib/fire/exposure";

const FireMap = dynamic(() => import("./FireMap"), { ssr: false });

const rangeLabel: Record<FirmsRange, string> = {
  "24h": "24 jam",
  "48h": "48 jam",
  "7d": "7 hari",
};

const HOUR = 3_600_000;

/** Penanda indeks frame "jam sekarang" untuk model asap */
const NOW = -1;

const isNightWib = (iso: string) => {
  const hour = (new Date(iso).getUTCHours() + 7) % 24;

  return hour < 6 || hour >= 18;
};

const numberId = (n: number) => Math.round(n).toLocaleString("id-ID");

/** Hari-hari sebelumnya yang dipakai untuk mengisi celah orbit/awan */
const FILL_DAYS = [-2, -1];

const initialOpacity = Object.fromEntries(
  gibsLayers.map((l) => [l.key, l.defaultOpacity]),
) as Record<string, number>;

// Kartu lapisan: model asap per jam & citra satelit
const NONE = "none";
const smokeCards: ModeItem<string>[] = [
  {
    key: NONE,
    label: "Titik api saja",
    sub: "NASA FIRMS",
    icon: Flame,
    swatch: thumb("fires"),
  },
  {
    key: "smoke:pm2_5",
    label: "Paparan asap",
    sub: "Model CAMS · per jam",
    icon: Wind,
    swatch: thumb("smoke"),
  },
];

const satelliteCards: ModeItem<string>[] = [
  {
    key: "truecolor",
    label: "Citra harian",
    sub: "VIIRS true color",
    icon: Satellite,
    swatch: thumb("truecolor"),
  },
  {
    key: "himawari",
    label: "Himawari",
    sub: "tiap 10 menit",
    icon: Sun,
    swatch: thumb("himawari"),
  },
  {
    key: "himawari-ir",
    label: "Himawari IR",
    sub: "malam hari",
    icon: Moon,
    swatch: thumb("himawari-ir"),
  },
  {
    key: "aod",
    label: "AOD satelit",
    sub: "VIIRS harian",
    icon: CloudFog,
    swatch: thumb("aod"),
  },
  {
    key: "uvai",
    label: "Indeks aerosol",
    sub: "OMPS harian",
    icon: Cloud,
    swatch: thumb("uvai"),
  },
  {
    key: "co",
    label: "CO satelit",
    sub: "AIRS harian",
    icon: Factory,
    swatch: thumb("co"),
  },
];

export default function FireView() {
  const [range, setRange] = useState<FirmsRange>("24h");
  const [data, setData] = useState<FirmsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [confidence, setConfidence] = useState<ConfidenceFilter>("nominal");
  const [dayNight, setDayNight] = useState<DayNightFilter>("all");
  const [province, setProvince] = useState<number | null>(null);

  const [provincesGeo, setProvincesGeo] = useState<FeatureCollection<
    Geometry,
    { nama: string; id: number }
  > | null>(null);

  const [showPoints, setShowPoints] = useState(true);
  // Di mode paparan asap titik api disembunyikan (seperti peta asap pada umumnya)
  const [firesOnSmoke, setFiresOnSmoke] = useState(false);
  const [showHeat, setShowHeat] = useState(false);
  const [showProvinces, setShowProvinces] = useState(true);

  // Satu lapisan latar aktif dalam satu waktu supaya produk berbeda tidak tumpang tindih
  const [activeLayer, setActiveLayer] = useState<string | null>("smoke:pm2_5");
  const [opacity, setOpacity] = useState(initialOpacity);
  const [fillGaps, setFillGaps] = useState(true);
  const [dailyDate, setDailyDate] = useState(() => utcDate(0));
  const [himawariLatest, setHimawariLatest] = useState<string | null>(null);

  // Model sebaran asap (CAMS) + angin
  const [smokeData, setSmokeData] = useState<SmokeResponse | null>(null);
  const [smokeError, setSmokeError] = useState<string | null>(null);
  const [smokeOpacity, setSmokeOpacity] = useState(85);
  const [showWind, setShowWind] = useState(true);
  // Titik api tetap statis saat animasi, kecuali pengguna memilih menyinkronkan
  const [syncHotspots, setSyncHotspots] = useState(false);

  // Animasi
  const [animating, setAnimating] = useState(false);
  const [presetKey, setPresetKey] = useState(smokePresets[0].key);
  const [frameIndex, setFrameIndex] = useState(NOW);
  const [wilayah, setWilayah] = useState<WilayahData | null>(null);
  const [loadedFrames, setLoadedFrames] = useState<Set<string>>(() => new Set());


  const layer = gibsLayers.find((l) => l.key === activeLayer) ?? null;
  const smokeLayer = smokeLayers.find((l) => l.key === activeLayer) ?? null;
  const mode: "smoke" | "daily" | "10min" = smokeLayer ? "smoke" : (layer?.time ?? "daily");
  const isDaily = mode === "daily";
  const presets =
    mode === "smoke" ? smokePresets : mode === "daily" ? dailyPresets : himawariPresets;
  const preset = presets.find((p) => p.key === presetKey) ?? presets[0];

  // Titik api mengikuti frame hanya bila disinkronkan (dan bukan mode model asap)
  const hotspotsFollow = animating && syncHotspots && mode !== "smoke";
  const effectiveRange: FirmsRange = hotspotsFollow ? "7d" : range;

  // Di layar kecil panel statistik mulai tertutup supaya peta terlihat.
  // Tampilan juga bisa dibuka langsung lewat URL, mis.
  // /kebakaran?layer=uvai&anim=7d&frame=3&date=2026-10-15
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const qLayer =
      gibsLayers.find((l) => l.key === q.get("layer")) ??
      smokeLayers.find((l) => l.key === q.get("layer"));
    const qPresets = !qLayer
      ? dailyPresets
      : "variable" in qLayer
        ? smokePresets
        : qLayer.time === "daily"
          ? dailyPresets
          : himawariPresets;
    const qPreset = qPresets.find((p) => p.key === q.get("anim"));
    const qDate = q.get("date");

    if (qLayer) setActiveLayer(qLayer.key);
    if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) setDailyDate(qDate);
    if (qPreset) {
      setPresetKey(qPreset.key);
      setAnimating(true);
      setFrameIndex(q.get("frame") ? Number(q.get("frame")) : NOW);
    }
  }, []);

  // DATA FIRMS -----------------------------------------------------------
  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    fetch(`/api/firms?range=${effectiveRange}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();

        if (!res.ok) throw new Error(json.error ?? "Gagal memuat data");
        setData(json);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [effectiveRange, reloadKey]);

  useEffect(() => {
    fetch("/data/indonesia-provinsi.json")
      .then((r) => r.json())
      .then(setProvincesGeo)
      .catch(() => setProvincesGeo(null));
  }, []);

  // Cari waktu Himawari terbaru begitu layer Himawari pertama kali dipilih
  useEffect(() => {
    if (isDaily || himawariLatest) return;
    latestHimawariTime().then(setHimawariLatest);
  }, [isDaily, himawariLatest]);

  // Model asap dimuat sekali begitu lapisan model pertama kali dipilih
  useEffect(() => {
    if (!smokeLayer || smokeData) return;
    setSmokeError(null);
    fetchSmokeHistory()
      .then(setSmokeData)
      .catch((e) => setSmokeError(e.message));
    fetch("/data/asap-wilayah.json")
      .then((r) => r.json())
      .then(setWilayah)
      .catch(() => setWilayah(null));
  }, [smokeLayer, smokeData]);

  // FRAME ----------------------------------------------------------------
  const frames = useMemo(() => {
    if (mode === "smoke") return smokeData ? smokeFrames(smokeData.times, preset.key) : [];
    if (isDaily) return animating ? dailyFrames(dailyDate, preset) : [dailyDate];
    if (!himawariLatest) return [];

    return animating ? himawariFrames(himawariLatest, preset) : [himawariLatest];
  }, [mode, smokeData, isDaily, animating, dailyDate, himawariLatest, preset]);

  const index =
    frameIndex === NOW ? nowFrameIndex(frames) : Math.min(frameIndex, frames.length - 1);
  const current = frames[index] ?? null;

  // FRAME MODEL ASAP: gambar PNG per frame (di-cache) + medan angin
  const smokeCache = useRef(new Map<string, string>());
  const smokeT = smokeData && current ? smokeData.times.indexOf(current) : -1;

  const smokeFrame = useMemo(() => {
    if (!smokeLayer || !smokeData || smokeT < 0) return null;
    const key = `${smokeLayer.variable}|${current}`;
    let url = smokeCache.current.get(key);

    if (!url) {
      url = renderSmokeFrame(
        smokeData.values[smokeLayer.variable][smokeT],
        smokeData.grid,
        smokeLayer.variable,
        exposureStops,
      );
      smokeCache.current.set(key, url);
    }

    return { url, grid: smokeData.grid, opacity: smokeOpacity };
  }, [smokeLayer, smokeData, smokeT, current, smokeOpacity]);

  const windField = useMemo(() => {
    if (!smokeLayer || !showWind || !smokeData || smokeT < 0) return null;

    return {
      grid: smokeData.wind.grid,
      u: smokeData.wind.u[smokeT],
      v: smokeData.wind.v[smokeT],
    };
  }, [smokeLayer, showWind, smokeData, smokeT]);

  // PAPARAN ASAP PER WILAYAH ------------------------------------------------
  const exposureModel = useMemo(
    () => (smokeData && wilayah ? computeExposure(smokeData, wilayah) : null),
    [smokeData, wilayah],
  );
  const exposureDaily = useMemo(
    () => (smokeData && exposureModel ? dailySummary(smokeData.times, exposureModel) : []),
    [smokeData, exposureModel],
  );

  // Kab/kota terpapar pada frame aktif, urut dari yang paling pekat
  const exposedNow = useMemo(() => {
    if (!exposureModel || !wilayah || smokeT < 0) return [];
    const cov = exposureModel.coverage[smokeT];
    const rat = exposureModel.ratio[smokeT];

    return wilayah.kabupaten
      .map((k, i) => ({ ...k, i, coverage: cov[i], ratio: rat[i], level: levelOf(cov[i]) }))
      .filter((k) => k.level)
      .sort((a, b) => b.ratio - a.ratio);
  }, [exposureModel, wilayah, smokeT]);

  const exposureGeo = useMemo<FeatureCollection | null>(() => {
    if (mode !== "smoke") return null;

    // Label hanya untuk 3 wilayah terpekat yang letaknya berjauhan (tidak saling tumpuk)
    const labeled: [number, number][] = [];
    const labelRank = new Map<number, number>();

    for (const k of exposedNow) {
      if (labeled.length === 3) break;
      if (labeled.every(([x, y]) => Math.hypot(x - k.c[0], y - k.c[1]) > 2.2)) {
        labeled.push(k.c);
        labelRank.set(k.i, labeled.length);
      }
    }

    return {
      type: "FeatureCollection",
      features: exposedNow.map((k) => {
        const level = exposureLevels.find((l) => l.key === k.level)!;

        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: k.c },
          properties: {
            name: `${k.n}, ${k.p}`,
            ratioText: `${k.ratio.toFixed(1).replace(".", ",")}× ambang asap`,
            color: level.color,
            r: k.level === "sangat" ? 4.5 : k.level === "pekat" ? 3.6 : 2.8,
            rank: labelRank.get(k.i) ?? 99,
          },
        };
      }),
    };
  }, [mode, exposedNow]);

  const currentDay = current ? wibDay(current) : null;

  const raster = useMemo<RasterStack | null>(() => {
    if (!layer || !current) return null;

    // Layer dengan `fill` sudah diisi penuh di tile-nya sendiri — tidak perlu ditumpuk
    const fill = layer.time === "daily" && fillGaps && !layer.fill;
    const fillOf = (t: string) => (fill ? FILL_DAYS.map((d) => shiftDate(t, d)) : []);
    const times = Array.from(new Set([...frames, ...fillOf(current)])).sort();

    return {
      layer,
      times,
      visible: [current, ...fillOf(current)],
      opacity: opacity[layer.key],
    };
  }, [layer, frames, current, fillGaps, opacity]);

  // Frame dianggap siap kalau tile-nya sudah termuat (atau tidak ada lapisan latar)
  const isReady = useCallback(
    (time: string) => !layer || loadedFrames.has(`${layer.key}|${time}`),
    [layer, loadedFrames],
  );

  const onFrameLoaded = useCallback((key: string) => {
    setLoadedFrames((s) => (s.has(key) ? s : new Set(s).add(key)));
  }, []);

  const modeOf = (key: string | null) =>
    smokeLayers.some((l) => l.key === key)
      ? "smoke"
      : (gibsLayers.find((l) => l.key === key)?.time ?? "daily");

  const changeLayer = (key: string | null) => {
    const nextMode = modeOf(key);

    if (nextMode !== mode) {
      const nextPresets =
        nextMode === "smoke" ? smokePresets : nextMode === "daily" ? dailyPresets : himawariPresets;

      setPresetKey(nextPresets[0].key);
      setFrameIndex(nextMode === "smoke" ? NOW : Number.MAX_SAFE_INTEGER);
    }
    setActiveLayer(key);
  };

  // TITIK API -----------------------------------------------------------
  // Baris dalam jendela (rentang statis atau seluruh timeline) — dasar grafik harian
  const windowRows = useMemo(
    () => (data ? filterRows(data, { confidence, dayNight, province: null }) : []),
    [data, confidence, dayNight],
  );

  // Baris pada frame aktif (saat animasi) atau seluruh rentang (statis)
  const frameRows = useMemo(() => {
    if (!data || !hotspotsFollow || !current) return windowRows;

    if (isDaily) return windowRows.filter((row) => wibDate(row, data.dates) === current);

    // Himawari: titik api yang terdeteksi hingga 12 jam sebelum waktu frame
    const end = Date.parse(current);
    const start = end - Math.max(12 * HOUR, preset.step * 60_000);

    return windowRows.filter((row) => {
      const t = acquiredAt(row, data.dates);

      return t > start && t <= end;
    });
  }, [data, hotspotsFollow, current, isDaily, windowRows, preset.step]);

  const rows = useMemo(
    () => (province === null ? frameRows : frameRows.filter((row) => row[8] === province)),
    [frameRows, province],
  );

  const stats = useMemo(() => (data ? summarize(rows, data) : null), [rows, data]);
  const national = useMemo(
    () => (data ? summarize(frameRows, data) : null),
    [frameRows, data],
  );
  const dailyTrend = useMemo(() => {
    if (!data) return [];
    const base =
      province === null ? windowRows : windowRows.filter((row) => row[8] === province);

    return summarize(base, data).days;
  }, [data, windowRows, province]);

  // Frame harian di luar 7 hari data FIRMS tidak punya titik api
  const outsideHotspots =
    hotspotsFollow && isDaily && !!data && !!current && current < shiftDate(data.dates[0], 0);

  const focusBounds = useMemo(() => {
    if (province === null || !provincesGeo) return null;
    const feature = provincesGeo.features.find((f) => f.properties.id === province);

    return feature ? (turfBbox(feature) as [number, number, number, number]) : null;
  }, [province, provincesGeo]);

  const selectProvince = useCallback(
    (id: number | null) => setProvince((cur) => (cur === id ? null : id)),
    [],
  );

  const topProvinces = national?.provinces.slice(0, 10) ?? [];


  // PANEL KIRI: ANALISIS --------------------------------------------------------
  const left = (
    <>
      {mode === "smoke" && (
        <>
          <Card icon={Wind} id="paparan" title="Wilayah terpapar asap">
            <div className="grid grid-cols-2 gap-2">
              <Kpi
                label="Kab/kota terpapar"
                sub="≥ 50% wilayah tertutup asap"
                tone="danger"
                value={exposureModel ? exposedNow.length : "–"}
              />
              <Kpi
                label="Sangat pekat"
                sub="> 90% wilayah"
                tone="warn"
                value={exposureModel ? exposedNow.filter((k) => k.level === "sangat").length : "–"}
              />
              <Kpi
                label="Provinsi terdampak"
                value={exposureModel ? new Set(exposedNow.map((k) => k.p)).size : "–"}
              />
              <Kpi
                label="Terpekat"
                sub={exposedNow[0]?.n}
                value={exposedNow[0] ? `${exposedNow[0].ratio.toFixed(1).replace(".", ",")}×` : "–"}
              />
            </div>
            {!exposureModel && !smokeError && (
              <p className="mt-3 flex items-center gap-2 text-xs text-[#9aa7b9]">
                <Loader2 className="animate-spin" size={13} /> Memuat data asap 7 hari terakhir
              </p>
            )}
            {smokeError && <p className="mt-3 text-xs text-rose-300">Gagal memuat model asap: {smokeError}</p>}
          </Card>

          {exposureDaily.length > 0 && (
            <Card hint="% luas wilayah" icon={TrendingUp} id="naik-turun" title="Naik-turun asap pekat">
              <div className="h-40">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={exposureDaily} margin={{ top: 4, right: 6, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" tick={{ fill: "#9aa7b9", fontSize: 10 }} tickLine={false} />
                    <YAxis axisLine={false} tick={{ fill: "#9aa7b9", fontSize: 10 }} tickFormatter={(v) => `${v}%`} tickLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, n) => [`${Number(v).toFixed(0)}%`, n]}
                    />
                    {currentDay && (
                      <ReferenceLine
                        stroke="#ffffff"
                        strokeOpacity={0.7}
                        x={exposureDaily.find((d) => d.day === currentDay)?.label}
                      />
                    )}
                    {exposureModel?.regions.map((r) => (
                      <Line key={r.name} dataKey={r.name} dot={false} isAnimationActive={false} stroke={r.color} strokeWidth={2} type="monotone" />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {exposureModel?.regions.map((r) => {
                  const today = exposureDaily.find((d) => d.day === currentDay) as Record<string, number> | undefined;

                  return (
                    <span key={r.name} className="inline-flex items-center gap-1.5 text-[11px] text-[#c9d4e3]">
                      <span className="h-0.5 w-3 rounded" style={{ background: r.color }} />
                      {r.name}
                      <span className="font-semibold tabular-nums" style={{ color: r.color }}>
                        {today ? `${Math.round(today[r.name])}%` : ""}
                      </span>
                    </span>
                  );
                })}
              </div>
            </Card>
          )}

          {exposureDaily.length > 0 && (
            <Card hint="kab/kota" icon={BarChart3} id="per-hari" title="Wilayah melebihi ambang per hari">
              <div className="h-28">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={exposureDaily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" tick={{ fill: "#9aa7b9", fontSize: 10 }} tickLine={false} />
                    <YAxis axisLine={false} tick={{ fill: "#9aa7b9", fontSize: 10 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v} kab/kota`, "Terpapar"]} />
                    <Bar dataKey="kabupaten" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                      {exposureDaily.map((d) => (
                        <Cell
                          key={d.day}
                          fill={d.day === currentDay ? "#ffffff" : d.day > (wibDay(new Date().toISOString())) ? "#475569" : "#94a3b8"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-[10px] text-[#6e7b8f]">Batang gelap = prakiraan.</p>
            </Card>
          )}

          {exposedNow.length > 0 && (
            <Card icon={MapPin} id="terpekat" title="Paling terpapar">
              <BarList
                format={(v) => `${v.toFixed(1).replace(".", ",")}×`}
                rows={exposedNow.slice(0, 8).map((k) => ({
                  key: k.i,
                  label: `${k.n} · ${k.p}`,
                  value: k.ratio,
                  color: "#cbc1b3",
                }))}
              />
              <p className="mt-2 text-[10px] text-[#6e7b8f]">
                Kelipatan ambang asap (PM2.5 {SMOKE_THRESHOLD} µg/m³, batas tidak sehat ISPU).
              </p>
            </Card>
          )}
        </>
      )}

      <Card icon={BarChart3} id="ringkasan" title="Ringkasan titik api">
        <div className="space-y-2">
          {hotspotsFollow ? (
            <p className="rounded-xl bg-[#1c3050] px-3 py-2 text-xs text-[#c9d4e3]">
              Mengikuti frame{" "}
              <strong className="text-white">
                {current ? (isDaily ? current : formatWib(current)) : "–"}
              </strong>
            </p>
          ) : (
            <Segmented
              options={FIRMS_RANGES.map((r) => ({ key: r, label: rangeLabel[r] }))}
              value={range}
              onChange={setRange}
            />
          )}
          <Segmented<ConfidenceFilter>
            options={[
              { key: "all", label: "Semua" },
              { key: "nominal", label: "Yakin" },
              { key: "high", label: "Sangat yakin" },
            ]}
            size="sm"
            value={confidence}
            onChange={setConfidence}
          />
          <Segmented<DayNightFilter>
            options={[
              { key: "all", label: "Siang & malam" },
              { key: "day", label: "Siang" },
              { key: "night", label: "Malam" },
            ]}
            size="sm"
            value={dayNight}
            onChange={setDayNight}
          />
        </div>

        {error && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
            <span>Gagal memuat titik api: {error}</span>
            <button
              className="inline-flex items-center gap-1 font-medium text-white"
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              <RefreshCw size={12} /> Ulangi
            </button>
          </div>
        )}

        {province !== null && data && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#1c3050] px-3 py-2 text-sm">
            <span>
              Provinsi: <strong>{data.provinces[province]}</strong>
            </span>
            <button
              aria-label="Hapus filter provinsi"
              className="text-[#9aa7b9] hover:text-white"
              type="button"
              onClick={() => setProvince(null)}
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <Kpi label="Titik api" tone="danger" value={stats ? numberId(stats.total) : "–"} />
          <Kpi label="Sangat yakin" value={stats ? numberId(stats.high) : "–"} />
          <Kpi label="Total intensitas" sub="FRP (MW)" tone="warn" value={stats ? numberId(stats.frp) : "–"} />
          <Kpi
            label={province === null ? "Provinsi terdampak" : "Hari terdeteksi"}
            value={stats ? (province === null ? stats.provinces.length : stats.days.length) : "–"}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#141d2a]/80 text-sm text-[#c9d4e3]">
              <Loader2 className="mr-2 animate-spin" size={16} /> Mengambil data
            </div>
          )}
        </div>
        {outsideHotspots && (
          <p className="mt-2 text-[11px] text-[#9aa7b9]">Titik api hanya tersedia untuk 7 hari terakhir.</p>
        )}
        {data && (
          <p className="mt-2 text-[11px] text-[#6e7b8f]">Diperbarui {formatWib(data.fetchedAt)}</p>
        )}
      </Card>

      {topProvinces.length > 0 && (
        <Card hint="klik untuk fokus" icon={MapPin} id="provinsi" title="Provinsi terbanyak">
          <BarList
            format={numberId}
            rows={topProvinces.map((p) => ({ key: p.id, label: p.name, value: p.count, color: "#f97316" }))}
            selected={province}
            onSelect={(id) => selectProvince(Number(id))}
          />
        </Card>
      )}

      {dailyTrend.length > 1 && (
        <Card icon={TrendingUp} id="tren" title="Titik api per hari">
          <div className="h-36">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={dailyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis axisLine={false} dataKey="label" tick={{ fill: "#9aa7b9", fontSize: 10 }} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "#9aa7b9", fontSize: 10 }}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : v)}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => numberId(Number(v))} />
                {(["siang", "malam"] as const).map((key) => (
                  <Bar key={key} dataKey={key} isAnimationActive={false} radius={key === "malam" ? [3, 3, 0, 0] : undefined} stackId="a">
                    {dailyTrend.map((d) => (
                      <Cell
                        key={d.date}
                        fill={key === "siang" ? "#f97316" : "#7c3aed"}
                        fillOpacity={hotspotsFollow && isDaily && current && d.date !== current ? 0.3 : 1}
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex gap-4 text-[11px] text-[#9aa7b9]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-orange-500" /> Siang
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-violet-600" /> Malam
            </span>
          </div>
        </Card>
      )}

      <MethodCard
        points={[
          { label: "Titik api", text: "Deteksi panas satelit VIIRS (NASA FIRMS), diperbarui beberapa kali sehari, dirangkum per provinsi." },
          { label: "Asap", text: "Model CAMS (Copernicus) per jam dengan angin 925 hPa untuk melihat ke mana asap terbawa." },
          { label: "Citra", text: "Citra harian VIIRS, Himawari tiap 10 menit, serta produk aerosol & CO dari NASA GIBS." },
          { label: "Catatan", text: "Titik panas bisa juga berasal dari suar gas atau industri — gunakan sebagai indikasi awal." },
        ]}
      />
    </>
  );

  // PANEL KANAN: LAPISAN --------------------------------------------------------
  const activeKey = activeLayer ?? NONE;
  const right = (
    <>
      <Card icon={Wind} id="lapisan" title="Asap per jam">
        <ModeCards items={smokeCards} value={activeKey} onChange={(k) => changeLayer(k === NONE ? null : k)} />
      </Card>

      <Card defaultOpen={false} icon={Satellite} id="citra" title="Citra satelit">
        <ModeCards items={satelliteCards} value={activeKey} onChange={(k) => changeLayer(k)} />
      </Card>

      <Card icon={Eye} id="legenda" title="Legenda">
        {smokeLayer ? (
          <div className="space-y-3">
            <GradientLegend gradient={exposureGradient} labels={["25", "55", "100", "200", "400 µg/m³"]} />
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#c9d4e3]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#cbc1b3]" /> Asap
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded bg-white/60" /> Aliran angin
              </span>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] text-[#9aa7b9]">Titik = kab/kota tertutup asap</p>
              <div className="flex gap-3 text-[11px] text-[#c9d4e3]">
                {exposureLevels.map((l) => (
                  <span key={l.key} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full ring-1 ring-[#1e1b4b]" style={{ background: l.color }} />
                    {l.label}
                    <span className="text-[#6e7b8f]">{l.range}</span>
                  </span>
                ))}
              </div>
            </div>
            <Slider format={(v) => `${v}%`} label="Opasitas asap" max={100} min={10} value={smokeOpacity} onChange={setSmokeOpacity} />
            <ToggleRow checked={showWind} icon={Wind} label="Arah angin" onChange={setShowWind} />
            <ToggleRow checked={firesOnSmoke} icon={Flame} label="Titik api di atas asap" onChange={setFiresOnSmoke} />
          </div>
        ) : layer ? (
          <div className="space-y-3">
            <p className="text-[12px] text-[#9aa7b9]">{layer.description}</p>
            {layer.legend && (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={`Legenda ${layer.label}`} className="w-full rounded-lg bg-white p-1" src={gibsLegendUrl(layer.legend)} />
            )}
            <Slider
              format={(v) => `${v}%`}
              label="Opasitas"
              max={100}
              min={10}
              value={opacity[layer.key]}
              onChange={(v) => setOpacity((o) => ({ ...o, [layer.key]: v }))}
            />
            {layer.time === "daily" ? (
              <>
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#9aa7b9]">{animating ? "Tanggal akhir" : "Tanggal citra"}</span>
                  <input
                    aria-label="Tanggal citra"
                    className="rounded-lg bg-[#0f1722] px-2 py-1 text-xs text-white [color-scheme:dark]"
                    max={utcDate(0)}
                    min="2012-01-01"
                    type="date"
                    value={dailyDate}
                    onChange={(e) => e.target.value && setDailyDate(e.target.value)}
                  />
                </label>
                {layer.fill ? (
                  <p className="text-[11px] text-[#9aa7b9]">
                    Celah diisi otomatis: satelit lain di hari yang sama, hari sebelumnya, lalu interpolasi.
                  </p>
                ) : (
                  <ToggleRow checked={fillGaps} label="Isi celah dengan hari sebelumnya" onChange={setFillGaps} />
                )}
              </>
            ) : (
              <p className="text-xs text-[#9aa7b9]">
                {current ? `Waktu citra ${formatWib(current)}` : "Mencari citra terbaru…"}
                {layer.key === "himawari" && current && isNightWib(current) && " · malam hari, citra gelap"}
              </p>
            )}
            <ToggleRow checked={syncHotspots} label="Titik api ikut animasi" onChange={setSyncHotspots} />
          </div>
        ) : (
          <GradientLegend
            gradient="linear-gradient(90deg,#fde047,#ef4444,#7f1d1d)"
            labels={["0", "10", "50", "200", "1.000+ MW"]}
          />
        )}
      </Card>

      <Card icon={Flame} id="titik" title="Titik api">
        <ToggleRow checked={showPoints} icon={Flame} label="Titik api" onChange={setShowPoints} />
        <ToggleRow checked={showHeat} icon={Layers} label="Peta kepadatan" onChange={setShowHeat} />
        <ToggleRow checked={showProvinces} icon={MapPin} label="Batas provinsi" onChange={setShowProvinces} />
      </Card>
    </>
  );

  return (
    <DashboardLayout
      backHref="/katalog/kebakaran-hutan-asap-indonesia"
      icon={Flame}
      left={left}
      leftRail={[
        { icon: Wind, label: "Paparan asap", target: "paparan" },
        { icon: BarChart3, label: "Ringkasan", target: "ringkasan" },
        { icon: MapPin, label: "Provinsi", target: "provinsi" },
        { icon: TrendingUp, label: "Tren", target: "tren" },
      ]}
      map={
        <>
          <FireMap
            data={data}
            focusBounds={focusBounds}
            provincesGeo={provincesGeo}
            raster={raster}
            rows={rows}
            selectedProvince={province}
            showHeat={showHeat}
            showPoints={showPoints && (mode !== "smoke" || firesOnSmoke)}
            showProvinces={showProvinces && mode !== "smoke"}
            exposure={exposureGeo}
            smoke={smokeFrame}
            wind={windField}
            onFrameLoaded={onFrameLoaded}
            onSelectProvince={selectProvince}
          />
          {mode === "smoke" && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-80px)]">
              <div className="rounded-2xl bg-[#0b111a]/85 px-4 py-3 shadow-xl backdrop-blur">
                <p className="text-[15px] font-bold leading-tight text-white">Wilayah Terpapar Asap</p>
                <p className="text-[11px] text-[#c9d4e3]">
                  Kab/kota yang mayoritas wilayahnya tertutup asap
                </p>
                {current && (
                  <div className="mt-2.5 flex items-end gap-3">
                    <p className="text-[22px] font-bold leading-none tabular-nums text-white">
                      {new Date(current).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "Asia/Jakarta",
                      })}
                    </p>
                    <p className="pb-0.5 text-sm font-semibold tabular-nums text-[#ddd6ca]">
                      {new Date(current).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Jakarta",
                      })}{" "}
                      WIB
                    </p>
                    {isForecast(current) && (
                      <span className="mb-0.5 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        prakiraan
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <Timeline
            active={animating || mode === "smoke"}
            frames={frames}
            hint={mode === "smoke" && current ? (isForecast(current) ? "prakiraan model" : "analisis model") : undefined}
            index={index}
            isReady={isReady}
            labelFor={(t) =>
              isDaily ? frameLabel(t, true) : `${formatWib(t)}${mode === "smoke" && isForecast(t) ? " · prakiraan" : ""}`
            }
            preset={preset}
            presets={presets}
            onActiveChange={(on) => {
              // Menutup timeline di mode asap = kembali ke tampilan titik api saja
              if (!on && mode === "smoke") {
                changeLayer(null);
                setAnimating(false);

                return;
              }
              if (on && activeLayer === null) {
                setActiveLayer(smokeLayers[0].key);
                setPresetKey(smokePresets[0].key);
                setFrameIndex(NOW);
              } else {
                setFrameIndex(mode === "smoke" ? NOW : Number.MAX_SAFE_INTEGER);
              }
              setAnimating(on);
            }}
            onIndexChange={setFrameIndex}
            onPresetChange={(key) => {
              setPresetKey(key);
              setFrameIndex(mode === "smoke" ? NOW : Number.MAX_SAFE_INTEGER);
            }}
          />
        </>
      }
      right={right}
      rightRail={[
        { icon: Wind, label: "Asap", target: "lapisan" },
        { icon: Satellite, label: "Citra", target: "citra" },
        { icon: Eye, label: "Legenda", target: "legenda" },
        { icon: Flame, label: "Titik api", target: "titik" },
      ]}
      subtitle="Titik api & sebaran asap · seluruh Indonesia"
      title="Kebakaran Hutan & Asap"
    />
  );
}
