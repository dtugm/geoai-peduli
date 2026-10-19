// Paparan asap per wilayah dari model PM2.5 CAMS (lihat smokeClient.ts).
// "Ambang asap" = 55,4 µg/m³, batas atas kategori "sedang" ISPU — di atasnya
// udara tergolong tidak sehat. Sebuah kabupaten/kota dianggap terpapar bila
// sebagian besar titik sampel di wilayahnya melewati ambang.

import type { SmokeGrid, SmokeResponse } from "./smoke.types";

export const SMOKE_THRESHOLD = 55.4;

export interface WilayahData {
  kabupaten: { n: string; p: string; c: [number, number]; s: [number, number][] }[];
  regions: { name: string; color: string; s: [number, number][] }[];
}

export type ExposureLevel = "sedang" | "pekat" | "sangat";

export const exposureLevels: { key: ExposureLevel; label: string; range: string; min: number; color: string }[] = [
  { key: "sedang", label: "Sedang", range: "50–70%", min: 0.5, color: "#e2e8f0" },
  { key: "pekat", label: "Pekat", range: "70–90%", min: 0.7, color: "#fde68a" },
  { key: "sangat", label: "Sangat pekat", range: ">90%", min: 0.9, color: "#fbbf24" },
];

export const levelOf = (coverage: number): ExposureLevel | null =>
  coverage >= 0.9 ? "sangat" : coverage >= 0.7 ? "pekat" : coverage >= 0.5 ? "sedang" : null;

/** Bobot bilinear tiap titik sampel terhadap grid (dihitung sekali) */
type Weights = { idx: Int32Array; w: Float32Array };

function weightsFor(points: [number, number][], g: SmokeGrid): Weights {
  const idx = new Int32Array(points.length * 4);
  const w = new Float32Array(points.length * 4);

  points.forEach(([lon, lat], k) => {
    const x = Math.min(Math.max((lon - g.lon0) / g.step, 0), g.nx - 1.0001);
    const y = Math.min(Math.max((lat - g.lat0) / g.step, 0), g.ny - 1.0001);
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    const o = k * 4;

    idx[o] = j * g.nx + i;
    idx[o + 1] = j * g.nx + i + 1;
    idx[o + 2] = (j + 1) * g.nx + i;
    idx[o + 3] = (j + 1) * g.nx + i + 1;
    w[o] = (1 - fx) * (1 - fy);
    w[o + 1] = fx * (1 - fy);
    w[o + 2] = (1 - fx) * fy;
    w[o + 3] = fx * fy;
  });

  return { idx, w };
}

const sampleAll = (values: number[], wt: Weights, out: Float32Array) => {
  for (let k = 0; k < out.length; k++) {
    const o = k * 4;

    out[k] =
      values[wt.idx[o]] * wt.w[o] +
      values[wt.idx[o + 1]] * wt.w[o + 1] +
      values[wt.idx[o + 2]] * wt.w[o + 2] +
      values[wt.idx[o + 3]] * wt.w[o + 3];
  }
};

export interface ExposureModel {
  /** [waktu][kabupaten] → fraksi titik sampel di atas ambang (0..1) */
  coverage: Float32Array[];
  /** [waktu][kabupaten] → rata-rata PM2.5 dibagi ambang */
  ratio: Float32Array[];
  /** [kawasan][waktu] → % luas tertutup asap pekat */
  regions: { name: string; color: string; series: number[] }[];
}

/** Hitung paparan semua kabupaten & kawasan untuk setiap jam data */
export function computeExposure(data: SmokeResponse, wilayah: WilayahData): ExposureModel {
  const pm = data.values.pm2_5;
  const allPts: [number, number][] = [];
  const kabStart: number[] = [];

  wilayah.kabupaten.forEach((k) => {
    kabStart.push(allPts.length);
    allPts.push(...k.s);
  });
  kabStart.push(allPts.length);

  const kabW = weightsFor(allPts, data.grid);
  const regW = wilayah.regions.map((r) => weightsFor(r.s, data.grid));
  const buf = new Float32Array(allPts.length);
  const coverage: Float32Array[] = [];
  const ratio: Float32Array[] = [];
  const regions = wilayah.regions.map((r) => ({ name: r.name, color: r.color, series: [] as number[] }));

  pm.forEach((values) => {
    sampleAll(values, kabW, buf);
    const cov = new Float32Array(wilayah.kabupaten.length);
    const rat = new Float32Array(wilayah.kabupaten.length);

    for (let k = 0; k < wilayah.kabupaten.length; k++) {
      let over = 0;
      let sum = 0;

      for (let s = kabStart[k]; s < kabStart[k + 1]; s++) {
        sum += buf[s];
        if (buf[s] > SMOKE_THRESHOLD) over++;
      }
      const n = kabStart[k + 1] - kabStart[k];

      cov[k] = over / n;
      rat[k] = sum / n / SMOKE_THRESHOLD;
    }
    coverage.push(cov);
    ratio.push(rat);

    regW.forEach((wt, r) => {
      const out = new Float32Array(wilayah.regions[r].s.length);
      let over = 0;

      sampleAll(values, wt, out);
      out.forEach((v) => v > SMOKE_THRESHOLD && over++);
      regions[r].series.push((over / out.length) * 100);
    });
  });

  return { coverage, ratio, regions };
}

const WIB_MS = 7 * 3_600_000;

export const wibDay = (iso: string) => new Date(Date.parse(iso) + WIB_MS).toISOString().slice(0, 10);

/** Ringkasan harian (WIB): rata-rata % asap pekat per kawasan & jumlah kab/kota terpapar */
export function dailySummary(times: string[], model: ExposureModel) {
  const days = Array.from(new Set(times.map(wibDay)));

  return days.map((day) => {
    const hours = times.map((t, i) => (wibDay(t) === day ? i : -1)).filter((i) => i >= 0);
    const affected = new Set<number>();

    hours.forEach((h) => model.coverage[h].forEach((c, k) => c >= 0.5 && affected.add(k)));

    return {
      day,
      label: new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      kabupaten: affected.size,
      ...Object.fromEntries(
        model.regions.map((r) => [r.name, hours.reduce((s, h) => s + r.series[h], 0) / hours.length]),
      ),
    };
  });
}
