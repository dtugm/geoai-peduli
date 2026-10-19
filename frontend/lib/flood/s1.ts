// Deteksi genangan banjir dari Sentinel-1 — seluruhnya di browser.
//
// Data: Sentinel-1 RTC (radiometrically terrain corrected) di Microsoft Planetary
// Computer, disajikan sebagai mosaik tile oleh TiTiler. Mosaik "musim kering"
// memakai median backscatter, mosaik "banjir" memakai nilai terendah (air tenang
// memantulkan radar menjauhi sensor sehingga tampak gelap). Perubahan dihitung
// per piksel di klien, dimasker dengan DEM Copernicus & JRC Global Surface Water.

const PC = "https://planetarycomputer.microsoft.com/api/data/v1";

/** Aceh, Sumatera Utara, dan Sumatera Barat (termasuk Simeulue, Nias, Mentawai) */
export const AOI_BBOX: [number, number, number, number] = [94.9, -3.6, 102.0, 6.2];

/** Mosaik Planetary Computer tidak dirender di bawah zoom ini */
export const S1_MIN_ZOOM = 8;
export const S1_MAX_ZOOM = 13;

export interface Period {
  key: string;
  label: string;
  start: string;
  end: string;
}

export const dryPeriods: Period[] = [
  { key: "jul-aug", label: "Musim kering · Jul–Agu 2025", start: "2025-07-01", end: "2025-08-31" },
  { key: "jun-sep", label: "Musim kering · Jun–Sep 2025", start: "2025-06-01", end: "2025-09-30" },
];

export const floodPeriods: Period[] = [
  { key: "peak", label: "Puncak banjir · 26–29 Nov 2025", start: "2025-11-26", end: "2025-11-29" },
  { key: "event", label: "Banjir · 26 Nov–6 Des 2025", start: "2025-11-26", end: "2025-12-06" },
  { key: "after", label: "Pascabanjir · 7–20 Des 2025", start: "2025-12-07", end: "2025-12-20" },
];

// PENDAFTARAN MOSAIK ------------------------------------------------------

const registry = new Map<string, Promise<string>>();

