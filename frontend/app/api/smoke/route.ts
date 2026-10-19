import { NextResponse } from "next/server";

import { SmokeGrid, SmokeResponse, SmokeVariable } from "@/lib/fire/smoke.types";

// Model asap CAMS global (0,4°) dan angin 925 hPa dari Open-Meteo (gratis untuk
// non-komersial, tanpa kunci). Diambil sebagai grid lalu di-cache 6 jam — CAMS
// sendiri hanya diperbarui dua kali sehari, dan kuota Open-Meteo dihitung per titik.

const AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const WIND_URL = "https://api.open-meteo.com/v1/forecast";

// Grid sama dengan klien (lib/fire/smokeClient) — seluruh Asia Tenggara
const AQ_GRID: SmokeGrid = { lon0: 90, lat0: -15, step: 2.5, nx: 24, ny: 18 };
const WIND_GRID: SmokeGrid = { lon0: 90, lat0: -15, step: 5, nx: 13, ny: 10 };

const VARIABLES: SmokeVariable[] = ["pm2_5", "aerosol_optical_depth", "carbon_monoxide"];
const BATCH = 400;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cache: { at: number; data: SmokeResponse } | null = null;
let inflight: Promise<SmokeResponse> | null = null;

const gridPoints = (g: SmokeGrid) => {
  const pts: [number, number][] = [];

  for (let j = 0; j < g.ny; j++) {
    for (let i = 0; i < g.nx; i++) pts.push([g.lat0 + j * g.step, g.lon0 + i * g.step]);
  }

  return pts;
};

type OpenMeteoPoint = { hourly: Record<string, (number | null)[]> & { time: string[] } };

async function fetchGrid(base: string, grid: SmokeGrid, query: string) {
  const pts = gridPoints(grid);
  const batches: [number, number][][] = [];

  for (let i = 0; i < pts.length; i += BATCH) batches.push(pts.slice(i, i + BATCH));

  const results = await Promise.all(
    batches.map(async (batch) => {
      const url =
        `${base}?latitude=${batch.map((p) => p[0]).join(",")}` +
        `&longitude=${batch.map((p) => p[1]).join(",")}` +
        `&${query}&past_days=1&forecast_days=3&timezone=GMT`;
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(90_000) });

      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      const json = await res.json();

      return (Array.isArray(json) ? json : [json]) as OpenMeteoPoint[];
    }),
  );

  return results.flat();
}

/** Susun [waktu][titik] dari jawaban per titik */
const byTime = (points: OpenMeteoPoint[], key: string, scale = 1) =>
  points[0].hourly.time.map((_, t) =>
    points.map((p) => {
      const v = p.hourly[key][t];

      return v === null || v === undefined ? 0 : Math.round(v * scale);
    }),
  );

async function loadSmoke(): Promise<SmokeResponse> {
  const [aq, wind] = await Promise.all([
    fetchGrid(AQ_URL, AQ_GRID, `hourly=${VARIABLES.join(",")}&domains=cams_global`),
    fetchGrid(
      WIND_URL,
      WIND_GRID,
      "hourly=wind_speed_925hPa,wind_direction_925hPa&wind_speed_unit=ms",
    ),
  ]);

  const times = aq[0].hourly.time.map((t) => `${t}Z`);
  const windIndex = new Map(wind[0].hourly.time.map((t, i) => [`${t}Z`, i]));

  // Arah angin meteorologis = arah datangnya angin → ubah ke komponen u (timur) & v (utara)
  const u: number[][] = [];
  const v: number[][] = [];

  times.forEach((time) => {
    const t = windIndex.get(time) ?? 0;

    u.push(
      wind.map((p) => {
        const s = p.hourly.wind_speed_925hPa[t] ?? 0;
        const d = ((p.hourly.wind_direction_925hPa[t] ?? 0) * Math.PI) / 180;

        return Math.round(-s * Math.sin(d) * 10) / 10;
      }),
    );
    v.push(
      wind.map((p) => {
        const s = p.hourly.wind_speed_925hPa[t] ?? 0;
        const d = ((p.hourly.wind_direction_925hPa[t] ?? 0) * Math.PI) / 180;

        return Math.round(-s * Math.cos(d) * 10) / 10;
      }),
    );
  });

  return {
    generatedAt: new Date().toISOString(),
    times,
    grid: AQ_GRID,
    values: {
      pm2_5: byTime(aq, "pm2_5"),
      aerosol_optical_depth: byTime(aq, "aerosol_optical_depth", 100),
      carbon_monoxide: byTime(aq, "carbon_monoxide"),
    },
    wind: { grid: WIND_GRID, u, v },
  };
}

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
      inflight ??= loadSmoke().finally(() => (inflight = null));
      cache = { at: Date.now(), data: await inflight };
    }

    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=10800, stale-while-revalidate=21600" },
    });
  } catch (error) {
    if (cache) return NextResponse.json(cache.data);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat model asap" },
      { status: 502 },
    );
  }
}
