"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl, { ExpressionSpecification, LayerSpecification, Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, Slider, Spinner } from "@heroui/react";
import { epochPbfTilesUrl, FancyCompass } from "./MapClass";
import { basemapStyles } from "@/constant/basemap.constant";
import { epochGeojson, epochTilesUrl } from './MapClass'
import { generateMatchRules, LandCoverOptions } from "@/constant/landcover.constant";
type FillPaint = Extract<LayerSpecification, { type: "fill" }>["paint"];

const EMPTY_GEOJSON = {
    type: "FeatureCollection",
    features: [],
};
const createPaintV2 = (primary: string, fallback: string): FillPaint => ({
    "fill-color": [
        "match",
        ["coalesce", ["get", primary], ["get", fallback]],
        ...generateMatchRules(),
    ] as unknown as ExpressionSpecification,
    "fill-opacity": 0.5,
});
export default function EpochMap() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const [epoch, setEpoch] = useState<number>(2020);
    const [hasAwsTiles, setHasAwsTiles] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    // CHECK IF TILES URL EXISTS ------------------------------------------------
    const checkTilesAvailability = async (url: string): Promise<boolean> => {
        if (!url) return false;

        try {
            const testUrl = url.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0');
            const res = await fetch(testUrl, { method: 'HEAD' });
            return res.ok;
        } catch (err) {
            console.warn("Tiles not available:", err);
            return false;
        }
    };

    // FETCH GEOJSON SAFELY -----------------------------------------------------
    const fetchGeoJSON = async (url: string) => {
        if (!url) {
            console.warn("GeoJSON URL is empty");
            return EMPTY_GEOJSON;
        }

        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`GeoJSON fetch failed with status: ${res.status}`);
                return EMPTY_GEOJSON;
            }
            const data = await res.json();

            // Validate GeoJSON structure
            if (!data.type || data.type !== "FeatureCollection") {
                console.warn("Invalid GeoJSON format");
                return EMPTY_GEOJSON;
            }

            return data;
        } catch (err) {
            console.warn("GeoJSON fetch failed:", err);
            return EMPTY_GEOJSON;
        }
    };

    // INIT MAP ----------------------------------------------------------------
    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: basemapStyles["arcgis-world-imagery"],
            center: [99.07491852176645, 2.3238524849361055],
            zoom: 6,
        });

        map.addControl(new FancyCompass(), "top-right");
        map.on("load", async () => {
            setIsLoading(true);
            const tilesUrl = epochTilesUrl?.[2020];
            if (tilesUrl) {
                const isAvailable = await checkTilesAvailability(tilesUrl);
                if (isAvailable) {
                    try {
                        map.addSource("aws-tiles-source", {
                            type: "raster",
                            tiles: [tilesUrl],
                            tileSize: 256,
                            minzoom: 0,
                            maxzoom: 18,
                        });
                        map.addLayer({
                            id: "aws-tiles-layer",
                            type: "raster",
                            source: "aws-tiles-source",
                            paint: {
                                "raster-opacity": 0.7,
                            },
                        });
                        setHasAwsTiles(true);
                        console.log("AWS tiles loaded successfully");
                    } catch (err) {
                        console.warn("Failed to add AWS tiles layer:", err);
                        setHasAwsTiles(false);
                    }
                } else {
                    console.warn("AWS tiles not available, skipping...");
                    setHasAwsTiles(false);
                }
            } else {
                console.warn("AWS tiles URL not configured");
                setHasAwsTiles(false);
            }


            const geojsonUrl = epochGeojson?.[2020];
            const geojsonData = geojsonUrl
                ? await fetchGeoJSON(geojsonUrl)
                : EMPTY_GEOJSON;

            try {
                map.addSource("landcover-source", {
                    type: "geojson",
                    data: geojsonData,
                });

                map.addLayer({
                    id: "landcover-fill",
                    type: "fill",
                    source: "landcover-source",
                    paint: createPaintV2("nmr_kls", "id")
                });

                map.addLayer({
                    id: "landcover-outline",
                    type: "line",
                    source: "landcover-source",
                    paint: {
                        "line-color": "#000",
                        "line-width": 1,
                    },
                });

                if (geojsonData.features.length > 0) {
                    console.log(`GeoJSON loaded: ${geojsonData.features.length} features`);
                } else {
                    console.warn("GeoJSON has no features");
                }
            } catch (err) {
                console.error("Failed to add GeoJSON layers:", err);
            }

            setIsLoading(false);
        });

        mapRef.current = map;
    }, []);

    // UPDATE LOGIC WHEN EPOCH CHANGES
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !map.isStyleLoaded()) return;

        const updateLayers = async () => {
            setIsUpdating(true);
            try {
                // 1. Update AWS Raster Tiles
                const tilesUrl = epochTilesUrl?.[epoch];
                if (tilesUrl && hasAwsTiles) {
                    try {
                        if (map.getLayer("aws-tiles-layer")) {
                            map.removeLayer("aws-tiles-layer");
                        }
                        if (map.getSource("aws-tiles-source")) {
                            map.removeSource("aws-tiles-source");
                        }
                        map.addSource("aws-tiles-source", {
                            type: "raster",
                            tiles: [tilesUrl],
                            tileSize: 256,
                            minzoom: 0,
                            maxzoom: 18,
                        });
                        map.addLayer(
                            {
                                id: "aws-tiles-layer",
                                type: "raster",
                                source: "aws-tiles-source",
                                paint: {
                                    "raster-opacity": 0.7,
                                },
                            },
                            "landcover-fill"
                        );
                        console.log(`✅ AWS tiles updated for epoch ${epoch}`);
                    } catch (err) {
                        console.error(`❌ Failed to update AWS tiles for epoch ${epoch}:`, err);
                    }
                }

                // 2. Update PBF Vector Tiles
                const pbfTilesUrl = epochPbfTilesUrl?.[epoch];
                console.log("🔍 PBF Tiles URL:", pbfTilesUrl);

                if (pbfTilesUrl) {
                    try {
                        // Remove existing layers/sources
                        if (map.getLayer("pbf-tiles-layer")) {
                            map.removeLayer("pbf-tiles-layer");
                            console.log("🗑️ Removed existing PBF layer");
                        }
                        if (map.getLayer("pbf-tiles-layer-outline")) {
                            map.removeLayer("pbf-tiles-layer-outline");
                            console.log("🗑️ Removed existing PBF layer");
                        }
                        if (map.getSource("pbf-tiles-source")) {
                            map.removeSource("pbf-tiles-source");
                            console.log("🗑️ Removed existing PBF source");
                        }

                        // Add new source
                        map.addSource("pbf-tiles-source", {
                            type: "vector",
                            tiles: [pbfTilesUrl],
                            minzoom: 0,
                            maxzoom: 18,
                        });
                        console.log("✅ PBF source added");
                        map.addLayer(
                            {
                                id: "pbf-tiles-layer",
                                type: "fill",
                                source: "pbf-tiles-source",
                                "source-layer": "public.hgu_tiles", // ⚠️ UBAH INI! Coba: "default", "layer0", atau nama layer Anda
                                paint: {
                                    "fill-color": "yellow",
                                    "fill-opacity": 0.5
                                }
                            },
                            "landcover-fill"
                        );
                        map.addLayer({
                            id: "pbf-tiles-layer-outline",
                            type: "line",
                            source: "pbf-tiles-source",
                            "source-layer": "public.hgu_tiles",
                            paint: {
                                "line-color": "yellow",
                                "line-width": 2,
                                "line-opacity": 0.8,
                            },
                        },
                            "landcover-fill"
                        );

                        console.log(`✅ PBF tiles layer added for epoch ${epoch}`);

                        setTimeout(() => {
                            const source = map.getSource("pbf-tiles-source") as any;
                            if (source) {
                                console.log("📊 PBF Source info:", source);
                            }
                        }, 1000);

                    } catch (err) {
                        console.error(`❌ Failed to update PBF tiles for epoch ${epoch}:`, err);
                        // Log detail error
                        if (err instanceof Error) {
                            console.error("Error message:", err.message);
                            console.error("Error stack:", err.stack);
                        }
                    }
                } else {
                    console.warn(`⚠️ PBF tiles URL not configured for epoch ${epoch}`);
                }
                const geojsonUrl = epochGeojson?.[epoch];
                if (geojsonUrl) {
                    try {
                        const geojsonData = await fetchGeoJSON(geojsonUrl);
                        const geojsonSource = map.getSource("landcover-source") as maplibregl.GeoJSONSource;

                        if (geojsonSource) {
                            geojsonSource.setData(geojsonData);

                            if (geojsonData.features.length > 0) {
                                console.log(`✅ GeoJSON updated for epoch ${epoch}: ${geojsonData.features.length} features`);
                            } else {
                                console.warn(`⚠️ GeoJSON for epoch ${epoch} has no features`);
                            }
                        }
                    } catch (err) {
                        console.error(`❌ Failed to update GeoJSON for epoch ${epoch}:`, err);
                    }
                } else {
                    console.warn(`⚠️ GeoJSON URL not configured for epoch ${epoch}`);
                }
            } finally {
                setTimeout(() => {
                    setIsUpdating(false);
                }, 300);
            }
        };

        updateLayers();
    }, [epoch, hasAwsTiles]);


    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />

            {/* LOADING OVERLAY - Initial Load */}
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <Card className="p-6 bg-black/90 shadow-xl">
                        <div className="flex flex-col items-center gap-4">
                            <Spinner size="lg" color="primary" />
                            <p className="text-sm font-medium">Loading Map...</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* UPDATING INDICATOR - Epoch Change */}
            {isUpdating && !isLoading && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[60]">
                    <Card className="p-3 bg-white/95 shadow-lg backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <Spinner size="sm" color="primary" />
                            <p className="text-sm font-medium">Updating data for {epoch}...</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* SLIDER */}
            <Card className="absolute bottom-4 right-4 p-4  bg-gray-900/50 text-white backdrop-blur-md shadow-lg z-50 cursor-auto">
                <Slider
                    showSteps
                    label="Epoch"
                    size="md"
                    className="w-150"
                    step={1}
                    minValue={2020}
                    maxValue={2025}
                    value={epoch}
                    onChange={(val) => setEpoch(Math.round(val as number))}
                    formatOptions={{ useGrouping: false }}
                    marks={[
                        { value: 2020, label: "2020" },
                        { value: 2021, label: "2021" },
                        { value: 2022, label: "2022" },
                        { value: 2023, label: "2023" },
                        { value: 2024, label: "2024" },
                        { value: 2025, label: "2025" },
                    ]}
                />
            </Card>
            <Card className="absolute bottom-4 left-4 p-3  bg-gray-900/50 text-white shadow-lg w-[200px]">
                <h4 className="font-semibold text-sm mb-2">Legend Tutupan Lahan</h4>
                <div className="flex flex-col gap-2 text-xs">
                    {LandCoverOptions.map((item) => (
                        <LegendItem key={item.id} color={item.color} label={item.label} />
                    ))}
                </div>
            </Card>

            {/* STATUS INDICATOR (Optional - untuk debugging) */}
            {/* {process.env.NODE_ENV === 'development' && (
                <Card className="absolute top-4 left-4 p-2 bg-white/90 shadow-lg text-xs">
                    <div>Epoch: {epoch}</div>
                    <div>AWS Tiles: {hasAwsTiles ? '✅' : '❌'}</div>
                    <div>Loading: {isLoading ? '⏳' : '✅'}</div>
                    <div>Updating: {isUpdating ? '⏳' : '✅'}</div>
                </Card>
            )} */}
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm" style={{ background: color }} />
            <span>{label}</span>
        </div>
    );
}
