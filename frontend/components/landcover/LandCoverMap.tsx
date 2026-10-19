"use client";

import type { FeatureCollection } from "geojson";

import { useEffect, useRef, useState } from "react";
import maplibregl, { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import MaplibreCompare from "@maplibre/maplibre-gl-compare";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";

import { addBoundary, collapseAttribution, NorthArrow } from "@/components/dash/kit";
import { getFirstVectorLayer } from "@/lib/utils/maplibre/maplibre.utils";
import {
  availability,
  Epoch,
  LC_BOUNDS,
  LC_PROVINCES,
  lcClasses,
  LcProvince,
  pmtilesUrl,
  s2CloudlessTiles,
} from "@/lib/landcover/landcover";

export interface LcLayerOptions {
  provinces: LcProvince[];
  showLandcover: boolean;
  showImagery: boolean;
  opacity: number;
  hiddenClasses: number[];
}

interface LandCoverMapProps extends LcLayerOptions {
  epoch: Epoch;
  /** Mode bandingkan: epoch sisi kiri (peta utama = sisi kanan) */
  compareEpoch: Epoch | null;
  provincesGeo: FeatureCollection | null;
  focus: { bounds: [number, number, number, number]; key: number } | null;
}

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

const style: StyleSpecification = {
  version: 8,
  sources: {
    dark: {
      type: "raster",
      tiles: [`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Basemap &copy; Esri, HERE, Garmin, &copy; OpenStreetMap",
    },
  },
  layers: [{ id: "dark", type: "raster", source: "dark" }],
};

const labelsSource: maplibregl.RasterSourceSpecification = {
  type: "raster",
  tiles: [`${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
  tileSize: 256,
  maxzoom: 16,
};

let pmtilesAdded = false;

const addPmtiles = () => {
  if (pmtilesAdded) return;
  pmtilesAdded = true;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
};

const layerNames = new Map<string, Promise<string | null>>();
const sourceLayer = (url: string) => {
  if (!layerNames.has(url)) layerNames.set(url, getFirstVectorLayer(url));

  return layerNames.get(url)!;
};

const classExpr: maplibregl.ExpressionSpecification = [
  "to-number",
  ["coalesce", ["get", "id"], ["get", "nmr_obj"]],
];

const fillColor = [
  "match",
  classExpr,
  ...lcClasses.flatMap((c) => [c.id, c.color]),
  "rgba(0,0,0,0)",
] as unknown as maplibregl.ExpressionSpecification;

const provinceId = (p: LcProvince) => `lc-${p.replace(/\s/g, "-").toLowerCase()}`;

/** Selaraskan citra & tutupan lahan satu peta dengan epoch/opsi saat ini */
async function syncLayers(map: MapLibreMap, epoch: Epoch, o: LcLayerOptions, isCurrent: () => boolean) {
  // Citra Sentinel-2 tahunan
  const s2url = s2CloudlessTiles(epoch);
  const s2 = map.getSource("s2") as maplibregl.RasterTileSource | undefined;

  if (!s2) {
    map.addSource("s2", { type: "raster", tiles: [s2url], tileSize: 256, maxzoom: 15 });
    map.addLayer({ id: "s2", type: "raster", source: "s2" }, "labels");
  } else if (s2.tiles?.[0] !== s2url) {
    s2.setTiles([s2url]);
  }
  map.setLayoutProperty("s2", "visibility", o.showImagery ? "visible" : "none");

  const filter: maplibregl.FilterSpecification = o.hiddenClasses.length
    ? (["!", ["in", classExpr, ["literal", o.hiddenClasses]]] as unknown as maplibregl.FilterSpecification)
    : (["all"] as unknown as maplibregl.FilterSpecification);

  for (const p of LC_PROVINCES) {
    const id = provinceId(p);
    const want =
      o.showLandcover && o.provinces.includes(p) && availability[p].includes(epoch) ? pmtilesUrl(p, epoch) : null;
    const have = (map.getSource(id) as { url?: string } | undefined)?.url?.replace("pmtiles://", "") ?? null;

    if (have && have !== want) {
      if (map.getLayer(id)) map.removeLayer(id);
      map.removeSource(id);
    }
    if (want && have !== want) {
      const layerName = await sourceLayer(want);

      if (!isCurrent() || !layerName || map.getSource(id)) continue;
      map.addSource(id, { type: "vector", url: `pmtiles://${want}` });
      map.addLayer(
        {
          id,
          type: "fill",
          source: id,
          "source-layer": layerName,
          paint: { "fill-color": fillColor, "fill-opacity": o.opacity / 100, "fill-antialias": false },
        },
        "provinces-line-casing",
      );
    }
    if (map.getLayer(id)) {
      map.setPaintProperty(id, "fill-opacity", o.opacity / 100);
      map.setFilter(id, filter);
    }
  }
}

function addBaseLayers(map: MapLibreMap) {
  map.addSource("labels", labelsSource);
  map.addLayer({ id: "labels", type: "raster", source: "labels" });
  map.addSource("provinces", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  addBoundary(map, { id: "provinces-line", source: "provinces", kind: "province" });
}

export default function LandCoverMap({
  epoch,
  compareEpoch,
  provincesGeo,
  focus,
  ...options
}: LandCoverMapProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const leftContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const leftMap = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [leftReady, setLeftReady] = useState(false);
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    addPmtiles();
    const map = new maplibregl.Map({
      container: container.current,
      style,
      bounds: LC_BOUNDS,
      fitBoundsOptions: { padding: 30 },
      minZoom: 4,
      // Geser dikunci di sekitar Indonesia
      maxBounds: [88, -14, 146, 12],
      renderWorldCopies: false,
      maxZoom: 16,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Tutupan lahan: GeoAIT UGM · Citra: Sentinel-2 cloudless (EOX) · Batas: geoBoundaries",
      }),
      "bottom-left",
    );
    collapseAttribution(map);
    map.addControl(new NorthArrow(), "top-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.on("load", () => {
      addBaseLayers(map);
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Lapisan peta utama (sisi kanan saat membandingkan)
  useEffect(() => {
    if (!ready) return;
    let current = true;

    syncLayers(mapRef.current!, epoch, JSON.parse(optionsKey), () => current);

    return () => {
      current = false;
    };
  }, [ready, epoch, optionsKey]);

  useEffect(() => {
    if (!ready || !provincesGeo) return;
    (mapRef.current!.getSource("provinces") as GeoJSONSource).setData(provincesGeo);
    if (leftReady) (leftMap.current!.getSource("provinces") as GeoJSONSource).setData(provincesGeo);
  }, [ready, leftReady, provincesGeo]);

  // MODE BANDINGKAN -------------------------------------------------------------
  const active = compareEpoch !== null;

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
      maxZoom: 16,
      attributionControl: false,
    });

    left.on("load", () => {
      addBaseLayers(left);
      leftMap.current = left;
      setLeftReady(true);
    });
    const swiper = new MaplibreCompare(left, main, wrapper.current, {});

    return () => {
      swiper.remove();
      left.remove();
      leftMap.current = null;
      setLeftReady(false);
      main.getContainer().style.clip = "";
      main.resize();
    };
  }, [ready, active]);

  useEffect(() => {
    if (!leftReady || !leftMap.current || compareEpoch === null) return;
    let current = true;

    if (provincesGeo) (leftMap.current.getSource("provinces") as GeoJSONSource).setData(provincesGeo);
    syncLayers(leftMap.current, compareEpoch, JSON.parse(optionsKey), () => current);

    return () => {
      current = false;
    };
  }, [leftReady, compareEpoch, optionsKey, provincesGeo]);

  useEffect(() => {
    if (!ready || !focus) return;
    mapRef.current!.fitBounds(focus.bounds, { padding: 30, duration: 1100 });
  }, [ready, focus]);

  // Inline style: CSS MapLibre (.maplibregl-map { position: relative }) mengalahkan utility Tailwind
  return (
    <div ref={wrapper} className="geoai-map" style={{ position: "absolute", inset: 0 }}>
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      <div ref={leftContainer} style={{ position: "absolute", inset: 0, display: active ? "block" : "none" }} />
    </div>
  );
}
