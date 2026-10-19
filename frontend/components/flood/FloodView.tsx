"use client";

import type { FeatureCollection } from "geojson";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  Blend,
  Calculator,
  Droplets,
  Eye,
  Layers,
  Loader2,
  MapPin,
  Radar,
  Satellite,
  SlidersHorizontal,
  SquareDashed,
  Sprout,
  Users,
  Waves,
  X,
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bbox as turfBbox } from "@turf/turf";

import type { Basemap, FloodPoi, RasterLayer } from "./FloodMap";

import {
  BarList,
  Card,
  Chip,
  DashboardLayout,
  GradientLegend,
  Kpi,
  LegendDots,
  MethodCard,
  ModeCards,
  ModeItem,
  thumb,
  Segmented,
  Slider,
  ToggleRow,
  tooltipStyle,
} from "@/components/dash/kit";
import {
  AOI_BBOX,
  backscatterTiles,
  defaultParams,
  dryPeriods,
  floodArea,
  floodPeriods,
  FloodParams,
  Mosaics,
  processedTiles,
  registerDem,
  registerGsw,
  registerS1,
  registerS2,
  S1_MAX_ZOOM,
  S1_MIN_ZOOM,
  S2Style,
  s2Tiles,
  tileCount,
} from "@/lib/flood/s1";
import { FloodStats, landcoverColor, PROVINCES, provinceColor } from "@/lib/flood/stats.types";

const FloodMap = dynamic(() => import("./FloodMap"), { ssr: false });

type View = "flood" | "rgb" | "s1-dry" | "s1-wet" | "s2-dry" | "s2-wet";
type Mode = "flood" | "rgb" | "s1" | "s2";
type Epoch = "dry" | "compare" | "wet";

const S2_MIN_ZOOM = 9;
// Periode tetap: musim kering Jul–Agu 2025 vs banjir 26 Nov–6 Des 2025
const DRY = dryPeriods[0];
const WET = floodPeriods[1];

const modes: (ModeItem<Mode> & { description: string })[] = [
  {
    key: "flood",
    label: "Genangan",
    sub: "Deteksi Sentinel-1",
    description: "Area yang berubah menjadi gelap seperti air saat banjir.",
    icon: Droplets,
    swatch: thumb("flood"),
  },
  {
    key: "rgb",
    label: "Perubahan",
    sub: "Komposit RGB",
    description: "Merah = menggelap saat banjir (genangan), cyan = menerang.",
    icon: Blend,
    swatch: thumb("flood-rgb"),
  },
  {
    key: "s1",
    label: "Radar",
    sub: "Sentinel-1 VV",
    description: "Radar menembus awan — air tenang tampak hitam.",
    icon: Radar,
    swatch: thumb("flood-s1"),
  },
  {
    key: "s2",
    label: "Optik",
    sub: "Sentinel-2",
    description: "Citra satelit biasa — sebagian tertutup awan, tetapi lumpur banjir terlihat jelas.",
    icon: Satellite,
    swatch: thumb("flood-s2"),
  },
];

const fmt = (n: number, d = 0) =>
  n.toLocaleString("id-ID", { maximumFractionDigits: d, minimumFractionDigits: d });

const compact = (n: number) =>
  n >= 1_000_000 ? `${fmt(n / 1_000_000, 1)} jt` : n >= 10_000 ? `${fmt(n / 1000)} rb` : fmt(n);

