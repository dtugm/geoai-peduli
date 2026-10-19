import { SmokeGrid, SmokeVariable } from "./smoke.types";

/** Nilai grid pada (lon, lat) dengan interpolasi bilinear; null di luar grid */
export function sampleGrid(values: number[], g: SmokeGrid, lon: number, lat: number) {
  const x = (lon - g.lon0) / g.step;
  const y = (lat - g.lat0) / g.step;

  if (x < 0 || y < 0 || x > g.nx - 1 || y > g.ny - 1) return null;

  const i = Math.min(Math.floor(x), g.nx - 2);
  const j = Math.min(Math.floor(y), g.ny - 2);
  const fx = x - i;
  const fy = y - j;
  const at = (ii: number, jj: number) => values[jj * g.nx + ii];

  return (
    at(i, j) * (1 - fx) * (1 - fy) +
    at(i + 1, j) * fx * (1 - fy) +
    at(i, j + 1) * (1 - fx) * fy +
    at(i + 1, j + 1) * fx * fy
  );
}

/** Batas grid sebagai [barat, selatan, timur, utara] */
export const gridBounds = (g: SmokeGrid): [number, number, number, number] => [
  g.lon0,
  g.lat0,
  g.lon0 + (g.nx - 1) * g.step,
  g.lat0 + (g.ny - 1) * g.step,
];

type Stop = [number, [number, number, number, number]];

interface SmokeStyle {
  label: string;
  unit: string;
  /** Nilai mentah dari API dibagi `scale` untuk ditampilkan */
  scale: number;
  stops: Stop[];
  legend: number[];
}

// Rentang warna: transparan saat udara bersih, makin pekat & gelap saat asap tebal
export const smokeStyles: Record<SmokeVariable, SmokeStyle> = {
  pm2_5: {
    label: "PM2.5",
    unit: "µg/m³",
    scale: 1,
    stops: [
      [10, [254, 249, 195, 0]],
      [25, [253, 224, 71, 0.5]],
      [55, [249, 115, 22, 0.68]],
      [150, [220, 38, 38, 0.78]],
      [250, [147, 51, 234, 0.85]],
      [500, [59, 7, 100, 0.9]],
    ],
    legend: [25, 55, 150, 250, 500],
  },
  aerosol_optical_depth: {
    label: "AOD",
    unit: "",
    scale: 100,
    stops: [
      [20, [254, 249, 195, 0]],
      [50, [253, 224, 71, 0.5]],
      [100, [249, 115, 22, 0.68]],
      [200, [220, 38, 38, 0.78]],
      [350, [147, 51, 234, 0.85]],
      [600, [59, 7, 100, 0.9]],
    ],
    legend: [50, 100, 200, 350, 600],
  },
  carbon_monoxide: {
    label: "CO",
    unit: "µg/m³",
    scale: 1,
    stops: [
      [180, [254, 249, 195, 0]],
      [300, [253, 224, 71, 0.5]],
      [600, [249, 115, 22, 0.68]],
      [1200, [220, 38, 38, 0.78]],
      [2500, [147, 51, 234, 0.85]],
      [5000, [59, 7, 100, 0.9]],
    ],
    legend: [300, 600, 1200, 2500, 5000],
  },
};

const colorAt = (stops: Stop[], v: number): [number, number, number, number] => {
  if (v <= stops[0][0]) return [0, 0, 0, 0];
  for (let k = 1; k < stops.length; k++) {
    const [v1, c1] = stops[k];

    if (v <= v1) {
      const [v0, c0] = stops[k - 1];
      const f = (v - v0) / (v1 - v0);

      return c0.map((c, n) => c + (c1[n] - c) * f) as [number, number, number, number];
    }
  }

  return stops[stops.length - 1][1];
};

export const legendGradient = (variable: SmokeVariable) => {
  const { stops } = smokeStyles[variable];

  return `linear-gradient(90deg, ${stops
    .map(([, c], i) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(c[3], 0.15)}) ${(i / (stops.length - 1)) * 100}%`)
    .join(", ")})`;
};

/** Lebar zona pudar di tepi grid (derajat) */
const FEATHER_DEG = 3;

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/**
 * Gambar satu frame sebagai PNG (data URL). Baris piksel dibagi rata dalam
 * ruang Mercator supaya pas saat ditempel sebagai image source MapLibre.
 */
export function renderSmokeFrame(
  values: number[],
  g: SmokeGrid,
  variable: SmokeVariable,
  palette?: [number, [number, number, number, number]][],
) {
  const [w, s, e, n] = gridBounds(g);
  const width = g.nx * 16;
  const ySpan = mercY(n) - mercY(s);
  const height = Math.round((width * ySpan) / (((e - w) * Math.PI) / 180));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(width, height);
  const stops = palette ?? smokeStyles[variable].stops;

  for (let py = 0; py < height; py++) {
    const my = mercY(n) - (py / (height - 1)) * ySpan;
    const lat = ((2 * Math.atan(Math.exp(my)) - Math.PI / 2) * 180) / Math.PI;

    for (let px = 0; px < width; px++) {
      const lon = w + (px / (width - 1)) * (e - w);
      const v = sampleGrid(values, g, lon, lat) ?? 0;
      const [r, gg, b, alpha] = colorAt(stops, v);
      // Pudarkan 3° terakhir sebelum tepi grid supaya batas data tidak terpotong tajam
      const edge = Math.min(lon - w, e - lon, lat - s, n - lat);
      const a = alpha * Math.min(Math.max(edge / FEATHER_DEG, 0), 1);
      const o = (py * width + px) * 4;

      img.data[o] = r;
      img.data[o + 1] = gg;
      img.data[o + 2] = b;
      img.data[o + 3] = a * 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  return canvas.toDataURL("image/png");
}

// Palet "paparan asap": warna asap sungguhan — tipis = abu-abu keputihan,
// pekat = abu-abu kecokelatan yang makin gelap & makin tidak tembus pandang
export const exposureStops: [number, [number, number, number, number]][] = [
  [25, [238, 236, 232, 0]],
  [40, [232, 228, 221, 0.32]],
  [55.4, [222, 216, 206, 0.52]],
  [100, [203, 193, 179, 0.7]],
  [200, [176, 162, 143, 0.82]],
  [400, [138, 122, 102, 0.92]],
];

export const exposureGradient = `linear-gradient(90deg, ${exposureStops
  .map(([, c], i) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(c[3], 0.15)}) ${(i / (exposureStops.length - 1)) * 100}%`)
  .join(", ")})`;
