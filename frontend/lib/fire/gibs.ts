// Layer citra & atmosfer dari NASA GIBS (WMTS, terbuka, mendukung CORS).
// Daftar layer: https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml

export type GibsTime = "daily" | "10min";

export interface GibsLayer {
  key: string;
  label: string;
  description: string;
  layer: string;
  tileMatrixSet: string;
  maxZoom: number;
  format: "jpg" | "png";
  time: GibsTime;
  legend?: string;
  defaultOpacity: number;
  /**
   * Isi celah sampai penuh: satelit lain di hari yang sama (`alternates`),
   * lalu `days` hari sebelumnya, lalu interpolasi spasial (lib/fire/gibsFill)
   */
  fill?: { alternates: string[]; days: number };
}

export const gibsLayers: GibsLayer[] = [
  {
    key: "truecolor",
    label: "Citra true color VIIRS",
    description:
      "Citra harian NOAA-20. Asap tampak sebagai kabut abu-abu kecokelatan di atas titik api.",
    layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxZoom: 9,
    format: "jpg",
    time: "daily",
    defaultOpacity: 100,
  },
  {
    key: "himawari",
    label: "Himawari-9 (cahaya tampak)",
    description:
      "Diperbarui tiap 10 menit — lihat pergerakan plume asap sepanjang hari (06.00–18.00 WIB).",
    layer: "Himawari_AHI_Band3_Red_Visible_1km",
    tileMatrixSet: "GoogleMapsCompatible_Level7",
    maxZoom: 7,
    format: "png",
    time: "10min",
    defaultOpacity: 85,
  },
  {
    key: "himawari-ir",
    label: "Himawari-9 (inframerah)",
    description:
      "Kanal inframerah 10,4 µm tiap 10 menit, tetap bisa dipakai malam hari untuk melihat awan.",
    layer: "Himawari_AHI_Band13_Clean_Infrared",
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxZoom: 6,
    format: "png",
    time: "10min",
    legend: "Clean_Longwave_Infrared_Window_Band_H.svg",
    defaultOpacity: 70,
  },
  {
    key: "aod",
    label: "Aerosol Optical Depth (VIIRS)",
    description:
      "Ketebalan aerosol di atas darat & laut dari tiga satelit VIIRS. Nilai > 1 umumnya menandakan asap pekat. Celah diisi otomatis.",
    layer: "VIIRS_NOAA20_AOD_Deep_Blue_Land_Ocean",
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxZoom: 6,
    format: "png",
    time: "daily",
    legend: "MODIS_VIIRS_AOD_H.svg",
    defaultOpacity: 80,
    fill: {
      alternates: ["VIIRS_SNPP_AOD_Deep_Blue_Land_Ocean", "VIIRS_NOAA21_AOD_Deep_Blue_Land_Ocean"],
      days: 3,
    },
  },
  {
    key: "uvai",
    label: "UV Aerosol Index (OMPS)",
    description:
      "Indeks aerosol penyerap UV. Nilai positif tinggi menandakan asap kebakaran atau debu. Celah diisi otomatis.",
    layer: "OMPS_Aerosol_Index",
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxZoom: 6,
    format: "png",
    time: "daily",
    legend: "OMPS_Aerosol_Index_H.svg",
    defaultOpacity: 70,
    fill: { alternates: [], days: 3 },
  },
  {
    key: "co",
    label: "Karbon monoksida (AIRS)",
    description:
      "CO pada 500 hPa (AIRS siang & malam) — gas penanda pembakaran biomassa yang terangkut jauh. Celah diisi otomatis.",
    layer: "AIRS_L2_Carbon_Monoxide_500hPa_Volume_Mixing_Ratio_Day",
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxZoom: 6,
    format: "png",
    time: "daily",
    legend: "AIRS_Carbon_Monoxide_Volume_Mixing_Ratio_H.svg",
    defaultOpacity: 70,
    fill: { alternates: ["AIRS_L2_Carbon_Monoxide_500hPa_Volume_Mixing_Ratio_Night"], days: 3 },
  },
];

const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

export const gibsTileUrl = (layer: GibsLayer, time: string) =>
  `${GIBS_BASE}/${layer.layer}/default/${time}/${layer.tileMatrixSet}/{z}/{y}/{x}.${layer.format}`;