export default function FloodView() {
  const [mosaics, setMosaics] = useState<Mosaics | null>(null);
  const [s2, setS2] = useState<{ dry: string; wet: string } | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("flood");
  const [epoch, setEpoch] = useState<Epoch>("wet");
  const [s2Style, setS2Style] = useState<S2Style>("true");
  const [overlayFlood, setOverlayFlood] = useState(false);
  const [draft, setDraft] = useState<FloodParams>(defaultParams);
  const [params, setParams] = useState<FloodParams>(defaultParams);
  const [opacity, setOpacity] = useState(90);
  const [basemap, setBasemap] = useState<Basemap>("dark");
  const [showPois, setShowPois] = useState(true);
  const [showKabupaten, setShowKabupaten] = useState(true);

  const [stats, setStats] = useState<FloodStats | null>(null);
  const [provinces, setProvinces] = useState<FeatureCollection | null>(null);
  const [kabupatenGeo, setKabupatenGeo] = useState<FeatureCollection | null>(null);
  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const [mapView, setMapView] = useState<{ bounds: [number, number, number, number]; zoom: number } | null>(
    null,
  );
  const [focus, setFocus] = useState<{ bounds: [number, number, number, number]; key: number } | null>(null);
  const [area, setArea] = useState<{ flood: number; increase: number; z: number } | null>(null);
  const [areaProgress, setAreaProgress] = useState<[number, number] | null>(null);
  const areaAbort = useRef<AbortController | null>(null);

  // DATA ---------------------------------------------------------------------
  useEffect(() => {
    fetch("/data/banjir-sumatra-2025.json")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
    fetch("/data/kabupaten-sumatra.json")
      .then((r) => r.json())
      .then(setKabupatenGeo)
      .catch(() => setKabupatenGeo(null));
    fetch("/data/indonesia-provinsi.json")
      .then((r) => r.json())
      .then((fc: FeatureCollection) =>
        setProvinces({
          ...fc,
          features: fc.features.filter((f) =>
            (PROVINCES as readonly string[]).includes(f.properties?.nama),
          ),
        }),
      )
      .catch(() => setProvinces(null));

    Promise.all([registerS1(DRY), registerS1(WET), registerDem(), registerGsw()])
      .then(([d, w, dem, gsw]) => setMosaics({ dry: d, wet: w, dem, gsw }))
      .catch((e) => setRegisterError(e.message));
    // Sentinel-2: acuan dibatasi awan ≤ 40%, saat banjir ≤ 80% (musim hujan)
    Promise.all([registerS2(DRY, 40), registerS2(WET, 80)])
      .then(([d, w]) => setS2({ dry: d, wet: w }))
      .catch(() => setS2(null));
  }, []);

  // Slider ambang di-debounce supaya tile tidak dimuat ulang setiap geseran
  useEffect(() => {
    const t = setTimeout(() => setParams(draft), 400);

    return () => clearTimeout(t);
  }, [draft]);

  useEffect(() => {
    areaAbort.current?.abort();
    setArea(null);
    setAreaProgress(null);
  }, [mosaics, params]);

  // LAPISAN ------------------------------------------------------------------
  const floodLayer = useMemo<RasterLayer | null>(
    () =>
      mosaics
        ? { tiles: processedTiles("flood", mosaics, params), minzoom: S1_MIN_ZOOM, maxzoom: S1_MAX_ZOOM }
        : null,
    [mosaics, params],
  );

  const layerFor = (v: View): RasterLayer | null => {
    if (v === "flood") return floodLayer;
    if (v === "s2-dry" || v === "s2-wet") {
      return s2
        ? { tiles: s2Tiles(v === "s2-dry" ? s2.dry : s2.wet, s2Style), minzoom: S2_MIN_ZOOM, maxzoom: 14 }
        : null;
    }
    if (!mosaics) return null;
    if (v === "rgb") {
      return { tiles: processedTiles("rgb", mosaics, params), minzoom: S1_MIN_ZOOM, maxzoom: S1_MAX_ZOOM };
    }

    return {
      tiles: backscatterTiles(mosaics, v === "s1-dry" ? "dry" : "wet"),
      minzoom: S1_MIN_ZOOM,
      maxzoom: S1_MAX_ZOOM,
    };
  };

  const sensor = mode === "s1" || mode === "s2" ? mode : null;
  const comparing = sensor !== null && epoch === "compare";
  const view: View = sensor ? (`${sensor}-${epoch === "dry" ? "dry" : "wet"}` as View) : (mode as View);
  const background = useMemo(
    () => layerFor(view),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, floodLayer, s2, s2Style, mosaics, params],
  );
  const compareLayer = useMemo(
    () => (comparing ? layerFor(`${sensor}-dry` as View) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comparing, sensor, s2, s2Style, mosaics],
  );
  const overlay = mode !== "flood" && overlayFlood ? floodLayer : null;

  // STATISTIK ----------------------------------------------------------------
  const kabRows = useMemo(
    () =>
      (stats?.kabupaten ?? [])
        .map((k, id) => ({ ...k, id }))
        .filter((k) => !provinceFilter || k.province === provinceFilter),
    [stats, provinceFilter],
  );

  const summary = useMemo(() => {
    if (!stats) return null;
    const landcover: Record<string, number> = {};

    kabRows.forEach((r) =>
      Object.entries(r.landcover).forEach(([c, v]) => (landcover[c] = (landcover[c] ?? 0) + v)),
    );

    return {
      floodHa: kabRows.reduce((s, r) => s + r.floodHa, 0),
      pop: kabRows.reduce((s, r) => s + r.pop, 0),
      affected: kabRows.filter((r) => r.affected).length,
      total: kabRows.length,
      landcover: Object.entries(landcover)
        .map(([name, ha]) => ({ name, ha }))
        .filter((l) => l.ha > 1)
        .sort((a, b) => b.ha - a.ha),
    };
  }, [stats, kabRows]);

  const topKab = kabRows.filter((k) => k.floodHa > 0).slice(0, 10);

  const pois = useMemo<FloodPoi[]>(
    () =>
      (stats?.kabupaten ?? [])
        .map((k, id) => ({ k, id }))
        .filter(({ k }) => k.affected && k.center)
        .map(({ k, id }) => ({
          id,
          name: k.name,
          lon: k.center![0],
          lat: k.center![1],
          floodHa: k.floodHa,
          color: provinceColor[k.province] ?? "#38bdf8",
        })),
    [stats],
  );

  const focusOn = (bounds: [number, number, number, number]) =>
    setFocus((f) => ({ bounds, key: (f?.key ?? 0) + 1 }));

  const selectKabupaten = (id: number) => {
    const k = stats?.kabupaten[id];

    if (!k) return;
    setSelected(id);
    if (k.center) {
      const [lon, lat] = k.center;

      focusOn([lon - 0.22, lat - 0.16, lon + 0.22, lat + 0.16]);
    } else {
      focusOn(k.bbox);
    }
  };

  const focusProvince = (name: string | null) => {
    setProvinceFilter(name);
    setSelected(null);
    const f = name ? provinces?.features.find((p) => p.properties?.nama === name) : null;

    focusOn(f ? (turfBbox(f) as [number, number, number, number]) : AOI_BBOX);
  };

  const areaPlan = useMemo(() => {
    if (!mapView || mapView.zoom < 8) return null;
    const b: [number, number, number, number] = [
      Math.max(mapView.bounds[0], AOI_BBOX[0]),
      Math.max(mapView.bounds[1], AOI_BBOX[1]),
      Math.min(mapView.bounds[2], AOI_BBOX[2]),
      Math.min(mapView.bounds[3], AOI_BBOX[3]),
    ];

    if (b[0] >= b[2] || b[1] >= b[3]) return null;
    for (let z = Math.min(12, Math.floor(mapView.zoom) + 1); z >= 10; z--) {
      if (tileCount(b, z) <= 120) return { bounds: b, z, tiles: tileCount(b, z) };
    }

    return null;
  }, [mapView]);

  const computeArea = async () => {
    if (!mosaics || !areaPlan) return;
    areaAbort.current?.abort();
    const controller = new AbortController();

    areaAbort.current = controller;
    setArea(null);
    setAreaProgress([0, areaPlan.tiles]);
    const result = await floodArea(
      mosaics,
      areaPlan.bounds,
      areaPlan.z,
      params,
      (d, t) => !controller.signal.aborted && setAreaProgress([d, t]),
      controller.signal,
    );

    if (controller.signal.aborted) return;
    setArea({ flood: result.flood, increase: result.increase, z: areaPlan.z });
    setAreaProgress(null);
  };

  const selectedKab = selected !== null ? stats?.kabupaten[selected] : null;
  const activeMode = modes.find((m) => m.key === mode)!;

  // PANEL KIRI: ANALISIS --------------------------------------------------------
  const left = (
    <>
      <Card icon={BarChart3} id="ringkasan" title="Ringkasan dampak">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[null, ...PROVINCES].map((p) => (
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
            label="Luas genangan"
            sub={summary ? `${fmt(summary.floodHa / 100)} km²` : undefined}
            tone="brand"
            value={summary ? `${compact(summary.floodHa)} ha` : "–"}
          />
          <Kpi
            label="Kabupaten/kota terdampak"
            sub={summary ? `dari ${summary.total} wilayah` : undefined}
            value={summary ? summary.affected : "–"}
          />
          <Kpi
            label="Penduduk di area genangan"
            sub="estimasi WorldPop"
            tone="warn"
            value={summary ? compact(summary.pop) : "–"}
          />
          <Kpi
            label="Sawah tergenang"
            sub="ESA WorldCover"
            tone="good"
            value={
              summary
                ? `${compact(summary.landcover.find((l) => l.name === "Pertanian/sawah")?.ha ?? 0)} ha`
                : "–"
            }
          />
        </div>
        {selectedKab && (
          <div className="mt-3 rounded-2xl bg-[#1c3050] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{selectedKab.name}</p>
                <p className="text-[11px] text-[#9aa7b9]">{selectedKab.province}</p>
              </div>
              <button
                aria-label="Tutup"
                className="text-[#9aa7b9] hover:text-white"
                type="button"
                onClick={() => setSelected(null)}
              >
                <X size={15} />
              </button>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              {[
                ["Genangan", `${compact(selectedKab.floodHa)} ha`],
                ["Penduduk", compact(selectedKab.pop)],
                ["Dari total", `${fmt((selectedKab.pop / Math.max(selectedKab.popTotal, 1)) * 100, 1)}%`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-[#0f1722] px-2 py-1.5">
                  <dt className="text-[10px] text-[#9aa7b9]">{l}</dt>
                  <dd className="text-sm font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Card>

      {topKab.length > 0 && (
        <Card hint="klik untuk zoom" icon={Waves} id="kabupaten" title="Genangan per kabupaten">
          <div style={{ height: topKab.length * 24 + 6 }}>
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={topKab} layout="vertical" margin={{ top: 0, right: 6, bottom: 0, left: 0 }}>
                <XAxis hide type="number" />
                <YAxis
                  axisLine={false}
                  dataKey="name"
                  tick={{ fill: "#c9d4e3", fontSize: 10 }}
                  tickLine={false}
                  type="category"
                  width={108}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  formatter={(v) => [`${fmt(Number(v))} ha`, "Genangan"]}
                />
                <Bar
                  className="cursor-pointer"
                  dataKey="floodHa"
                  isAnimationActive={false}
                  radius={[0, 4, 4, 0]}
                  onClick={(d) => selectKabupaten((d as unknown as { id: number }).id)}
                >
                  {topKab.map((k) => (
                    <Cell
                      key={k.id}
                      fill={provinceColor[k.province]}
                      fillOpacity={selected === null || selected === k.id ? 1 : 0.35}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2">
            <LegendDots items={PROVINCES.map((p) => ({ label: p, color: provinceColor[p] }))} />
          </div>
        </Card>
      )}

      {topKab.length > 0 && (
        <Card icon={Users} id="penduduk" title="Penduduk terdampak">
          <BarList
            format={(v) => `${fmt(v)} jiwa`}
            rows={[...topKab]
              .sort((a, b) => b.pop - a.pop)
              .slice(0, 8)
              .map((k) => ({ key: k.id, label: k.name, value: k.pop, color: "#f59e0b" }))}
            selected={selected}
            onSelect={(id) => selectKabupaten(Number(id))}
          />
        </Card>
      )}

      {summary && summary.landcover.length > 0 && (
        <Card icon={Sprout} id="lahan" title="Lahan yang tergenang">
          <div className="flex h-3 overflow-hidden rounded-full bg-[#0f1722]">
            {summary.landcover.map((l) => (
              <div
                key={l.name}
                style={{
                  width: `${(l.ha / summary.floodHa) * 100}%`,
                  background: landcoverColor[l.name] ?? "#64748b",
                }}
                title={l.name}
              />
            ))}
          </div>
          <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {summary.landcover.slice(0, 8).map((l) => (
              <li key={l.name} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 truncate text-[#c9d4e3]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: landcoverColor[l.name] ?? "#64748b" }}
                  />
                  {l.name}
                </span>
                <span className="tabular-nums text-[#9aa7b9]">{compact(l.ha)} ha</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card defaultOpen={false} icon={Calculator} id="hitung" title="Hitung di area tampilan">
        <p className="mb-2.5 text-[12px] text-[#9aa7b9]">
          Hitung ulang luas genangan untuk area peta saat ini dengan ambang yang sedang dipakai.
        </p>
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f80ed] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#3b8cf5] disabled:opacity-40"
          disabled={!mosaics || !areaPlan || !!areaProgress}
          type="button"
          onClick={computeArea}
        >
          {areaProgress ? (
            <>
              <Loader2 className="animate-spin" size={15} /> {areaProgress[0]}/{areaProgress[1]} tile
            </>
          ) : areaPlan ? (
            <>
              <Calculator size={15} /> Hitung luas genangan
            </>
          ) : (
            "Perbesar peta untuk menghitung"
          )}
        </button>
        {area && (
          <p className="mt-2.5 text-sm">
            <strong className="text-[#7fb2ff]">{fmt(area.flood)} ha</strong> genangan baru
          </p>
        )}
      </Card>

      <MethodCard
        points={[
          {
            label: "Data",
            text: "Radar Sentinel-1 musim kering (Jul–Agu 2025) dibandingkan dengan saat banjir (26 Nov–6 Des 2025).",
          },
          {
            label: "Deteksi",
            text: `Genangan = area yang sinyal radarnya turun ≥ ${fmt(params.drop, 1)} dB dan menjadi gelap seperti air, di dataran < ${params.maxElev} m, di luar sungai & danau permanen.`,
          },
          {
            label: "Dampak",
            text: "Penduduk dari WorldPop 2020, jenis lahan dari ESA WorldCover, dihitung per kabupaten.",
          },
          {
            label: "Catatan",
            text: "Sawah yang sengaja digenangi bisa ikut terhitung; banjir di permukiman & bawah pohon sering tidak terdeteksi.",
          },
        ]}
      />
    </>
  );

  // PANEL KANAN: LAPISAN --------------------------------------------------------
  const right = (
    <>
      <Card icon={Layers} id="lapisan" title="Lapisan">
        <ModeCards items={modes} value={mode} onChange={setMode} />
        {sensor && (
          <div className="mt-3">
            <Segmented
              options={[
                { key: "dry" as Epoch, label: "Kering", sub: "Jul–Agu" },
                {
                  key: "compare" as Epoch,
                  label: (
                    <span className="inline-flex items-center gap-1">
                      <ArrowLeftRight size={11} /> Bandingkan
                    </span>
                  ),
                  sub: "geser",
                },
                { key: "wet" as Epoch, label: "Banjir", sub: "26 Nov–6 Des" },
              ]}
              value={epoch}
              onChange={setEpoch}
            />
          </div>
        )}
        {mode === "s2" && (
          <div className="mt-2">
            <Segmented
              options={[
                { key: "true" as S2Style, label: "Warna asli" },
                { key: "swir" as S2Style, label: "Semu SWIR" },
              ]}
              size="sm"
              value={s2Style}
              onChange={setS2Style}
            />
          </div>
        )}
        {registerError && (
          <p className="mt-2 text-xs text-rose-300">Gagal menyiapkan citra: {registerError}</p>
        )}
      </Card>

      <Card icon={Eye} id="legenda" title="Legenda">
        <p className="mb-2.5 text-[12px] text-[#9aa7b9]">{activeMode.description}</p>
        {mode === "flood" && (
          <LegendDots
            items={[
              { label: "Genangan baru", color: "rgb(0,200,255)" },
              ...(draft.permanent ? [{ label: "Perairan permanen", color: "rgb(30,58,138)" }] : []),
              ...(draft.increase ? [{ label: "Backscatter naik", color: "rgb(236,72,153)" }] : []),
            ]}
          />
        )}
        {mode === "rgb" && (
          <GradientLegend
            gradient="linear-gradient(90deg,#dc2626,#94a3b8,#22d3ee)"
            labels={["Menggelap", "Tetap", "Menerang"]}
          />
        )}
        {mode === "s1" && (
          <GradientLegend gradient="linear-gradient(90deg,#000,#fff)" labels={["−25 dB · air", "0 dB"]} />
        )}
        <div className="mt-3 space-y-2">
          <Slider format={(v) => `${v}%`} label="Opasitas" max={100} min={20} value={opacity} onChange={setOpacity} />
          {mode !== "flood" && (
            <ToggleRow checked={overlayFlood} icon={Droplets} label="Tumpuk genangan" onChange={setOverlayFlood} />
          )}
        </div>
      </Card>

      {(mode === "flood" || overlayFlood) && (
        <Card defaultOpen={false} icon={SlidersHorizontal} id="ambang" title="Ambang deteksi">
          <div className="space-y-3">
            <Slider
              format={(v) => `${fmt(v, 1)} dB`}
              label="Penurunan sinyal minimum"
              max={8}
              min={1}
              step={0.5}
              value={draft.drop}
              onChange={(drop) => setDraft((d) => ({ ...d, drop }))}
            />
            <Slider
              format={(v) => `${fmt(v, 1)} dB`}
              label="Ambang air"
              max={-10}
              min={-22}
              step={0.5}
              value={draft.water}
              onChange={(water) => setDraft((d) => ({ ...d, water }))}
            />
            <Slider
              format={(v) => `${v} m`}
              label="Elevasi maksimum"
              max={1000}
              min={20}
              step={10}
              value={draft.maxElev}
              onChange={(maxElev) => setDraft((d) => ({ ...d, maxElev }))}
            />
            <ToggleRow
              checked={draft.increase}
              label="Backscatter naik"
              onChange={(increase) => setDraft((d) => ({ ...d, increase }))}
            />
            <ToggleRow
              checked={draft.permanent}
              label="Perairan permanen"
              onChange={(permanent) => setDraft((d) => ({ ...d, permanent }))}
            />
          </div>
        </Card>
      )}

      <Card icon={MapPin} id="tampilan" title="Tampilan">
        <ToggleRow checked={showPois} icon={MapPin} label="Titik kabupaten terdampak" onChange={setShowPois} />
        <ToggleRow checked={showKabupaten} icon={SquareDashed} label="Batas kabupaten" onChange={setShowKabupaten} />
        <div className="mt-2">
          <Segmented
            options={[
              { key: "dark" as Basemap, label: "Peta gelap" },
              { key: "imagery" as Basemap, label: "Citra satelit" },
            ]}
            size="sm"
            value={basemap}
            onChange={setBasemap}
          />
        </div>
      </Card>
    </>
  );

  return (
    <DashboardLayout
      backHref="/katalog/banjir-aceh-2025"
      icon={Waves}
      left={left}
      leftRail={[
        { icon: BarChart3, label: "Ringkasan", target: "ringkasan" },
        { icon: Waves, label: "Per kabupaten", target: "kabupaten" },
        { icon: Users, label: "Penduduk", target: "penduduk" },
        { icon: Sprout, label: "Lahan", target: "lahan" },
        { icon: Calculator, label: "Hitung", target: "hitung" },
      ]}
      map={
        <>
          <FloodMap
            background={background}
            basemap={basemap}
            compare={compareLayer}
            focus={focus}
            kabupaten={showKabupaten ? kabupatenGeo : { type: "FeatureCollection", features: [] }}
            opacity={opacity}
            overlay={overlay}
            pois={pois}
            provinces={provinces}
            selectedKabupaten={selected}
            showPois={showPois}
            onSelectPoi={selectKabupaten}
            onViewChange={(bounds, zoom) => setMapView({ bounds, zoom })}
          />
          {comparing && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
              <div className="flex items-center overflow-hidden rounded-full bg-[#141d2a]/95 text-xs font-semibold shadow-xl">
                <span className="px-3.5 py-2">◀ Musim kering</span>
                <span className="h-4 w-px bg-[#2a374b]" />
                <span className="px-3.5 py-2 text-[#7fb2ff]">Saat banjir ▶</span>
              </div>
            </div>
          )}
          {!stats && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-[#141d2a]/95 px-3 py-1.5 text-xs text-[#9aa7b9]">
              <Loader2 className="animate-spin" size={13} /> Memuat data
            </div>
          )}
        </>
      }
      right={right}
      rightRail={[
        { icon: Layers, label: "Lapisan", target: "lapisan" },
        { icon: Eye, label: "Legenda", target: "legenda" },
        { icon: MapPin, label: "Tampilan", target: "tampilan" },
      ]}
      subtitle="Aceh · Sumatera Utara · Sumatera Barat"
      title="Banjir Sumatra 2025"
    />
  );
}
