export const FIRMS_RANGES = ["24h", "48h", "7d"] as const;

export type FirmsRange = (typeof FIRMS_RANGES)[number];

/** 0 = rendah, 1 = nominal, 2 = tinggi */
export type Confidence = 0 | 1 | 2;

/**
 * Satu hotspot dalam bentuk ringkas:
 * [lon, lat, frp (MW), confidence, indeks tanggal (ke `dates`), jam HHMM UTC,
 *  indeks satelit (ke `satellites`), malam (1) / siang (0), indeks provinsi]
 */
export type HotspotRow = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface FirmsResponse {
  range: FirmsRange;
  fetchedAt: string;
  satellites: { id: string; label: string; ok: boolean }[];
  provinces: string[];
  /** Tanggal akuisisi (YYYY-MM-DD, UTC) terurut naik */
  dates: string[];
  rows: HotspotRow[];
}

export const confidenceLabel = ["Rendah", "Nominal", "Tinggi"] as const;