async function register(body: object): Promise<string> {
  const key = JSON.stringify(body);
  const stored = (() => {
    try {
      return sessionStorage.getItem(`pc-mosaic:${key}`);
    } catch {
      return null;
    }
  })();

  if (stored) return stored;

  if (!registry.has(key)) {
    registry.set(
      key,
      fetch(`${PC}/mosaic/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, "filter-lang": "cql2-json" }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`Planetary Computer ${r.status}`);

          return r.json();
        })
        .then((j: { searchid: string }) => {
          try {
            sessionStorage.setItem(`pc-mosaic:${key}`, j.searchid);
          } catch {
            // penyimpanan sesi tidak tersedia — cukup di memori
          }

          return j.searchid;
        }),
    );
  }

  return registry.get(key)!;
}

export const registerS1 = (p: Period) =>
  register({
    collections: ["sentinel-1-rtc"],
    bbox: AOI_BBOX,
    datetime: `${p.start}T00:00:00Z/${p.end}T23:59:59Z`,
  });

/** Mosaik Sentinel-2 L2A, citra paling bebas awan diutamakan */
export const registerS2 = (p: Period, maxCloud: number) =>
  register({
    collections: ["sentinel-2-l2a"],
    bbox: AOI_BBOX,
    datetime: `${p.start}T00:00:00Z/${p.end}T23:59:59Z`,
    filter: { op: "<=", args: [{ property: "eo:cloud_cover" }, maxCloud] },
    sortby: [{ field: "eo:cloud_cover", direction: "asc" }],
  });

export type S2Style = "true" | "swir";

/** Tile Sentinel-2: warna asli, atau warna semu SWIR-NIR-merah (air tampak biru gelap) */
export const s2Tiles = (searchId: string, style: S2Style) =>
  `${PC}/mosaic/tiles/${searchId}/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&` +
  (style === "true"
    ? "assets=visual&asset_bidx=visual|1,2,3&nodata=0&pixel_selection=median"
    : "assets=B12&assets=B08&assets=B04&rescale=0,4500&nodata=0&pixel_selection=median&color_formula=Gamma RGB 1.3");

export const registerDem = () => register({ collections: ["cop-dem-glo-30"], bbox: AOI_BBOX });
export const registerGsw = () => register({ collections: ["jrc-gsw"], bbox: AOI_BBOX });

export interface Mosaics {
  dry: string;
  wet: string;
  dem: string;
  gsw: string;
}

// URL TILE -------------------------------------------------------------

// Backscatter VV dalam dB, dipetakan linier -25..0 dB → 0..255
const DB_MIN = -25;
const DB_MAX = 0;

const s1Query = (selection: "median" | "lowest") =>
  `collection=sentinel-1-rtc&expression=10*log10(vv)&asset_as_band=true&rescale=${DB_MIN},${DB_MAX}&pixel_selection=${selection}`;

export const sourceTileUrl = (
  kind: keyof Mosaics,
  m: Mosaics,
  z: number,
  x: number,
  y: number,
) => {
  const query = {
    dry: s1Query("median"),
    wet: s1Query("lowest"),
    // Skala akar: v = 1 + 8·√elevasi (laut = 0) — halus di pesisir, tetap menjangkau ±1.000 m
    dem: "collection=cop-dem-glo-30&expression=where(data>0,sqrt(data)*8%2B1,0)&asset_as_band=true&rescale=0,255",
    gsw: "collection=jrc-gsw&assets=occurrence&rescale=0,100",
  }[kind];

  return `${PC}/mosaic/tiles/${m[kind]}/WebMercatorQuad/${z}/${x}/${y}@1x?${query}`;
};

/** Tile backscatter langsung dari Planetary Computer (tanpa olahan klien) */
export const backscatterTiles = (m: Mosaics, kind: "dry" | "wet") =>
  `${PC}/mosaic/tiles/${m[kind]}/WebMercatorQuad/{z}/{x}/{y}@1x?${s1Query(kind === "dry" ? "median" : "lowest")}`;

// PENGOLAHAN DI KLIEN ---------------------------------------------------

export interface FloodParams {
  /** Penurunan backscatter minimum (dB) dari musim kering ke banjir */
  drop: number;
  /** Ambang air: backscatter saat banjir di bawah nilai ini (dB) */
  water: number;
  /** Elevasi maksimum (m) — banjir genangan terjadi di dataran rendah */
  maxElev: number;
  /** Tampilkan juga kenaikan backscatter (kemungkinan air di bawah vegetasi/permukiman) */
  increase: boolean;
  /** Tampilkan perairan permanen (sungai, danau, laut) */
  permanent: boolean;
}

export const defaultParams: FloodParams = {
  drop: 3,
  water: -15,
  maxElev: 200,
  increase: false,
  permanent: true,
};

export type FloodClass = "flood" | "increase" | "permanent" | "none" | "nodata";

/** Klasifikasi satu piksel dari nilai mentah 0..255 */
export function classify(
  dryV: number,
  wetV: number,
  demV: number,
  demValid: boolean,
  gswV: number,
  p: FloodParams,
): FloodClass {
  if (!demValid || demV <= 0) return "nodata"; // laut / di luar DEM
  const dry = toDb(dryV);
  const wet = toDb(wetV);

  if (gswV > 127) return "permanent"; // tergenang > 50% waktu sejak 1984
  if (demElevation(demV) >= p.maxElev) return "none";
  if (wet < p.water && dry - wet >= p.drop && dry > p.water) return "flood";
  if (p.increase && wet - dry >= p.drop + 1) return "increase";

  return "none";
}

/** Elevasi (m) dari nilai piksel DEM berskala akar */
export const demElevation = (v: number) => ((v - 1) / 8) ** 2;

export const toDb = (v: number) => DB_MIN + (v / 255) * (DB_MAX - DB_MIN);

export const classColor: Record<FloodClass, [number, number, number, number]> = {
  flood: [0, 200, 255, 230],
  increase: [236, 72, 153, 200],
  permanent: [30, 58, 138, 170],
  none: [0, 0, 0, 0],
  nodata: [0, 0, 0, 0],
};

// CACHE & DECODE TILE ----------------------------------------------------

type Pixels = Uint8ClampedArray | null;

const tileCache = new Map<string, Promise<Pixels>>();
const CACHE_LIMIT = 600;

/** Ambil tile PNG grayscale dan kembalikan RGBA mentahnya (null = tanpa data) */
export function loadPixels(url: string, signal?: AbortSignal): Promise<Pixels> {
  let p = tileCache.get(url);

  if (!p) {
    p = (async () => {
      const res = await fetch(url, { signal });

      if (res.status === 204 || res.status === 404) return null;
      if (!res.ok) throw new Error(`Tile ${res.status}`);
      const bitmap = await createImageBitmap(await res.blob());
      const canvas = new OffscreenCanvas(256, 256);
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      ctx.drawImage(bitmap, 0, 0, 256, 256);

      return ctx.getImageData(0, 0, 256, 256).data;
    })();
    // Jangan simpan permintaan yang gagal/dibatalkan
    p.catch(() => tileCache.delete(url));
    tileCache.set(url, p);
    if (tileCache.size > CACHE_LIMIT) tileCache.delete(tileCache.keys().next().value!);
  }

  return p;
}

export async function loadAll(m: Mosaics, z: number, x: number, y: number, signal?: AbortSignal) {
  const [dry, wet, dem, gsw] = await Promise.all(
    (["dry", "wet", "dem", "gsw"] as const).map((k) =>
      loadPixels(sourceTileUrl(k, m, z, x, y), signal),
    ),
  );

  return { dry, wet, dem, gsw };
}

export type RenderMode = "flood" | "rgb";

/** Render satu tile olahan (klasifikasi genangan atau komposit RGB) sebagai PNG */
export async function renderTile(
  m: Mosaics,
  z: number,
  x: number,
  y: number,
  mode: RenderMode,
  p: FloodParams,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const { dry, wet, dem, gsw } = await loadAll(m, z, x, y, signal);
  const out = new ImageData(256, 256);

  if (dry && wet) {
    for (let i = 0; i < 256 * 256; i++) {
      const o = i * 4;
      const valid = dry[o + 3] > 0 && wet[o + 3] > 0;

      if (!valid) continue;

      if (mode === "rgb") {
        // R = musim kering, G = B = saat banjir → area yang menggelap tampak merah
        out.data[o] = dry[o];
        out.data[o + 1] = wet[o];
        out.data[o + 2] = wet[o];
        out.data[o + 3] = 255;
        continue;
      }

      const cls = classify(
        dry[o],
        wet[o],
        dem ? dem[o] : 0,
        !!dem && dem[o + 3] > 0,
        gsw ? gsw[o] : 0,
        p,
      );

      if (cls === "permanent" && !p.permanent) continue;
      const c = classColor[cls];

      out.data[o] = c[0];
      out.data[o + 1] = c[1];
      out.data[o + 2] = c[2];
      out.data[o + 3] = c[3];
    }
  }

  const canvas = new OffscreenCanvas(256, 256);

  canvas.getContext("2d")!.putImageData(out, 0, 0);

  return (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer();
}

// ANALISIS ---------------------------------------------------------------

const EARTH = 40_075_016.686;

export const lonLatToTile = (lon: number, lat: number, z: number) => {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n;

  return { x, y };
};

const tileToLat = (y: number, z: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

/** Nilai di satu titik (zoom 12 ≈ 30 m per piksel) */
export async function probePoint(m: Mosaics, lon: number, lat: number, p: FloodParams) {
  const z = 12;
  const t = lonLatToTile(lon, lat, z);
  const x = Math.floor(t.x);
  const y = Math.floor(t.y);
  const px = Math.min(255, Math.floor((t.x - x) * 256));
  const py = Math.min(255, Math.floor((t.y - y) * 256));
  const { dry, wet, dem, gsw } = await loadAll(m, z, x, y);
  const o = (py * 256 + px) * 4;

  if (!dry || !wet || dry[o + 3] === 0 || wet[o + 3] === 0) return null;

  return {
    dry: toDb(dry[o]),
    wet: toDb(wet[o]),
    elevation: dem && dem[o + 3] > 0 && dem[o] > 0 ? Math.round(demElevation(dem[o]) * 10) / 10 : null,
    occurrence: gsw ? Math.round((gsw[o] / 255) * 100) : null,
    cls: classify(dry[o], wet[o], dem ? dem[o] : 0, !!dem && dem[o + 3] > 0, gsw ? gsw[o] : 0, p),
  };
}

/**
 * Luas genangan (ha) di kotak [barat, selatan, timur, utara] pada zoom `z`.
 * Menghitung piksel kelas "flood" pada tile yang sama dengan yang ditampilkan.
 */
export async function floodArea(
  m: Mosaics,
  bounds: [number, number, number, number],
  z: number,
  p: FloodParams,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
) {
  const [w, s, e, n] = bounds;
  const a = lonLatToTile(w, n, z);
  const b = lonLatToTile(e, s, z);
  const tiles: [number, number][] = [];

  for (let y = Math.floor(a.y); y <= Math.floor(b.y); y++) {
    for (let x = Math.floor(a.x); x <= Math.floor(b.x); x++) tiles.push([x, y]);
  }

  let done = 0;
  let flood = 0;
  let increase = 0;

  // Kerjakan beberapa tile sekaligus supaya tidak membanjiri server
  const queue = [...tiles];
  const worker = async () => {
    while (queue.length) {
      if (signal?.aborted) return;
      const [x, y] = queue.shift()!;
      const { dry, wet, dem, gsw } = await loadAll(m, z, x, y, signal).catch(() => ({
        dry: null,
        wet: null,
        dem: null,
        gsw: null,
      }));

      if (dry && wet) {
        for (let row = 0; row < 256; row++) {
          // Luas piksel bergantung lintang (proyeksi Mercator)
          const lat = tileToLat(y + (row + 0.5) / 256, z);
          const lon0 = ((x + 0) / 2 ** z) * 360 - 180;
          const size = (EARTH * Math.cos((lat * Math.PI) / 180)) / (256 * 2 ** z);
          const pixelHa = (size * size) / 10_000;

          for (let col = 0; col < 256; col++) {
            const lon = lon0 + ((col + 0.5) / (256 * 2 ** z)) * 360;

            if (lon < w || lon > e || lat < s || lat > n) continue;
            const o = (row * 256 + col) * 4;

            if (dry[o + 3] === 0 || wet[o + 3] === 0) continue;
            const cls = classify(
              dry[o],
              wet[o],
              dem ? dem[o] : 0,
              !!dem && dem[o + 3] > 0,
              gsw ? gsw[o] : 0,
              { ...p, increase: true },
            );

            if (cls === "flood") flood += pixelHa;
            else if (cls === "increase") increase += pixelHa;
          }
        }
      }
      onProgress?.(++done, tiles.length);
    }
  };

  await Promise.all(Array.from({ length: 6 }, worker));

  return { flood, increase, tiles: tiles.length };
}

/** Jumlah tile yang akan dihitung untuk kotak & zoom tertentu */
export const tileCount = (bounds: [number, number, number, number], z: number) => {
  const a = lonLatToTile(bounds[0], bounds[3], z);
  const b = lonLatToTile(bounds[2], bounds[1], z);

  return (Math.floor(b.x) - Math.floor(a.x) + 1) * (Math.floor(b.y) - Math.floor(a.y) + 1);
};

/** URL tile olahan klien untuk mode genangan / komposit RGB */
export const processedTiles = (mode: RenderMode, m: Mosaics, p: FloodParams) => {
  const q = new URLSearchParams({
    ...m,
    drop: String(p.drop),
    water: String(p.water),
    maxElev: String(p.maxElev),
    inc: p.increase ? "1" : "0",
    perm: p.permanent ? "1" : "0",
  });

  return `s1flood://${mode}/{z}/{x}/{y}?${q}`;
};
