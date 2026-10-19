"use client";

import type { FeatureCollection } from "geojson";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  GeoJSONSource,
  ImageSource,
  Map as MapLibreMap,
  RasterTileSource,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { addBoundary, collapseAttribution, highlightBoundary, NorthArrow, setBoundaryVisible } from "@/components/dash/kit";
import { confidenceLabel, FirmsResponse, HotspotRow } from "@/lib/fire/firms.types";
import { GibsLayer, gibsLayers, gibsTileUrl, isValidGibsTile } from "@/lib/fire/gibs";
import { renderFilledTile } from "@/lib/fire/gibsFill";
import { acquiredAt, toGeoJson } from "@/lib/fire/hotspots";
import { SmokeGrid } from "@/lib/fire/smoke.types";
import { gridBounds } from "@/lib/fire/smokeRender";
import { WindParticles } from "@/lib/fire/windParticles";

/**
 * Tumpukan frame satu layer GIBS. Semua `times` dimuat (agar animasi mulus),
 * tetapi hanya `visible` yang tampil — urut naik sehingga frame terbaru di atas
 * dan frame sebelumnya mengisi celah orbit/awan di bawahnya.
 */
export interface RasterStack {
  layer: GibsLayer;
  times: string[];
  visible: string[];
  opacity: number;
}

interface FireMapProps {
  data: FirmsResponse | null;
  rows: HotspotRow[];
  provincesGeo: FeatureCollection | null;
  selectedProvince: number | null;
  onSelectProvince: (id: number | null) => void;
  showPoints: boolean;
  showHeat: boolean;
  showProvinces: boolean;
  raster: RasterStack | null;
  /** Dipanggil dengan "layerKey|waktu" saat tile frame selesai dimuat */
  onFrameLoaded?: (key: string) => void;
  focusBounds: [number, number, number, number] | null;
  /** Frame model asap (PNG) yang ditempel di atas peta */
  smoke: { url: string; grid: SmokeGrid; opacity: number } | null;
  /** Medan angin frame aktif untuk partikel */
  wind: { grid: SmokeGrid; u: number[]; v: number[] } | null;
  /** HTML popup nilai model di titik yang diklik (null = tidak ada) */
  probe?: (lon: number, lat: number) => string | null;
  /** Mode paparan asap: peta dasar laut biru/daratan abu & titik kab/kota terpapar */
  exposure: FeatureCollection | null;
}

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

// Font label (dipakai label kab/kota terpapar asap)
const OMT = "https://tiles.openfreemap.org";

