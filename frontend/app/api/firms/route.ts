import type { Feature, MultiPolygon, Polygon } from "geojson";

import { NextRequest, NextResponse } from "next/server";

import provinces from "@/public/data/indonesia-provinsi.json";
import {
  FIRMS_RANGES,
  FirmsRange,
  FirmsResponse,
  HotspotRow,
} from "@/lib/fire/firms.types";

// Hotspot NASA FIRMS (VIIRS 375 m) dari file CSV publik regional Asia Tenggara.
// File ini tidak butuh MAP_KEY tetapi tidak mengirim header CORS, sehingga
// diambil di sisi server, difilter ke wilayah Indonesia, lalu dikirim ringkas.

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/data/active_fire";

const SATELLITES = [
  { id: "N", label: "Suomi NPP", path: "suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2" },
  { id: "N20", label: "NOAA-20", path: "noaa-20-viirs-c2/csv/J1_VIIRS_C2" },
  { id: "N21", label: "NOAA-21", path: "noaa-21-viirs-c2/csv/J2_VIIRS_C2" },
];

// Kotak pembatas kasar Indonesia untuk memangkas data sebelum uji poligon
const IDN_BBOX = [94.7, -11.2, 141.2, 6.2];

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<FirmsRange, { at: number; data: FirmsResponse }>();
const inflight = new Map<FirmsRange, Promise<FirmsResponse>>();

type ProvinceFeature = Feature<Polygon | MultiPolygon, { nama: string; id: number }>;

// Ray casting sederhana — jauh lebih cepat daripada turf untuk ratusan ribu titik
const inRing = (lon: number, lat: number, ring: number[][]) => {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

const inPolygon = (lon: number, lat: number, rings: number[][][]) =>
  inRing(lon, lat, rings[0]) &&
  !rings.slice(1).some((hole) => inRing(lon, lat, hole));

const provinceIndex = (provinces.features as ProvinceFeature[]).map((feature) => {
  const geom = feature.geometry;
  const polygons = (
    geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates
  ) as number[][][][];

  return {
    id: feature.properties.id,
    polygons: polygons.map((rings) => {
      const xs = rings[0].map((c) => c[0]);
      const ys = rings[0].map((c) => c[1]);

      return {
        rings,
        bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      };
    }),
  };
});

// Hotspot sangat mengelompok, jadi hasil pencarian provinsi di-memo per sel 0,01°
const provinceMemo = new Map<number, number>();

const findProvince = (lon: number, lat: number) => {
  const key = Math.round(lon * 100) * 100000 + Math.round(lat * 100);
  const memo = provinceMemo.get(key);

  if (memo !== undefined) return memo;

  let found = -1;

  for (const { id, polygons } of provinceIndex) {
    if (
      polygons.some(
        ({ rings, bbox }) =>
          lon >= bbox[0] &&
          lon <= bbox[2] &&
          lat >= bbox[1] &&
          lat <= bbox[3] &&
          inPolygon(lon, lat, rings),
      )
    ) {
      found = id;
      break;
    }
  }

  provinceMemo.set(key, found);

  return found;
};

const confidenceCode = (value: string) => {
  const v = value.trim().toLowerCase();

  if (v.startsWith("h")) return 2;
  if (v.startsWith("n")) return 1;

  return 0;
};

async function fetchSatellite(path: string, range: FirmsRange) {
  const res = await fetch(`${FIRMS_BASE}/${path}_SouthEast_Asia_${range}.csv`, {
    cache: "no-store",
    signal: AbortSignal.timeout(150_000),
  });

  if (!res.ok) throw new Error(`FIRMS ${res.status}`);

  return res.text();
}

const SAT_IDS = SATELLITES.map((sat) => sat.id);

function parseCsv(text: string, rows: HotspotRow[], dates: string[]) {
  const lines = text.split("\n");
  const header = lines[0].split(",");
  const col = (name: string) => header.indexOf(name);
  const iLat = col("latitude");
  const iLon = col("longitude");
  const iFrp = col("frp");
  const iConf = col("confidence");
  const iDate = col("acq_date");
  const iTime = col("acq_time");
  const iSat = col("satellite");
  const iDn = col("daynight");

  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");

    if (c.length < header.length) continue;

    const lat = +c[iLat];
    const lon = +c[iLon];

    if (lon < IDN_BBOX[0] || lon > IDN_BBOX[2] || lat < IDN_BBOX[1] || lat > IDN_BBOX[3]) {
      continue;
    }

    const province = findProvince(lon, lat);

    if (province < 0) continue;

    let day = dates.indexOf(c[iDate]);

    if (day < 0) day = dates.push(c[iDate]) - 1;

    rows.push([
      Math.round(lon * 1e4) / 1e4,
      Math.round(lat * 1e4) / 1e4,
      Math.round(+c[iFrp] * 10) / 10,
      confidenceCode(c[iConf]),
      day,
      +c[iTime],
      SAT_IDS.indexOf(c[iSat]),
      c[iDn].trim() === "N" ? 1 : 0,
      province,
    ]);
  }
}

async function loadHotspots(range: FirmsRange): Promise<FirmsResponse> {
  const results = await Promise.allSettled(
    SATELLITES.map((sat) => fetchSatellite(sat.path, range)),
  );

  const rows: HotspotRow[] = [];
  const dates: string[] = [];

  results.forEach((result) => {
    if (result.status === "fulfilled") parseCsv(result.value, rows, dates);
  });

  // Urutkan indeks tanggal secara kronologis
  const sorted = [...dates].sort();
  const remap = dates.map((d) => sorted.indexOf(d));

  rows.forEach((row) => (row[4] = remap[row[4]]));

  if (results.every((r) => r.status === "rejected")) {
    throw new Error("Semua sumber FIRMS gagal diakses");
  }

  return {
    range,
    fetchedAt: new Date().toISOString(),
    satellites: SATELLITES.map((sat, i) => ({
      id: sat.id,
      label: sat.label,
      ok: results[i].status === "fulfilled",
    })),
    provinces: (provinces.features as ProvinceFeature[]).map((f) => f.properties.nama),
    dates: sorted,
    rows,
  };
}

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("range") ?? "24h";
  const range = (FIRMS_RANGES as readonly string[]).includes(param)
    ? (param as FirmsRange)
    : "24h";

  const cached = cache.get(range);

  try {
    let data = cached?.data;

    if (!cached || Date.now() - cached.at > CACHE_TTL_MS) {
      // Gabungkan permintaan bersamaan supaya FIRMS hanya diunduh sekali
      let pending = inflight.get(range);

      if (!pending) {
        pending = loadHotspots(range).finally(() => inflight.delete(range));
        inflight.set(range, pending);
      }

      data = await pending;
      cache.set(range, { at: Date.now(), data });
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    // Kalau FIRMS sedang tidak bisa diakses, kirim data terakhir yang ada
    if (cached) return NextResponse.json(cached.data);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat FIRMS" },
      { status: 502 },
    );
  }
}
