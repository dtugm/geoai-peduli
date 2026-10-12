import type { StyleSpecification } from "maplibre-gl";

/**
 * Collection of basemap styles for MapLibre GL JS
 * Each style follows the MapLibre Style Specification v8
 */
export const basemapStyles = {
  // OpenStreetMap Standard
  // http://ecn.t3.tiles.virtualearth.net/tiles/a{q}.jpeg?g=1
  // "bing-maps": {
  //   version: 8,
  //   sources: {
  //     "bing-tiles": {
  //       type: "raster",
  //       tiles: ["http://ecn.t3.tiles.virtualearth.net/tiles/a{q}.jpeg?g=1"],
  //       tileSize: 256,
  //       attribution:
  //         "&copy; <a href='https://www.bing.com/maps'>Bing Maps</a> contributors",
  //     },
  //   },
  //   layers: [
  //     {
  //       id: "bing-layer",
  //       type: "raster",
  //       source: "bing-tiles",
  //     },
  //   ],
  //   glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  // },
  "osm-standard": {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
      },
    },
    layers: [
      {
        id: "osm-layer",
        type: "raster",
        source: "osm-tiles",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // Google Satellite
  "google-satellite": {
    version: 8,
    sources: {
      "google-satellite": {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "&copy; Google",
      },
    },
    layers: [
      {
        id: "google-satellite-layer",
        type: "raster",
        source: "google-satellite",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // Google Hybrid
  "google-hybrid": {
    version: 8,
    sources: {
      "google-hybrid": {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "&copy; Google",
      },
    },
    layers: [
      {
        id: "google-hybrid-layer",
        type: "raster",
        source: "google-hybrid",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // Google Streets
  "google-streets": {
    version: 8,
    sources: {
      "google-streets": {
        type: "raster",
        tiles: ["https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"],
        tileSize: 256,
        attribution: "&copy; Google",
      },
    },
    layers: [
      {
        id: "google-streets-layer",
        type: "raster",
        source: "google-streets",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // Sentinel-2 Cloudless
  "sentinel-cloudless": {
    version: 8,
    sources: {
      "sentinel-cloudless": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://s2maps.eu'>Sentinel-2 cloudless</a> by <a href='https://eox.at'>EOX IT Services GmbH</a>",
      },
    },
    layers: [
      {
        id: "sentinel-cloudless-layer",
        type: "raster",
        source: "sentinel-cloudless",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
  "sentinel-cloudless-20": {
    version: 8,
    sources: {
      "sentinel-cloudless": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://s2maps.eu'>Sentinel-2 cloudless</a> by <a href='https://eox.at'>EOX IT Services GmbH</a>",
      },
    },
    layers: [
      {
        id: "sentinel-cloudless-layer",
        type: "raster",
        source: "sentinel-cloudless",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
  "sentinel-cloudless-21": {
    version: 8,
    sources: {
      "sentinel-cloudless": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://s2maps.eu'>Sentinel-2 cloudless</a> by <a href='https://eox.at'>EOX IT Services GmbH</a>",
      },
    },
    layers: [
      {
        id: "sentinel-cloudless-layer",
        type: "raster",
        source: "sentinel-cloudless",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
  "sentinel-cloudless-22": {
    version: 8,
    sources: {
      "sentinel-cloudless": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://s2maps.eu'>Sentinel-2 cloudless</a> by <a href='https://eox.at'>EOX IT Services GmbH</a>",
      },
    },
    layers: [
      {
        id: "sentinel-cloudless-layer",
        type: "raster",
        source: "sentinel-cloudless",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
  "sentinel-cloudless-23": {
    version: 8,
    sources: {
      "sentinel-cloudless": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://s2maps.eu'>Sentinel-2 cloudless</a> by <a href='https://eox.at'>EOX IT Services GmbH</a>",
      },
    },
    layers: [
      {
        id: "sentinel-cloudless-layer",
        type: "raster",
        source: "sentinel-cloudless",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
  "sentinel-cloudless-24": {
    version: 8,
    sources: {
      "sentinel-cloudless": {
        type: "raster",
        tiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://s2maps.eu'>Sentinel-2 cloudless</a> by <a href='https://eox.at'>EOX IT Services GmbH</a>",
      },
    },
    layers: [
      {
        id: "sentinel-cloudless-layer",
        type: "raster",
        source: "sentinel-cloudless",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // CartoDB Positron (Light)
  "cartodb-positron": {
    version: 8,
    sources: {
      "cartodb-positron": {
        type: "raster",
        tiles: [
          "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, &copy; <a href='https://carto.com/attribution'>CARTO</a>",
      },
    },
    layers: [
      {
        id: "cartodb-positron-layer",
        type: "raster",
        source: "cartodb-positron",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // CartoDB Dark Matter
  "cartodb-dark": {
    version: 8,
    sources: {
      "cartodb-dark": {
        type: "raster",
        tiles: [
          "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution:
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors, &copy; <a href='https://carto.com/attribution'>CARTO</a>",
      },
    },
    layers: [
      {
        id: "cartodb-dark-layer",
        type: "raster",
        source: "cartodb-dark",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // Stamen Terrain
  // "stamen-terrain": {
  //   version: 8,
  //   sources: {
  //     "stamen-terrain": {
  //       type: "raster",
  //       tiles: [
  //         "https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg",
  //       ],
  //       tileSize: 256,
  //       attribution:
  //         "Map tiles by <a href='http://stamen.com'>Stamen Design</a>, under <a href='http://creativecommons.org/licenses/by/3.0'>CC BY 3.0</a>. Data by <a href='http://openstreetmap.org'>OpenStreetMap</a>",
  //     },
  //   },
  //   layers: [
  //     {
  //       id: "stamen-terrain-layer",
  //       type: "raster",
  //       source: "stamen-terrain",
  //     },
  //   ],
  //   glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  // },

  // ESRI World Imagery
  "arcgis-world-imagery": {
    version: 8,
    sources: {
      "arcgis-world-imagery": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Tiles &copy; Esri",
      },
    },
    layers: [
      {
        id: "arcgis-world-imagery-layer",
        type: "raster",
        source: "arcgis-world-imagery",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },

  // ESRI World Street Map
  "arcgis-world-street": {
    version: 8,
    sources: {
      "arcgis-world-street": {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Tiles &copy; Esri",
      },
    },
    layers: [
      {
        id: "arcgis-world-street-layer",
        type: "raster",
        source: "arcgis-world-street",
      },
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  },
} as const satisfies Record<string, StyleSpecification>;

/**
 * Type representing all available basemap keys
 */
export type BasemapKey = keyof typeof basemapStyles;

/**
 * Array of all available basemap keys for iteration
 */
export const basemapKeys = Object.keys(basemapStyles) as BasemapKey[];

/**
 * Basemap metadata for UI display
 */
export const basemapMetadata: Record<
  BasemapKey,
  {
    name: string;
    description: string;
    category: "street" | "satellite" | "terrain" | "light" | "dark";
    provider: string;
  }
> = {
  // "bing-maps": {
  //   name: "Bing Maps",
  //   description: "Microsoft Bing Maps tiles",
  //   category: "satellite",
  //   provider: "Microsoft",
  // },
  "osm-standard": {
    name: "OpenStreetMap",
    description: "Standard OpenStreetMap tiles",
    category: "street",
    provider: "OpenStreetMap",
  },
  "google-satellite": {
    name: "Google Satellite",
    description: "Google satellite imagery",
    category: "satellite",
    provider: "Google",
  },
  "google-hybrid": {
    name: "Google Hybrid",
    description: "Google satellite with labels",
    category: "satellite",
    provider: "Google",
  },
  "google-streets": {
    name: "Google Streets",
    description: "Google street map",
    category: "street",
    provider: "Google",
  },
  "sentinel-cloudless": {
    name: "Sentinel-2 Cloudless",
    description: "Sentinel-2 satellite imagery without clouds",
    category: "satellite",
    provider: "EOX",
  },
  "sentinel-cloudless-20": {
    name: "Sentinel-2 Cloudless",
    description: "Sentinel-2 satellite imagery without clouds",
    category: "satellite",
    provider: "EOX",
  },
  "sentinel-cloudless-21": {
    name: "Sentinel-2 Cloudless",
    description: "Sentinel-2 satellite imagery without clouds",
    category: "satellite",
    provider: "EOX",
  },
  "sentinel-cloudless-22": {
    name: "Sentinel-2 Cloudless",
    description: "Sentinel-2 satellite imagery without clouds",
    category: "satellite",
    provider: "EOX",
  },
  "sentinel-cloudless-23": {
    name: "Sentinel-2 Cloudless",
    description: "Sentinel-2 satellite imagery without clouds",
    category: "satellite",
    provider: "EOX",
  },
  "sentinel-cloudless-24": {
    name: "Sentinel-2 Cloudless",
    description: "Sentinel-2 satellite imagery without clouds",
    category: "satellite",
    provider: "EOX",
  },
  "cartodb-positron": {
    name: "CartoDB Positron",
    description: "Light colored basemap",
    category: "light",
    provider: "CartoDB",
  },
  "cartodb-dark": {
    name: "CartoDB Dark Matter",
    description: "Dark themed basemap",
    category: "dark",
    provider: "CartoDB",
  },
  // "stamen-terrain": {
  //   name: "Stamen Terrain",
  //   description: "Terrain visualization",
  //   category: "terrain",
  //   provider: "Stamen",
  // },
  "arcgis-world-imagery": {
    name: "ArcGIS World Imagery",
    description: "ESRI world satellite imagery",
    category: "satellite",
    provider: "ESRI",
  },
  "arcgis-world-street": {
    name: "ArcGIS World Street",
    description: "ESRI world street map",
    category: "street",
    provider: "ESRI",
  },
} as const;

/**
 * Default basemap key
 */
export const DEFAULT_BASEMAP: BasemapKey = "osm-standard";

/**
 * Utility function to get basemap style by key
 */
export const getBasemapStyle = (key: BasemapKey): StyleSpecification => {
  return basemapStyles[key];
};

/**
 * Utility function to check if basemap key exists
 */
export const isValidBasemapKey = (key: string): key is BasemapKey => {
  return key in basemapStyles;
};
