import type { FeatureCollection, Point } from "geojson";

import { FirmsResponse, HotspotRow } from "./firms.types";

export type ConfidenceFilter = "all" | "nominal" | "high";
export type DayNightFilter = "all" | "day" | "night";

export interface HotspotFilter {
  confidence: ConfidenceFilter;
  dayNight: DayNightFilter;
  province: number | null;
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Waktu akuisisi (ms epoch) dari baris hotspot */
export const acquiredAt = (row: HotspotRow, dates: string[]) => {
  const hhmm = String(row[5]).padStart(4, "0");

  return Date.parse(`${dates[row[4]]}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`);
};

/** Tanggal WIB (YYYY-MM-DD) dari baris hotspot */
export const wibDate = (row: HotspotRow, dates: string[]) =>
  new Date(acquiredAt(row, dates) + WIB_OFFSET_MS).toISOString().slice(0, 10);

export function filterRows(data: FirmsResponse, filter: HotspotFilter) {
  const minConfidence =
    filter.confidence === "high" ? 2 : filter.confidence === "nominal" ? 1 : 0;

  return data.rows.filter(
    (row) =>
      row[3] >= minConfidence &&
      (filter.dayNight === "all" ||
        (filter.dayNight === "night" ? row[7] === 1 : row[7] === 0)) &&
      (filter.province === null || row[8] === filter.province),
  );
}

export function summarize(rows: HotspotRow[], data: FirmsResponse) {
  const byProvince = new Map<number, { count: number; frp: number }>();
  const byDay = new Map<string, { day: number; night: number }>();
  let frp = 0;
  let high = 0;

  for (const row of rows) {
    frp += row[2];
    if (row[3] === 2) high++;

    const p = byProvince.get(row[8]) ?? { count: 0, frp: 0 };

    p.count++;
    p.frp += row[2];
    byProvince.set(row[8], p);

    const date = wibDate(row, data.dates);
    const d = byDay.get(date) ?? { day: 0, night: 0 };

    if (row[7] === 1) d.night++;
    else d.day++;
    byDay.set(date, d);
  }

  const provinces = Array.from(byProvince.entries())
    .map(([id, v]) => ({ id, name: data.provinces[id], ...v }))
    .sort((a, b) => b.count - a.count);

  const days = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      siang: v.day,
      malam: v.night,
    }));

  return { total: rows.length, high, frp, provinces, days };
}

export function toGeoJson(
  rows: HotspotRow[],
): FeatureCollection<Point, { frp: number; c: number; i: number }> {
  return {
    type: "FeatureCollection",
    features: rows.map((row, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [row[0], row[1]] },
      properties: { frp: row[2], c: row[3], i },
    })),
  };
}
