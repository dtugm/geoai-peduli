// Pengisian celah lapisan satelit harian (AOD, indeks aerosol, CO) supaya penuh:
//  1. gabungkan beberapa satelit pada hari yang sama (mis. VIIRS SNPP/NOAA-20/NOAA-21),
//  2. lalu hari-hari sebelumnya,
//  3. sisa celah diisi interpolasi spasial (push-pull) yang dihitung pada SATU mosaik
//     Asia Tenggara di zoom 3, sehingga tidak ada sambungan antar-tile.

import { GibsLayer, isValidGibsTile, shiftDate } from "./gibs";

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const SIZE = 256;

// Mosaik dasar interpolasi: tile zoom 3 x=5..7, y=3..4 (45–180°BT, 41°LU–41°LS)
const BASE_Z = 3;
const BASE_X0 = 5;
const BASE_Y0 = 3;
const BASE_NX = 3;
const BASE_NY = 2;

type Pixels = Uint8ClampedArray;

const tileCache = new Map<string, Promise<Pixels | null>>();

function loadTile(layerId: string, tms: string, date: string, z: number, x: number, y: number) {
  const url = `${GIBS}/${layerId}/default/${date}/${tms}/${z}/${y}/${x}.png`;
  let p = tileCache.get(url);

  if (!p) {
    p = (async () => {
      const res = await fetch(url);

      if (!isValidGibsTile(res, url)) return null;
      const bitmap = await createImageBitmap(await res.blob());
      const canvas = new OffscreenCanvas(SIZE, SIZE);
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      ctx.drawImage(bitmap, 0, 0, SIZE, SIZE);

      return ctx.getImageData(0, 0, SIZE, SIZE).data;
    })().catch(() => null);
    tileCache.set(url, p);
    if (tileCache.size > 800) tileCache.delete(tileCache.keys().next().value!);
  }

  return p;
}

/** Gabungkan sumber × hari: piksel pertama yang terisi (urutan = prioritas) */
async function composite(layer: GibsLayer, date: string, z: number, x: number, y: number) {
  const out = new Uint8ClampedArray(SIZE * SIZE * 4);
  const sources = [layer.layer, ...(layer.fill?.alternates ?? [])];
  let filled = 0;

  for (let d = 0; d < (layer.fill?.days ?? 1) && filled < SIZE * SIZE; d++) {
    const day = shiftDate(date, -d);
    const tiles = await Promise.all(sources.map((s) => loadTile(s, layer.tileMatrixSet, day, z, x, y)));

    for (const t of tiles) {
      if (!t) continue;
      for (let i = 0; i < SIZE * SIZE; i++) {
        const o = i * 4;

        if (out[o + 3] === 0 && t[o + 3] > 0) {
          out[o] = t[o];
          out[o + 1] = t[o + 1];
          out[o + 2] = t[o + 2];
          out[o + 3] = t[o + 3];
          filled++;
        }
      }
    }
  }

  return { pixels: out, filled };
}

/** Interpolasi push-pull: rata-rata piramida piksel terisi, lalu turun dengan bilinear */
function pushPull(src: Pixels, w: number, h: number): Float32Array {
  type Level = { w: number; h: number; c: Float32Array; a: Float32Array };
  const base: Level = { w, h, c: new Float32Array(w * h * 3), a: new Float32Array(w * h) };

  for (let i = 0; i < w * h; i++) {
    if (src[i * 4 + 3] > 0) {
      base.a[i] = 1;
      base.c[i * 3] = src[i * 4];
      base.c[i * 3 + 1] = src[i * 4 + 1];
      base.c[i * 3 + 2] = src[i * 4 + 2];
    }
  }
  const levels: Level[] = [base];

  while (levels[levels.length - 1].w > 1) {
    const p = levels[levels.length - 1];
    const nw = Math.max(1, p.w >> 1);
    const nh = Math.max(1, p.h >> 1);
    const n: Level = { w: nw, h: nh, c: new Float32Array(nw * nh * 3), a: new Float32Array(nw * nh) };

    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const i = y * p.w + x;
        const j = Math.min(y >> 1, nh - 1) * nw + Math.min(x >> 1, nw - 1);
        const a = p.a[i];

        n.a[j] += a;
        n.c[j * 3] += p.c[i * 3] * (levels.length === 1 ? a : 1);
        n.c[j * 3 + 1] += p.c[i * 3 + 1] * (levels.length === 1 ? a : 1);
        n.c[j * 3 + 2] += p.c[i * 3 + 2] * (levels.length === 1 ? a : 1);
      }
    }
    levels.push(n);
  }

  // Normalisasi: warna rata-rata tiap sel piramida
  const norm = levels.map((l, k) => {
    const c = new Float32Array(l.w * l.h * 3);

    for (let i = 0; i < l.w * l.h; i++) {
      const wsum = k === 0 ? (l.a[i] ? 1 : 0) : l.a[i];

      if (wsum > 0) {
        c[i * 3] = l.c[i * 3] / (k === 0 ? 1 : wsum);
        c[i * 3 + 1] = l.c[i * 3 + 1] / (k === 0 ? 1 : wsum);
        c[i * 3 + 2] = l.c[i * 3 + 2] / (k === 0 ? 1 : wsum);
      }
    }

    return { w: l.w, h: l.h, c, has: l.a };
  });

  // Turun: sel kosong diisi bilinear dari level yang lebih kasar (sudah terisi)
  let fill = norm[norm.length - 1].c;
  let fw = norm[norm.length - 1].w;
  let fh = norm[norm.length - 1].h;

  for (let k = norm.length - 2; k >= 0; k--) {
    const l = norm[k];
    const next = new Float32Array(l.w * l.h * 3);

    for (let y = 0; y < l.h; y++) {
      for (let x = 0; x < l.w; x++) {
        const i = y * l.w + x;

        if (l.has[i] > 0) {
          next[i * 3] = l.c[i * 3];
          next[i * 3 + 1] = l.c[i * 3 + 1];
          next[i * 3 + 2] = l.c[i * 3 + 2];
          continue;
        }
        const fx = Math.min(Math.max((x + 0.5) / 2 - 0.5, 0), fw - 1);
        const fy = Math.min(Math.max((y + 0.5) / 2 - 0.5, 0), fh - 1);
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(x0 + 1, fw - 1);
        const y1 = Math.min(y0 + 1, fh - 1);
        const tx = fx - x0;
        const ty = fy - y0;

        for (let ch = 0; ch < 3; ch++) {
          next[i * 3 + ch] =
            fill[(y0 * fw + x0) * 3 + ch] * (1 - tx) * (1 - ty) +
            fill[(y0 * fw + x1) * 3 + ch] * tx * (1 - ty) +
            fill[(y1 * fw + x0) * 3 + ch] * (1 - tx) * ty +
            fill[(y1 * fw + x1) * 3 + ch] * tx * ty;
        }
      }
    }
    fill = next;
    fw = l.w;
    fh = l.h;
  }

  return fill;
}

