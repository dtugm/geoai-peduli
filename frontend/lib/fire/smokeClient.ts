// Riwayat & prakiraan asap (CAMS via Open-Meteo) diambil langsung dari browser:
// 7 hari ke belakang + 3 hari ke depan, per jam. Open-Meteo mengizinkan CORS dan
// kuota gratisnya dihitung per alamat IP, jadi beban terbagi ke tiap pengunjung.

import { SmokeGrid, SmokeResponse } from "./smoke.types";

const AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WIND_URL = "https://api.open-meteo.com/v1/forecast";

// Seluruh Asia Tenggara: 90–147,5°BT, 15°LS–27,5°LU (Myanmar s.d. Papua & Australia utara).
// Kuota gratis Open-Meteo dihitung per titik (± 600 titik/menit per IP), jadi grid
// dibuat kasar: 2,5° untuk asap (432 titik) + 5° untuk angin (130 titik) = 562 titik.
export const AQ_GRID: SmokeGrid = { lon0: 90, lat0: -15, step: 2.5, nx: 24, ny: 18 };
export const WIND_GRID: SmokeGrid = { lon0: 90, lat0: -15, step: 5, nx: 13, ny: 10 };
const BATCH = 400;
export const PAST_DAYS = 7;
const CACHE_NAME = "geoai-asap";
const CACHE_KEY = "/asap-cams-asean.json";
const CACHE_TTL_MS = 3 * 3_600_000;
export const FORECAST_DAYS = 3;

type Point = { hourly: Record<string, (number | null)[]> & { time: string[] } };

const gridPoints = (g: SmokeGrid) => {
  const pts: [number, number][] = [];

  for (let j = 0; j < g.ny; j++) {
    for (let i = 0; i < g.nx; i++) pts.push([g.lat0 + j * g.step, g.lon0 + i * g.step]);
  }

  return pts;
};

async function fetchGrid(base: string, grid: SmokeGrid, query: string, signal?: AbortSignal) {
  const pts = gridPoints(grid);
  const batches: [number, number][][] = [];

  for (let i = 0; i < pts.length; i += BATCH) batches.push(pts.slice(i, i + BATCH));

  const results = await Promise.all(
    batches.map(async (batch) => {
      const url =
        `${base}?latitude=${batch.map((p) => p[0]).join(",")}` +
        `&longitude=${batch.map((p) => p[1]).join(",")}` +
        `&${query}&past_days=${PAST_DAYS}&forecast_days=${FORECAST_DAYS}&timezone=GMT`;
      const res = await fetch(url, { signal });

      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      const json = await res.json();

      return (Array.isArray(json) ? json : [json]) as Point[];
    }),
  );

  return results.flat();
}

let cached: Promise<SmokeResponse> | null = null;

/** Baca/simpan hasil di Cache Storage browser agar kunjungan ulang tidak memakan kuota */
async function readCache(): Promise<SmokeResponse | null> {
  try {
    const res = await (await caches.open(CACHE_NAME)).match(CACHE_KEY);

    if (!res) return null;
    const data = (await res.json()) as SmokeResponse;

    return Date.now() - Date.parse(data.generatedAt) < CACHE_TTL_MS ? data : null;
  } catch {
    return null;
  }
}

async function writeCache(data: SmokeResponse) {
  try {
    await (await caches.open(CACHE_NAME)).put(CACHE_KEY, new Response(JSON.stringify(data)));
  } catch {
    // Cache Storage tidak tersedia (mis. mode privat) — cukup di memori
  }
}

/** PM2.5 CAMS + angin 925 hPa per jam (di-cache 3 jam di browser) */
export function fetchSmokeHistory(): Promise<SmokeResponse> {
  cached ??= (async () => {
    const hit = await readCache();

    if (hit) return hit;
    const data = await fetchFresh().catch(async (e) => {
      // Kuota Open-Meteo habis / jaringan gagal → pakai cadangan server (24 jam + prakiraan)
      const res = await fetch("/api/smoke");

      if (!res.ok) throw e;

      return (await res.json()) as SmokeResponse;
    });

    await writeCache(data);

    return data;
  })().catch((e) => {
    cached = null;
    throw e;
  });

  return cached;
}

async function fetchFresh(): Promise<SmokeResponse> {
  const [aq, wind] = await Promise.all([
    fetchGrid(AQ_URL, AQ_GRID, "hourly=pm2_5&domains=cams_global"),
    fetchGrid(WIND_URL, WIND_GRID, "hourly=wind_speed_925hPa,wind_direction_925hPa&wind_speed_unit=ms"),
  ]);

  const times = aq[0].hourly.time.map((t) => `${t}Z`);
  const windIndex = new Map(wind[0].hourly.time.map((t, i) => [`${t}Z`, i]));
  const u: number[][] = [];
  const v: number[][] = [];

  // Arah angin meteorologis = arah datangnya angin → komponen u (timur) & v (utara)
  times.forEach((time) => {
    const t = windIndex.get(time) ?? 0;
    const uu: number[] = [];
    const vv: number[] = [];

    wind.forEach((p) => {
      const s = p.hourly.wind_speed_925hPa[t] ?? 0;
      const d = ((p.hourly.wind_direction_925hPa[t] ?? 0) * Math.PI) / 180;

      uu.push(-s * Math.sin(d));
      vv.push(-s * Math.cos(d));
    });
    u.push(uu);
    v.push(vv);
  });

  return {
    generatedAt: new Date().toISOString(),
    times,
    grid: AQ_GRID,
    values: {
      pm2_5: times.map((_, t) => aq.map((p) => p.hourly.pm2_5[t] ?? 0)),
      aerosol_optical_depth: [],
      carbon_monoxide: [],
    },
    wind: { grid: WIND_GRID, u, v },
  };
}
