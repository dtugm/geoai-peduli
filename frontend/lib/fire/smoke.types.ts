// Model sebaran asap: CAMS (Copernicus) via Open-Meteo, plus angin 925 hPa.

export type SmokeVariable = "pm2_5" | "aerosol_optical_depth" | "carbon_monoxide";

export interface SmokeGrid {
  lon0: number;
  lat0: number;
  /** Jarak antar-titik grid (derajat) */
  step: number;
  nx: number;
  ny: number;
}

export interface SmokeResponse {
  generatedAt: string;
  /** Waktu tiap jam (ISO UTC, "2026-10-17T05:00Z") terurut naik */
  times: string[];
  grid: SmokeGrid;
  /**
   * Nilai per waktu, baris per lintang (dari selatan) lalu bujur (dari barat).
   * pm2_5 & carbon_monoxide dalam µg/m³, aerosol_optical_depth × 100.
   */
  values: Record<SmokeVariable, number[][]>;
  wind: { grid: SmokeGrid; u: number[][]; v: number[][] };
}

/** Kategori PM2.5 mengikuti ambang ISPU (µg/m³) */
export const pm25Categories = [
  { max: 15.5, label: "Baik", color: "#22c55e" },
  { max: 55.4, label: "Sedang", color: "#3b82f6" },
  { max: 150.4, label: "Tidak sehat", color: "#eab308" },
  { max: 250.4, label: "Sangat tidak sehat", color: "#ef4444" },
  { max: Infinity, label: "Berbahaya", color: "#1f1f1f" },
];

export const pm25Category = (v: number) => pm25Categories.find((c) => v <= c.max)!;

export interface SmokeLayer {
  key: string;
  variable: SmokeVariable;
  label: string;
  description: string;
}

export const smokeLayers: SmokeLayer[] = [
  {
    key: "smoke:pm2_5",
    variable: "pm2_5",
    label: "Paparan asap",
    description:
      "Sebaran asap (PM2.5) per jam dari model CAMS Copernicus, dengan arah angin — 7 hari terakhir dan prakiraan 3 hari.",
  },
];

export const smokePresets = [
  { key: "today", label: "Hari ini · per jam", count: 0, step: 60 },
  { key: "7d", label: "7 hari · per 3 jam", count: 0, step: 180 },
  { key: "fc", label: "Prakiraan 3 hari · per 3 jam", count: 0, step: 180 },
];

const WIB_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Frame model asap (subset `times`) untuk preset tertentu */
export function smokeFrames(times: string[], presetKey: string, now = Date.now()) {
  const today = new Date(now + WIB_MS).toISOString().slice(0, 10);
  // Langkah dihitung dari jam UTC supaya frame selalu jatuh di jam yang sama setiap hari
  const every = (t: string, hours: number) => new Date(t).getUTCHours() % hours === 0;

  if (presetKey === "today") {
    return times.filter((t) => new Date(Date.parse(t) + WIB_MS).toISOString().slice(0, 10) === today);
  }
  if (presetKey === "7d") {
    return times.filter((t) => Date.parse(t) >= now - 7 * DAY_MS && Date.parse(t) <= now && every(t, 3));
  }
  if (presetKey === "14d") {
    return times.filter((t) => Date.parse(t) <= now && every(t, 6));
  }

  return times.filter((t) => Date.parse(t) >= now - 3_600_000 && every(t, 3));
}

/** Indeks frame yang paling dekat (≤) dengan waktu sekarang */
export const nowFrameIndex = (frames: string[], now = Date.now()) => {
  let idx = 0;

  frames.forEach((t, i) => {
    if (Date.parse(t) <= now) idx = i;
  });

  return idx;
};

export const isForecast = (time: string, now = Date.now()) => Date.parse(time) > now;

/** Arah angin (dari mana bertiup → ke mana) dalam kata */
export const windToward = (u: number, v: number) => {
  const deg = ((Math.atan2(u, v) * 180) / Math.PI + 360) % 360;
  const names = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];

  return names[Math.round(deg / 45) % 8];
};
