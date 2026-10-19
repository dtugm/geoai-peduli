"use client";

import type { FeatureCollection } from "geojson";

import { useEffect, useRef, useState } from "react";
import maplibregl, {
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./flood-poi.css";
import MaplibreCompare from "@maplibre/maplibre-gl-compare";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";

import { addBoundary, collapseAttribution, highlightBoundary, NorthArrow } from "@/components/dash/kit";
import {
  AOI_BBOX,
  FloodParams,
  Mosaics,
  renderTile,
  RenderMode,
} from "@/lib/flood/s1";

export type Basemap = "dark" | "imagery";

/** Lapisan raster: URL template tile + zoom minimum render */
export interface RasterLayer {
  tiles: string;
  minzoom: number;
  maxzoom: number;
}

export interface FloodPoi {
  id: number;
  name: string;
  lon: number;
  lat: number;
  floodHa: number;
  color: string;
}

interface FloodMapProps {
  background: RasterLayer | null;
  overlay: RasterLayer | null;
  opacity: number;
  basemap: Basemap;
  provinces: FeatureCollection | null;
  kabupaten: FeatureCollection | null;
  selectedKabupaten: number | null;
  pois: FloodPoi[];
  showPois: boolean;
  onSelectPoi: (id: number) => void;
  onViewChange: (bounds: [number, number, number, number], zoom: number) => void;
  focus: { bounds: [number, number, number, number]; key: number } | null;
  /** Mode bandingkan: lapisan sisi kiri (peta utama = sisi kanan), digeser dengan slider */
  compare: RasterLayer | null;
}

/** POI berdenyut disembunyikan mulai zoom ini (lapisan Sentinel sudah terlihat) */
const POI_MAX_ZOOM = 9;

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

const style: StyleSpecification = {
  version: 8,
  sources: {
    dark: {
      type: "raster",
      tiles: [`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Basemap &copy; Esri, HERE, Garmin, &copy; OpenStreetMap",
    },
    imagery: {
      type: "raster",
      tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Citra &copy; Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    { id: "dark", type: "raster", source: "dark" },
    { id: "imagery", type: "raster", source: "imagery", layout: { visibility: "none" } },
  ],
};

// Label ditambahkan setelah load supaya berada di atas lapisan Sentinel
const labelsSource: maplibregl.RasterSourceSpecification = {
  type: "raster",
  tiles: [`${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
  tileSize: 256,
  maxzoom: 16,
};

// Protocol "s1flood://mode/z/x/y?…" — tile olahan dihitung di browser (lib/flood/s1)
let protocolAdded = false;

const addProtocol = () => {
  if (protocolAdded) return;
  protocolAdded = true;
  maplibregl.addProtocol("s1flood", async (req, abort) => {
    const url = new URL(req.url.replace("s1flood://", "http://x/"));
    const [mode, z, x, y] = url.pathname.slice(1).split("/");
    const q = url.searchParams;
    const mosaics: Mosaics = {
      dry: q.get("dry")!,
      wet: q.get("wet")!,
      dem: q.get("dem")!,
      gsw: q.get("gsw")!,
    };
    const params: FloodParams = {
      drop: Number(q.get("drop")),
      water: Number(q.get("water")),
      maxElev: Number(q.get("maxElev")),
      increase: q.get("inc") === "1",
      permanent: q.get("perm") === "1",
    };

    return {
      data: await renderTile(
        mosaics,
        Number(z),
        Number(x),
        Number(y),
        mode as RenderMode,
        params,
        abort.signal,
      ),
    };
  });
};

export default function FloodMap({
  background,
  overlay,
  opacity,
  basemap,
  provinces,
  kabupaten,
  selectedKabupaten,
  pois,
  showPois,
  onSelectPoi,
  onViewChange,
  focus,
  compare,
}: FloodMapProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const leftContainer = useRef<HTMLDivElement>(null);
  const leftMap = useRef<MapLibreMap | null>(null);
  const [leftReady, setLeftReady] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(5);
  const latest = useRef({ onViewChange, onSelectPoi });

  latest.current = { onViewChange, onSelectPoi };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    addProtocol();

    const map = new maplibregl.Map({
      container: container.current,
      style,
      bounds: AOI_BBOX,
      fitBoundsOptions: { padding: 40 },
      minZoom: 4,
      // Geser dikunci di sekitar Indonesia
      maxBounds: [88, -14, 146, 12],
      renderWorldCopies: false,
      maxZoom: 15,
      attributionControl: false,
    });

    mapRef.current = map;
    collapseAttribution(map);
    map.addControl(new NorthArrow(), "top-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          "Sentinel-1 RTC & Sentinel-2 (Copernicus/ESA) via Microsoft Planetary Computer · DEM Copernicus · JRC GSW · ESA WorldCover · WorldPop · geoBoundaries",
      }),
      "bottom-left",
    );

    // Tile yang dibatalkan saat peta digeser memicu error — abaikan
    map.on("error", (e) => {
      const id = (e as { sourceId?: string }).sourceId;

      if (id !== "bg" && id !== "overlay") console.error(e.error);
    });

    const report = () => {
      const b = map.getBounds();

      setZoom(map.getZoom());
      latest.current.onViewChange(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        map.getZoom(),
      );
    };

    map.on("moveend", report);
    map.on("zoom", () => setZoom(map.getZoom()));

    map.on("load", () => {
      map.addSource("labels", labelsSource);
      map.addLayer({ id: "labels", type: "raster", source: "labels" });

      map.addSource("kabupaten", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "kabupaten-fill",
        type: "fill",
        source: "kabupaten",
        paint: { "fill-color": "#38bdf8", "fill-opacity": 0 },
      });
      addBoundary(map, { id: "kabupaten-line", source: "kabupaten", kind: "kabupaten" });

      map.addSource("provinces", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      addBoundary(map, { id: "provinces-line", source: "provinces", kind: "province" });

      setReady(true);
      report();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // BASEMAP ---------------------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;

    [map, leftReady ? leftMap.current : null].forEach((m) => {
      if (!m) return;
      m.setLayoutProperty("dark", "visibility", basemap === "dark" ? "visible" : "none");
      m.setLayoutProperty("imagery", "visibility", basemap === "imagery" ? "visible" : "none");
    });
  }, [ready, leftReady, basemap]);

  // BATAS -----------------------------------------------------------------
  useEffect(() => {
    if (!ready || !provinces) return;
    (mapRef.current!.getSource("provinces") as GeoJSONSource).setData(provinces);
  }, [ready, provinces]);

  useEffect(() => {
    if (!ready || !kabupaten) return;
    (mapRef.current!.getSource("kabupaten") as GeoJSONSource).setData(kabupaten);
  }, [ready, kabupaten]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const sel = ["==", ["get", "id"], selectedKabupaten ?? -1] as maplibregl.ExpressionSpecification;

    map.setPaintProperty("kabupaten-fill", "fill-opacity", ["case", sel, 0.08, 0]);
    highlightBoundary(map, "kabupaten-line", "kabupaten", selectedKabupaten);
  }, [ready, selectedKabupaten]);

  // LAPISAN RASTER (latar + overlay genangan) ----------------------------------
  const setRaster = (
    id: "bg" | "overlay",
    layer: RasterLayer | null,
    before: string,
    map: MapLibreMap = mapRef.current!,
  ) => {
    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(id)) map.removeSource(id);
    if (!layer) return;

    map.addSource(id, {
      type: "raster",
      tiles: [layer.tiles],
      tileSize: 256,
      minzoom: layer.minzoom,
      maxzoom: layer.maxzoom,
      bounds: AOI_BBOX,
    });
    map.addLayer(
      {
        id,
        type: "raster",
        source: id,
        paint: { "raster-opacity": opacity / 100, "raster-fade-duration": 150 },
      },
      before,
    );
  };

  useEffect(() => {
    if (!ready) return;
    setRaster("bg", background, "labels");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, background]);

  useEffect(() => {
    if (!ready) return;
    setRaster("overlay", overlay, "labels");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, overlay]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;

    if (map.getLayer("bg")) map.setPaintProperty("bg", "raster-opacity", opacity / 100);
    const left = leftMap.current;

    if (leftReady && left?.getLayer("bg")) {
      left.setPaintProperty("bg", "raster-opacity", opacity / 100);
    }
  }, [ready, leftReady, opacity, background, compare]);

  // MODE BANDINGKAN (swipe) ---------------------------------------------------
  // Peta kedua ditumpuk di atas peta utama; maplibre-gl-compare menyinkronkan kamera
  // dan memotong peta kiri sesuai posisi slider.
  const active = !!compare;

  useEffect(() => {
    if (!ready || !active || !leftContainer.current || !wrapper.current) return;
    const main = mapRef.current!;
    const left = new maplibregl.Map({
      container: leftContainer.current,
      style,
      center: main.getCenter(),
      zoom: main.getZoom(),
      bearing: main.getBearing(),
      minZoom: 4,
      // Geser dikunci di sekitar Indonesia
      maxBounds: [88, -14, 146, 12],
      renderWorldCopies: false,
      maxZoom: 15,
      attributionControl: false,
    });

    left.on("error", (e) => {
      if ((e as { sourceId?: string }).sourceId !== "bg") console.error(e.error);
    });
    left.on("load", () => {
      left.addSource("labels", labelsSource);
      left.addLayer({ id: "labels", type: "raster", source: "labels" });
      left.addSource("provinces", {
        type: "geojson",
        data: (main.getSource("provinces") as GeoJSONSource).serialize().data as FeatureCollection,
      });
      addBoundary(left, { id: "provinces-line", source: "provinces", kind: "province" });
      leftMap.current = left;
      setLeftReady(true);
    });

    const swiper = new MaplibreCompare(left, main, wrapper.current, {});

    return () => {
      swiper.remove();
      left.remove();
      leftMap.current = null;
      setLeftReady(false);
      // Peta utama tidak lagi terpotong setelah mode bandingkan ditutup
      main.getContainer().style.clip = "";
      main.resize();
    };
  }, [ready, active]);

  useEffect(() => {
    if (!leftReady || !leftMap.current) return;
    setRaster("bg", compare, "labels", leftMap.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftReady, compare]);

  // POI BERDENYUT ---------------------------------------------------------
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!ready) return;
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    if (!showPois) return;

    const max = Math.max(...pois.map((p) => p.floodHa), 1);

    markers.current = pois.map((p) => {
      const size = 10 + Math.sqrt(p.floodHa / max) * 22;
      // Root marker dibiarkan polos — MapLibre memposisikannya secara absolut
      const el = document.createElement("div");
      const btn = document.createElement("button");
      const title = `${p.name} — ${Math.round(p.floodHa).toLocaleString("id-ID")} ha genangan`;

      btn.type = "button";
      btn.className = "flood-poi";
      btn.title = title;
      btn.setAttribute("aria-label", title);
      btn.style.setProperty("--poi-size", `${size}px`);
      btn.style.setProperty("--poi-color", p.color);
      btn.innerHTML = `<span class="flood-poi-ring"></span><span class="flood-poi-ring flood-poi-ring-2"></span><span class="flood-poi-dot"></span><span class="flood-poi-label">${p.name}</span>`;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        latest.current.onSelectPoi(p.id);
      });
      el.appendChild(btn);

      return new maplibregl.Marker({ element: el }).setLngLat([p.lon, p.lat]).addTo(mapRef.current!);
    });
  }, [ready, pois, showPois]);

  useEffect(() => {
    markers.current.forEach((m) => {
      m.getElement().style.display = zoom < POI_MAX_ZOOM ? "" : "none";
    });
  }, [zoom, pois, showPois]);

  // FOKUS -------------------------------------------------------------------
  useEffect(() => {
    if (!ready || !focus) return;
    mapRef.current!.fitBounds(focus.bounds, { padding: 40, duration: 1200 });
  }, [ready, focus]);

  return (
    <div
      ref={wrapper}
      className="geoai-map"
      style={{ position: "absolute", inset: 0 }}
    >
      {/* Inline style: CSS MapLibre (.maplibregl-map { position: relative }) mengalahkan utility Tailwind */}
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      <div
        ref={leftContainer}
        style={{ position: "absolute", inset: 0, display: active ? "block" : "none" }}
      />
    </div>
  );
}