const baseStyle: StyleSpecification = {
  version: 8,
  glyphs: `${OMT}/fonts/{fontstack}/{range}.pbf`,
  // Transisi cat (opasitas, warna) — dipakai untuk crossfade frame model asap
  transition: { duration: 450, delay: 0 },
  sources: {
    base: {
      type: "raster",
      tiles: [`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Basemap &copy; Esri, HERE, Garmin, &copy; OpenStreetMap",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};


// Label tempat ditaruh di atas citra satelit supaya tetap terbaca
const labelsSource: maplibregl.RasterSourceSpecification = {
  type: "raster",
  tiles: [`${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
  tileSize: 256,
  maxzoom: 16,
};

// Protocol "gibs://" menyaring tile GIBS yang salah (lihat isValidGibsTile);
// tile yang ditolak dianggap kosong sehingga celahnya terisi hari sebelumnya.
let gibsProtocolAdded = false;

const addGibsProtocol = () => {
  if (gibsProtocolAdded) return;
  gibsProtocolAdded = true;
  maplibregl.addProtocol("gibs", async (params, abortController) => {
    const url = params.url.replace(/^gibs:\/\//, "https://");
    const res = await fetch(url, { signal: abortController.signal });

    if (!isValidGibsTile(res, url)) throw new Error("GIBS: tile tanpa data");

    return { data: await res.arrayBuffer() };
  });
  // "gibsfill://layerKey/tanggal/z/x/y" — tile penuh tanpa celah (lib/fire/gibsFill)
  maplibregl.addProtocol("gibsfill", async (params) => {
    const [key, date, z, x, y] = params.url.replace(/^gibsfill:\/\//, "").split("/");
    const layer = gibsLayers.find((l) => l.key === key)!;

    return { data: await renderFilledTile(layer, date, Number(z), Number(x), Number(y)) };
  });
};

const INDONESIA_BOUNDS: [number, number, number, number] = [94.5, -11.5, 141.5, 6.5];

/**
 * Batas geser peta = cakupan data asap & angin Asia Tenggara (90–147,5°BT,
 * 15°LS–27,5°LU, lihat lib/fire/smokeClient) ditambah ruang secukupnya agar seluruh
 * Indonesia tetap muat saat peta tegak (panel samping terbuka); tepi grid
 * dibuat memudar (lihat renderSmokeFrame) agar tidak terpotong tajam.
 */
const DATA_BOUNDS: [number, number, number, number] = [84, -24, 154, 33];

// Warna titik berdasarkan Fire Radiative Power (MW)
const frpColor: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "frp"],
  0,
  "#fde047",
  10,
  "#fb923c",
  50,
  "#ef4444",
  200,
  "#b91c1c",
  1000,
  "#7f1d1d",
];

const timeText = (row: HotspotRow, data: FirmsResponse) =>
  new Date(acquiredAt(row, data.dates)).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

// globals.css membuat konten popup transparan (untuk peta lain), jadi beri kartu sendiri
const card = (html: string) =>
  `<div style="background:#fff;padding:10px 12px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35)">${html}</div>`;

const popupHtml = (row: HotspotRow, data: FirmsResponse) => `
  <div style="font-family:inherit;min-width:210px;color:#0f172a">
    <div style="font-weight:600;font-size:13px;margin-bottom:6px">${data.provinces[row[8]]}</div>
    <table style="font-size:12px;line-height:1.6;border-collapse:collapse">
      <tr><td style="color:#64748b;padding-right:10px">Waktu</td><td>${timeText(row, data)}</td></tr>
      <tr><td style="color:#64748b">Satelit</td><td>${data.satellites[row[6]]?.label ?? "-"} · ${row[7] ? "Malam" : "Siang"}</td></tr>
      <tr><td style="color:#64748b">Kepercayaan</td><td>${confidenceLabel[row[3] as 0 | 1 | 2]}</td></tr>
      <tr><td style="color:#64748b">FRP</td><td>${row[2].toLocaleString("id-ID")} MW</td></tr>
      <tr><td style="color:#64748b">Koordinat</td><td>${row[1].toFixed(4)}, ${row[0].toFixed(4)}</td></tr>
    </table>
  </div>`;

export default function FireMap({
  data,
  rows,
  provincesGeo,
  selectedProvince,
  onSelectProvince,
  showPoints,
  showHeat,
  showProvinces,
  raster,
  onFrameLoaded,
  focusBounds,
  smoke,
  wind,
  probe,
  exposure,
}: FireMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  // Data terbaru untuk handler klik (tanpa memasang ulang handler)
  const latest = useRef({ rows, data, onSelectProvince, onFrameLoaded, probe });

  latest.current = { rows, data, onSelectProvince, onFrameLoaded, probe };

  const particles = useRef<WindParticles | null>(null);

  // Id source/layer raster yang sedang terpasang, urut naik menurut waktu
  const rasterIds = useRef<string[]>([]);

  // INIT ---------------------------------------------------------------
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    addGibsProtocol();

    const map = new maplibregl.Map({
      container: container.current,
      style: baseStyle,
      bounds: INDONESIA_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      // Geser dikunci di sekitar Asia Tenggara
      maxBounds: DATA_BOUNDS,
      renderWorldCopies: false,
      minZoom: 3,
      maxZoom: 14,
      attributionControl: false,
    });

    mapRef.current = map;
    collapseAttribution(map);
    map.addControl(new NorthArrow(), "top-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          "Hotspot: NASA FIRMS · Citra: NASA GIBS · Model asap: CAMS via Open-Meteo · Batas: geoBoundaries (ODbL)",
      }),
      "bottom-left",
    );

    // Tanggal tanpa data di GIBS membalas 404/500 per tile — wajar, tidak perlu
    // memenuhi console (frame tersebut tetap terisi dari hari sebelumnya).
    map.on("error", (e) => {
      const sourceId = (e as { sourceId?: string }).sourceId;

      if (!sourceId?.startsWith("r|")) console.error(e.error);
    });

    map.on("sourcedata", (e) => {
      if (e.sourceId?.startsWith("r|") && e.isSourceLoaded) {
        latest.current.onFrameLoaded?.(e.sourceId.slice(2));
      }
    });

    map.on("load", () => {
      map.addSource("labels", labelsSource);
      map.addLayer({ id: "labels", type: "raster", source: "labels" });

      map.addSource("provinces", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "provinces-fill",
        type: "fill",
        source: "provinces",
        paint: { "fill-color": "#38bdf8", "fill-opacity": 0 },
      });
      addBoundary(map, { id: "provinces-line", source: "provinces", kind: "province" });

      map.addSource("hotspots", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "hotspots-heat",
        type: "heatmap",
        source: "hotspots",
        maxzoom: 10,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "frp"], 0, 0.3, 100, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 9, 2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 3, 6, 9, 22],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.85, 10, 0],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.2,
            "#facc15",
            0.45,
            "#f97316",
            0.7,
            "#dc2626",
            1,
            "#fef2f2",
          ],
        },
      });
      map.addLayer({
        id: "hotspots-points",
        type: "circle",
        source: "hotspots",
        paint: {
          "circle-color": frpColor,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 8, 3.5, 12, 7],
          "circle-opacity": 0.9,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 0, 10, 0.8],
          "circle-stroke-color": "#0f172a",
        },
      });

      // Ditutup manual: closeOnClick bawaan ikut menutup popup yang baru dibuka
      // Kabupaten/kota yang mayoritas wilayahnya tertutup asap
      map.addSource("exposure", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "exposure-points",
        type: "circle",
        source: "exposure",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["get", "r"], 8, ["*", ["get", "r"], 1.8]],
          "circle-stroke-color": "#1e1b4b",
          "circle-stroke-width": 1.2,
        },
      });
      map.addLayer({
        id: "exposure-labels",
        type: "symbol",
        source: "exposure",
        filter: ["<=", ["get", "rank"], 3],
        layout: {
          "text-field": [
            "format",
            ["get", "name"],
            { "font-scale": 1, "text-font": ["literal", ["Noto Sans Bold"]] },
            "\n",
            {},
            ["get", "ratioText"],
            { "font-scale": 0.85, "text-font": ["literal", ["Noto Sans Regular"]], "text-color": "#fde68a" },
          ],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-anchor": "right",
          "text-justify": "right",
          "text-offset": [-0.9, 0],
          // Label yang bertabrakan disembunyikan otomatis saat zoom jauh
          "text-allow-overlap": false,
          "text-optional": true,
        },
        paint: { "text-color": "#ffffff", "text-halo-color": "rgba(15,23,42,0.85)", "text-halo-width": 1.4 },
      });

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "280px",
      });

      map.on("click", (e) => {
        const { rows, data, onSelectProvince } = latest.current;
        const hit = map.queryRenderedFeatures(
          [
            [e.point.x - 4, e.point.y - 4],
            [e.point.x + 4, e.point.y + 4],
          ],
          { layers: ["hotspots-points"] },
        )[0];

        if (hit && data) {
          const row = rows[hit.properties.i as number];

          if (row) popup.setLngLat([row[0], row[1]]).setHTML(card(popupHtml(row, data))).addTo(map);

          return;
        }

        const probed = latest.current.probe?.(e.lngLat.lng, e.lngLat.lat);

        if (probed) {
          popup.setLngLat(e.lngLat).setHTML(card(probed)).addTo(map);

          return;
        }

        popup.remove();

        const province = map.queryRenderedFeatures(e.point, { layers: ["provinces-fill"] })[0];

        if (province) onSelectProvince(province.properties.id as number);
      });

      map.on("mouseenter", "hotspots-points", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "hotspots-points", () => (map.getCanvas().style.cursor = ""));

      setReady(true);
    });

    return () => {
      particles.current?.remove();
      particles.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // HOTSPOT DATA -------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    (mapRef.current!.getSource("hotspots") as GeoJSONSource).setData(toGeoJson(rows));
  }, [ready, rows]);

  // BATAS PROVINSI -----------------------------------------------------
  useEffect(() => {
    if (!ready || !provincesGeo) return;
    (mapRef.current!.getSource("provinces") as GeoJSONSource).setData(provincesGeo);
  }, [ready, provincesGeo]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;

    map.setPaintProperty("provinces-fill", "fill-opacity", [
      "case",
      ["==", ["get", "id"], selectedProvince ?? -1],
      0.08,
      0,
    ]);
    highlightBoundary(map, "provinces-line", "province", selectedProvince);
  }, [ready, selectedProvince]);

  // VISIBILITAS HOTSPOT & BATAS ----------------------------------------
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const vis = (on: boolean) => (on ? "visible" : "none");

    map.setLayoutProperty("hotspots-points", "visibility", vis(showPoints));
    map.setLayoutProperty("hotspots-heat", "visibility", vis(showHeat));
    setBoundaryVisible(map, "provinces-line", showProvinces);
  }, [ready, showPoints, showHeat, showProvinces]);

  // LAYER GIBS (TUMPUKAN FRAME) ----------------------------------------
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const id = (time: string) => `r|${raster!.layer.key}|${time}`;
    const wanted = raster ? raster.times.map(id) : [];

    // Lepas frame yang tidak lagi dibutuhkan
    rasterIds.current
      .filter((rid) => !wanted.includes(rid))
      .forEach((rid) => {
        if (map.getLayer(rid)) map.removeLayer(rid);
        if (map.getSource(rid)) map.removeSource(rid);
      });

    if (!raster) {
      rasterIds.current = [];

      return;
    }

    const visible = new Set(raster.visible.map(id));

    raster.times.forEach((time) => {
      const rid = id(time);

      if (!map.getSource(rid)) {
        map.addSource(rid, {
          type: "raster",
          tiles: [
            raster.layer.fill
              ? `gibsfill://${raster.layer.key}/${time}/{z}/{x}/{y}`
              : gibsTileUrl(raster.layer, time).replace(/^https:\/\//, "gibs://"),
          ],
          tileSize: 256,
          maxzoom: raster.layer.maxZoom,
        });
        map.addLayer(
          {
            id: rid,
            type: "raster",
            source: rid,
            paint: {
              "raster-opacity": 0,
              "raster-fade-duration": 0,
            },
          },
          "labels",
        );
      }

      // Urutkan naik: setiap frame dipindah tepat di bawah label
      map.moveLayer(rid, "labels");
      map.setPaintProperty(rid, "raster-opacity", visible.has(rid) ? raster.opacity / 100 : 0);
    });

    rasterIds.current = wanted;
  }, [ready, raster]);

  // MODEL ASAP ---------------------------------------------------------
  // Dua image source dipakai bergantian supaya pergantian jam ber-crossfade.
  const smokeSlot = useRef<0 | 1>(0);
  const smokeUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const ids = ["smoke-0", "smoke-1"];

    if (!smoke) {
      ids.forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      });
      smokeUrl.current = null;

      return;
    }

    const [w, s, e, n] = gridBounds(smoke.grid);
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [w, n],
      [e, n],
      [e, s],
      [w, s],
    ];

    if (smoke.url !== smokeUrl.current) {
      const slot = smokeUrl.current === null ? 0 : ((1 - smokeSlot.current) as 0 | 1);
      const id = ids[slot];
      const source = map.getSource(id) as ImageSource | undefined;

      if (source) {
        source.updateImage({ url: smoke.url, coordinates });
      } else {
        map.addSource(id, { type: "image", url: smoke.url, coordinates });
        map.addLayer(
          {
            id,
            type: "raster",
            source: id,
            paint: {
              "raster-opacity": 0,
              "raster-fade-duration": 0,
              "raster-resampling": "linear",
            },
          },
          "labels",
        );
      }
      smokeSlot.current = slot;
      smokeUrl.current = smoke.url;
    }

    ids.forEach((id, i) => {
      if (map.getLayer(id)) {
        map.setPaintProperty(
          id,
          "raster-opacity",
          i === smokeSlot.current ? smoke.opacity / 100 : 0,
        );
      }
    });
  }, [ready, smoke]);

  // Titik api dibuat kecil & samar saat model asap tampil
  const subtle = !!smoke;

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;

    map.setPaintProperty(
      "hotspots-points",
      "circle-radius",
      subtle
        ? ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2.2, 12, 5]
        : ["interpolate", ["linear"], ["zoom"], 3, 1.6, 8, 3.5, 12, 7],
    );
    map.setPaintProperty("hotspots-points", "circle-opacity", subtle ? 0.55 : 0.9);
  }, [ready, subtle]);

  // MODE PAPARAN ASAP: titik kab/kota terpapar -------------------------------
  useEffect(() => {
    if (!ready) return;
    (mapRef.current!.getSource("exposure") as GeoJSONSource).setData(
      exposure ?? { type: "FeatureCollection", features: [] },
    );
  }, [ready, exposure]);

  // PARTIKEL ANGIN — mengalir mengikuti arah & kecepatan angin ---------------
  useEffect(() => {
    if (!ready) return;

    if (!wind) {
      particles.current?.stop();

      return;
    }

    particles.current ??= new WindParticles(mapRef.current!);
    particles.current.setField(wind.grid, wind.u, wind.v);
    particles.current.start();
  }, [ready, wind]);

  // FOKUS ------------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    mapRef.current!.fitBounds(focusBounds ?? INDONESIA_BOUNDS, {
      padding: 40,
      duration: 900,
      maxZoom: 9,
    });
  }, [ready, focusBounds]);

  // Inline style: CSS MapLibre (.maplibregl-map { position: relative }) mengalahkan utility Tailwind
  return <div ref={container} className="geoai-map" style={{ position: "absolute", inset: 0 }} />;
}