/**
 * GIBS kadang membalas 200 dengan tile milik layer lain untuk tanggal yang
 * datanya kosong (tanpa header `Layer-Identifier-Actual`). Tile yang sah selalu
 * membawa header itu dan waktu aktual yang sama dengan waktu yang diminta.
 */
export const isValidGibsTile = (res: Response, url: string) => {
  const requested = decodeURIComponent(url).match(/\/default\/([^/]+)\//)?.[1] ?? "";
  const actual = res.headers.get("layer-time-actual") ?? "";
  // Harian dibandingkan per tanggal, Himawari per menit
  const precision = requested.length > 10 ? 16 : 10;

  return (
    res.ok &&
    !!res.headers.get("layer-identifier-actual") &&
    actual.slice(0, precision) === requested.slice(0, precision)
  );
};

export const gibsLegendUrl = (legend: string) =>
  `https://gibs.earthdata.nasa.gov/legends/${legend}`;

/** Tanggal UTC (YYYY-MM-DD) `daysAgo` hari sebelum sekarang */
export const utcDate = (daysAgo = 0) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

/** Waktu ISO dibulatkan ke bawah per 10 menit, `stepsAgo` langkah sebelum `from` */
export const tenMinuteTime = (from: number, stepsAgo = 0) => {
  const step = 10 * 60 * 1000;
  const t = Math.floor(from / step) * step - stepsAgo * step;

  return new Date(t).toISOString().slice(0, 17) + "00Z";
};

/**
 * Cari waktu Himawari terbaru yang sudah tersedia di GIBS
 * (GIBS biasanya tertinggal ± 30–60 menit dari waktu nyata).
 */
export async function latestHimawariTime(): Promise<string> {
  const layer = gibsLayers.find((l) => l.key === "himawari")!;
  const now = Date.now();

  for (let step = 2; step < 30; step++) {
    const time = tenMinuteTime(now, step);
    const url = gibsTileUrl(layer, time)
      .replace("{z}", "4")
      .replace("{y}", "8")
      .replace("{x}", "12");

    try {
      const res = await fetch(url, { method: "HEAD" });

      if (isValidGibsTile(res, url)) return time;
    } catch {
      // coba langkah sebelumnya
    }
  }

  return tenMinuteTime(now, 6);
}

/** Format waktu ISO UTC ke WIB, mis. "16 Okt, 21.30 WIB" */
export const formatWib = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

// ANIMASI ---------------------------------------------------------------

export interface TimelinePreset {
  key: string;
  label: string;
  /** Jumlah frame */
  count: number;
  /** Jarak antar-frame: hari (layer harian) atau menit (Himawari) */
  step: number;
}

export const dailyPresets: TimelinePreset[] = [
  { key: "7d", label: "7 hari · harian", count: 7, step: 1 },
  { key: "30d", label: "30 hari · harian", count: 30, step: 1 },
  { key: "26w", label: "6 bulan · mingguan", count: 26, step: 7 },
];

export const himawariPresets: TimelinePreset[] = [
  { key: "3h", label: "3 jam · 10 menit", count: 18, step: 10 },
  { key: "12h", label: "12 jam · 30 menit", count: 24, step: 30 },
  { key: "24h", label: "24 jam · 1 jam", count: 24, step: 60 },
  { key: "72h", label: "3 hari · 3 jam", count: 24, step: 180 },
];

/** Tanggal (YYYY-MM-DD) bergeser `days` hari dari `date` */
export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** Daftar tanggal frame (naik) yang berakhir di `end` */
export const dailyFrames = (end: string, preset: TimelinePreset) =>
  Array.from({ length: preset.count }, (_, i) =>
    shiftDate(end, -(preset.count - 1 - i) * preset.step),
  );

/** Daftar waktu frame Himawari (naik) yang berakhir di `latest` */
export const himawariFrames = (latest: string, preset: TimelinePreset) =>
  Array.from({ length: preset.count }, (_, i) => {
    const time = tenMinuteTime(
      Date.parse(latest),
      ((preset.count - 1 - i) * preset.step) / 10,
    );

    // GIBS tidak punya citra Himawari pukul 02.40 & 14.40 UTC (jadwal perawatan)
    return /T(02|14):40/.test(time) ? tenMinuteTime(Date.parse(time), 1) : time;
  });

/** Label frame singkat untuk timeline */
export const frameLabel = (time: string, daily: boolean) =>
  daily
    ? new Date(`${time}T00:00:00Z`).toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : formatWib(time);
