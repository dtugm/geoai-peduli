// Statistik banjir yang dihitung offline dengan logika deteksi yang sama seperti
// di peta (parameter bawaan) — public/data/banjir-sumatra-2025.json

export interface KabupatenStat {
  name: string;
  province: string;
  floodHa: number;
  increaseHa: number;
  /** Estimasi penduduk di piksel genangan (WorldPop 2020) */
  pop: number;
  popIncrease: number;
  popTotal: number;
  affected: boolean;
  /** Titik berat piksel genangan [lon, lat] */
  center: [number, number] | null;
  bbox: [number, number, number, number];
  /** Luas genangan (ha) per kelas ESA WorldCover */
  landcover: Record<string, number>;
}

export interface ProvinceStat {
  name: string;
  floodHa: number;
  increaseHa: number;
  pop: number;
  popTotal: number;
  kabupaten: number;
  affected: number;
}

export interface FloodStats {
  generatedAt: string;
  zoom: number;
  pixelMeters: number;
  params: { drop: number; water: number; maxElev: number };
  periods: { dry: [string, string]; flood: [string, string] };
  affectedThresholdHa: number;
  totals: {
    floodHa: number;
    increaseHa: number;
    pop: number;
    popIncrease: number;
    kabupaten: number;
    affected: number;
  };
  provinces: ProvinceStat[];
  landcover: Record<string, number>;
  kabupaten: KabupatenStat[];
}

export const PROVINCES = ["Aceh", "Sumatera Utara", "Sumatera Barat"] as const;

export const provinceColor: Record<string, string> = {
  Aceh: "#38bdf8",
  "Sumatera Utara": "#a78bfa",
  "Sumatera Barat": "#34d399",
};

export const landcoverColor: Record<string, string> = {
  "Pertanian/sawah": "#facc15",
  Permukiman: "#f87171",
  Hutan: "#16a34a",
  Semak: "#84cc16",
  Rumput: "#a3e635",
  "Lahan terbuka": "#d6d3d1",
  "Lahan basah": "#2dd4bf",
  Mangrove: "#0f766e",
  "Badan air": "#3b82f6",
  Lumut: "#a8a29e",
};
