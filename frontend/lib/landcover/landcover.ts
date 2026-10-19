// Data & konfigurasi dashboard tutupan lahan Sumatra (Aceh, Sumut, Sumbar)

import sumutConstant from "@/components/UGM/sumut/constant/sumut.constant";
import { LandCoverClass } from "@/constant/landcover.constant";

export const PMTILES_BASE = "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com";

export const LC_PROVINCES = ["Aceh", "Sumatera Utara", "Sumatera Barat"] as const;
export type LcProvince = (typeof LC_PROVINCES)[number];

export const EPOCHS = [2021, 2022, 2023, 2024, 2025] as const;
export type Epoch = (typeof EPOCHS)[number];

/** Epoch yang tersedia per provinsi (file PMTiles hasil klasifikasi GeoAI) */
export const availability: Record<LcProvince, Epoch[]> = {
  Aceh: [2025],
  "Sumatera Utara": [2021, 2022, 2023, 2024, 2025],
  "Sumatera Barat": [2025],
};

const fileKey: Record<LcProvince, string> = {
  Aceh: "aceh",
  "Sumatera Utara": "sumut",
  "Sumatera Barat": "sumbar",
};

export const pmtilesUrl = (p: LcProvince, epoch: Epoch) => `${PMTILES_BASE}/${fileKey[p]}_${epoch}.pmtiles`;

/** Mosaik Sentinel-2 cloudless tahunan (EOX); 2025 memakai mosaik 2024 */
export const s2CloudlessTiles = (epoch: Epoch) =>
  `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${Math.min(epoch, 2024)}_3857/default/g/{z}/{y}/{x}.jpg`;

export const LC_BOUNDS: [number, number, number, number] = [94.9, -3.6, 102.0, 6.2];

// KELAS ------------------------------------------------------------------

export interface LcClass {
  id: number;
  /** Nama kelas di data statistik */
  key: string;
  label: string;
  color: string;
}

const displayName: Record<string, string> = {
  Emplacement: "Lahan terbangun",
  "Vegetasi Tinggi": "Hutan / vegetasi tinggi",
};

export const lcClasses: LcClass[] = Object.values(LandCoverClass).map((c) => ({
  id: c.id,
  key: c.label,
  label: displayName[c.label] ?? c.label,
  color: c.color,
}));

export const classByKey = Object.fromEntries(lcClasses.map((c) => [c.key, c])) as Record<string, LcClass>;

// STATISTIK -----------------------------------------------------------------

type Row = { kelas: string; luas_ha: number };

const toEpochMap = (list: { nama_shp: string; data: Row[] }[]) =>
  Object.fromEntries(list.map((e) => [Number(e.nama_shp.replace(".shp", "")), e.data])) as Partial<
    Record<Epoch, Row[]>
  >;

export const lcStats: Record<LcProvince, Partial<Record<Epoch, Row[]>>> = {
  Aceh: toEpochMap(sumutConstant.data_luasan_aceh),
  "Sumatera Utara": toEpochMap(sumutConstant.data_luasan_sumut),
  "Sumatera Barat": toEpochMap(sumutConstant.data_luasan_sumbar),
};

/**
 * Luas per kelas (ha) untuk sekumpulan provinsi pada satu epoch. Provinsi yang
 * tidak punya epoch tersebut dilewati. Badan air tidak dihitung karena pada
 * beberapa provinsi ikut mencakup laut.
 */
export function areaByClass(provinces: readonly LcProvince[], epoch: Epoch) {
  const out: Record<string, number> = {};

  provinces.forEach((p) =>
    (lcStats[p][epoch] ?? []).forEach((r) => {
      if (r.kelas === "Badan Air") return;
      out[r.kelas] = (out[r.kelas] ?? 0) + r.luas_ha;
    }),
  );

  return out;
}