const baseCache = new Map<string, Promise<Float32Array>>();

/** Mosaik zoom 3 yang sudah terisi penuh untuk satu layer & tanggal */
function filledBase(layer: GibsLayer, date: string) {
  const key = `${layer.key}|${date}`;
  let p = baseCache.get(key);

  if (!p) {
    p = (async () => {
      const W = SIZE * BASE_NX;
      const H = SIZE * BASE_NY;
      const mosaic = new Uint8ClampedArray(W * H * 4);
      const parts = await Promise.all(
        Array.from({ length: BASE_NX * BASE_NY }, (_, k) =>
          composite(layer, date, BASE_Z, BASE_X0 + (k % BASE_NX), BASE_Y0 + Math.floor(k / BASE_NX)),
        ),
      );

      parts.forEach(({ pixels }, k) => {
        const ox = (k % BASE_NX) * SIZE;
        const oy = Math.floor(k / BASE_NX) * SIZE;

        for (let y = 0; y < SIZE; y++) {
          mosaic.set(pixels.subarray(y * SIZE * 4, (y + 1) * SIZE * 4), ((oy + y) * W + ox) * 4);
        }
      });

      return pushPull(mosaic, W, H);
    })();
    baseCache.set(key, p);
    if (baseCache.size > 40) baseCache.delete(baseCache.keys().next().value!);
  }

  return p;
}

/** Tile penuh (tanpa celah) sebagai PNG */
export async function renderFilledTile(layer: GibsLayer, date: string, z: number, x: number, y: number) {
  const { pixels, filled } = await composite(layer, date, z, x, y);

  if (filled < SIZE * SIZE) {
    const base = await filledBase(layer, date);
    const W = SIZE * BASE_NX;
    const H = SIZE * BASE_NY;
    const scale = 2 ** (z - BASE_Z);

    for (let j = 0; j < SIZE; j++) {
      for (let i = 0; i < SIZE; i++) {
        const o = (j * SIZE + i) * 4;

        if (pixels[o + 3] > 0) continue;
        const bx = (x * SIZE + i + 0.5) / scale - BASE_X0 * SIZE - 0.5;
        const by = (y * SIZE + j + 0.5) / scale - BASE_Y0 * SIZE - 0.5;

        if (bx < 0 || by < 0 || bx > W - 1 || by > H - 1) continue;
        const x0 = Math.floor(bx);
        const y0 = Math.floor(by);
        const x1 = Math.min(x0 + 1, W - 1);
        const y1 = Math.min(y0 + 1, H - 1);
        const tx = bx - x0;
        const ty = by - y0;

        for (let ch = 0; ch < 3; ch++) {
          pixels[o + ch] =
            base[(y0 * W + x0) * 3 + ch] * (1 - tx) * (1 - ty) +
            base[(y0 * W + x1) * 3 + ch] * tx * (1 - ty) +
            base[(y1 * W + x0) * 3 + ch] * (1 - tx) * ty +
            base[(y1 * W + x1) * 3 + ch] * tx * ty;
        }
        pixels[o + 3] = 255;
      }
    }
  }

  const canvas = new OffscreenCanvas(SIZE, SIZE);

  canvas.getContext("2d")!.putImageData(new ImageData(pixels, SIZE, SIZE), 0, 0);

  return (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer();
}
