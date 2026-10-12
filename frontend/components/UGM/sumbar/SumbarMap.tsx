"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Accordion, AccordionItem, Card, CardBody, Slider, Spinner, Switch } from "@heroui/react";
import { FancyCompass } from "../sumut/MapClass";
import { basemapStyles } from "@/constant/basemap.constant";
import { epochTilesUrl } from "../sumut/MapClass";
import { LandCoverOptions } from "@/constant/landcover.constant";
import { Layers, Eye, EyeOff } from "lucide-react";
import sumutConstant from "@/constant/ugm/sumut.constant";
// Ganti import extractSourceLayerInfo menjadi getFirstVectorLayer
import { getFirstVectorLayer, LandCoverPaint } from "@/lib/utils/maplibre/maplibre.utils";
import { generateSimpleClassHTML } from "@/components/Dashboard/popuptemplate";
import CollapsableLegends from "@/components/app/card/CollapsableLegends";
import { useSumutStore } from "@/store/ugm/sumut.store";
import sumbarConstant from "@/constant/ugm/sumbar.constant";

// --- 1. IMPORT PMTILES ---
import { Protocol, PMTiles } from 'pmtiles';

// --- 2. REGISTER PROTOCOL SECARA GLOBAL ---
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

export default function SumbarMap() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const popupRef = useRef<maplibregl.Popup | null>(null);

    // STATE ------------------------------------------------
    const [epoch, setEpoch] = useState<number>(2021);
    const [hasAwsTiles, setHasAwsTiles] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [currentSourceLayer, setCurrentSourceLayer] = useState<string | undefined | null>(null);
    const [mapLoaded, setMapLoaded] = useState<boolean>(false);
    const [showOverlays, setShowOverlays] = useState<boolean>(false);

    // Toggle states for layers
    const { showRasterLayer, showVectorLayer, setShowRasterLayer, setShowVectorLayer } = useSumutStore()
    // Opacity states
    const { rasterOpacity, vectorOpacity, setRasterOpacity, setVectorOpacity } = useSumutStore()

    // Trigger overlay animations after map loads
    useEffect(() => {
        if (mapLoaded && !isLoading) {
            const timer = setTimeout(() => {
                setShowOverlays(true);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [mapLoaded, isLoading]);

    // CHECK IF TILES URL EXISTS
    const checkTilesAvailability = useCallback(async (url: string): Promise<boolean> => {
        if (!url) return false;
        try {
            const testUrl = url.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0');
            const res = await fetch(testUrl, { method: 'HEAD' });
            return res.ok;
        } catch (err) {
            console.warn("Tiles not available:", err);
            return false;
        }
    }, []);

    // SETUP POPUP HANDLERS
    const setupPopupHandlers = useCallback((map: MapLibreMap) => {
        if (popupRef.current) {
            popupRef.current.remove();
        }

        map.on("click", "pbf-tiles-layer", (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            const coords = e.lngLat;
            const props = feature.properties;

            if (popupRef.current) {
                popupRef.current.remove();
            }

            popupRef.current = new maplibregl.Popup({
                anchor: "bottom",
                maxWidth: "400px",
                closeButton: false,
                closeOnClick: true,
            })
                .setLngLat(coords)
                .setHTML(generateSimpleClassHTML(props))
                .addTo(map);
        });

        map.on("mouseenter", "pbf-tiles-layer", () => {
            map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "pbf-tiles-layer", () => {
            map.getCanvas().style.cursor = "";
        });
    }, []);

    // INIT MAP ----------------------------------------------------------------
    useEffect(() => {
        if (!mapContainer.current || mapRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: basemapStyles["osm-standard"],
            center: sumbarConstant.sumbar.coordinate,
            zoom: sumbarConstant.sumbar.zoom,
            attributionControl: false,
            minZoom: 3,
            maxZoom: 14,
        });

        map.addControl(new FancyCompass(), "top-right");

        map.on("load", async () => {
            setIsLoading(true);

            // Add Raster Layer
            const tilesUrl = epochTilesUrl?.[2025];
            if (tilesUrl) {
                const isAvailable = await checkTilesAvailability(tilesUrl);
                if (isAvailable) {
                    try {
                        map.addSource("sentinel-tiles-source", {
                            type: "raster",
                            tiles: [tilesUrl],
                            tileSize: 256,
                            minzoom: 0,
                            maxzoom: 18,
                        });
                        map.addLayer({
                            id: "sentinel-tiles-layer",
                            type: "raster",
                            source: "sentinel-tiles-source",
                            paint: {
                                "raster-opacity": showRasterLayer ? rasterOpacity / 100 : 0,
                            },
                        });
                        setHasAwsTiles(true);
                    } catch (err) {
                        console.error("Error adding raster layer:", err);
                        setHasAwsTiles(false);
                    }
                } else {
                    setHasAwsTiles(false);
                }
            }

            // Add Vector Layer (PMTiles)
            // ⚠️ Ganti URL ini sesuai bucket S3 Anda
            const pbfTilesUrl = "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumbar_2025.pmtiles";

            if (pbfTilesUrl) {
                // 1. Ambil nama layer (Async)
                const layerName = await getFirstVectorLayer(pbfTilesUrl);

                if (layerName) {
                    setCurrentSourceLayer(layerName);
                    try {
                        map.addSource("pbf-tiles-source", {
                            type: "vector",
                            // 2. Gunakan protokol pmtiles://
                            url: "pmtiles://" + pbfTilesUrl,
                            attribution: '© PMTiles'
                        });

                        map.addLayer({
                            id: "pbf-tiles-layer",
                            type: "fill",
                            source: "pbf-tiles-source",
                            "source-layer": layerName, // Gunakan nama layer hasil fetch
                            paint: {
                                ...LandCoverPaint("id", "nmr_obj"),
                                "fill-opacity": showVectorLayer ? vectorOpacity / 100 : 0,
                            },
                        });

                        setupPopupHandlers(map);

                        map.once('sourcedata', (e) => {
                            if (e.sourceId === 'pbf-tiles-source' && e.isSourceLoaded) {
                                console.log(`📊 PMTiles loaded. Layer: ${layerName}`);
                            }
                        });
                    } catch (err) {
                        console.error("Error adding vector layer:", err);
                    }
                }
            }

            setMapLoaded(true);
            setIsLoading(false);
        });

        mapRef.current = map;

        return () => {
            if (popupRef.current) popupRef.current.remove();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [checkTilesAvailability, setupPopupHandlers]);

    // UPDATE EPOCH ------------------------------------------
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapLoaded) return;

        const updateLayers = async () => {
            setIsUpdating(true);

            try {
                // 1. Update AWS Raster Tiles
                const tilesUrl = epochTilesUrl?.[epoch];
                if (tilesUrl && hasAwsTiles) {
                    if (map.getLayer("sentinel-tiles-layer")) map.removeLayer("sentinel-tiles-layer");
                    if (map.getSource("sentinel-tiles-source")) map.removeSource("sentinel-tiles-source");

                    map.addSource("sentinel-tiles-source", {
                        type: "raster",
                        tiles: [tilesUrl],
                        tileSize: 256,
                        minzoom: 0,
                        maxzoom: 18,
                    });

                    map.addLayer({
                        id: "sentinel-tiles-layer",
                        type: "raster",
                        source: "sentinel-tiles-source",
                        paint: {
                            "raster-opacity": showRasterLayer ? rasterOpacity / 100 : 0,
                        },
                    }, map.getLayer("pbf-tiles-layer") ? "pbf-tiles-layer" : undefined);
                }

                // 2. Update PMTiles Vector Tiles
                // ⚠️ Pastikan URL dinamis sesuai nama file di bucket
                const pbfTilesUrl = `https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumbar_${epoch}.pmtiles`;

                if (pbfTilesUrl) {
                    const layerName = await getFirstVectorLayer(pbfTilesUrl);

                    if (layerName) {
                        setCurrentSourceLayer(layerName);

                        if (popupRef.current) popupRef.current.remove();

                        if (map.getLayer("pbf-tiles-layer")) map.removeLayer("pbf-tiles-layer");
                        if (map.getSource("pbf-tiles-source")) map.removeSource("pbf-tiles-source");

                        await new Promise(resolve => setTimeout(resolve, 50));

                        map.addSource("pbf-tiles-source", {
                            type: "vector",
                            url: "pmtiles://" + pbfTilesUrl,
                            attribution: '© PMTiles'
                        });

                        map.addLayer({
                            id: "pbf-tiles-layer",
                            type: "fill",
                            source: "pbf-tiles-source",
                            "source-layer": layerName,
                            paint: {
                                ...LandCoverPaint("id", "nmr_obj"),
                                "fill-opacity": showVectorLayer ? vectorOpacity / 100 : 0,
                            },
                        });

                        setupPopupHandlers(map);
                    }
                }
            } catch (err) {
                console.error("Error updating layers:", err);
            } finally {
                setTimeout(() => {
                    setIsUpdating(false);
                }, 300);
            }
        };

        updateLayers();
    }, [epoch, hasAwsTiles, mapLoaded, setupPopupHandlers]);

    // UPDATE RASTER LAYER VISIBILITY & OPACITY
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapLoaded) return;

        const updateRasterLayer = () => {
            if (map.getLayer("sentinel-tiles-layer")) {
                map.setPaintProperty(
                    "sentinel-tiles-layer",
                    "raster-opacity",
                    showRasterLayer ? rasterOpacity / 100 : 0
                );
            }
        };

        if (map.isStyleLoaded()) {
            updateRasterLayer();
        } else {
            map.once('idle', updateRasterLayer);
        }
    }, [showRasterLayer, rasterOpacity, mapLoaded]);

    // UPDATE VECTOR LAYER VISIBILITY & OPACITY
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapLoaded) return;

        const updateVectorLayer = () => {
            if (map.getLayer("pbf-tiles-layer")) {
                map.setPaintProperty(
                    "pbf-tiles-layer",
                    "fill-opacity",
                    showVectorLayer ? vectorOpacity / 100 : 0
                );
            }
        };

        if (map.isStyleLoaded()) {
            updateVectorLayer();
        } else {
            map.once('idle', updateVectorLayer);
        }
    }, [showVectorLayer, vectorOpacity, mapLoaded]);

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} className="w-full h-full" />

            {/* LOADING state */}
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <Card className="p-4 md:p-6 bg-black/50 shadow-xl w-[80%] max-w-[260px]">
                        <div className="flex flex-col items-center gap-3">
                            <Spinner size="md" color="primary" />
                            <p className="text-xs md:text-sm font-medium text-white">Loading Map...</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* UPDATING INDICATOR */}
            {isUpdating && !isLoading && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
                    <Card className="p-2 md:p-3 bg-black/55 text-white shadow-lg backdrop-blur-sm">
                        <div className="flex items-center gap-2 md:gap-3">
                            <Spinner size="sm" color="primary" />
                            <p className="text-xs md:text-sm font-medium">
                                Updating data for {epoch}...
                            </p>
                        </div>
                    </Card>
                </div>
            )}

            {/* LEGEND CARD - Slide in from left */}
            <div
                className={`absolute left-2 top-2 z-40 transition-all duration-500 ease-out ${showOverlays
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-full opacity-0'
                    }`}
                style={{ transitionDelay: '100ms' }}
            >
                <Card className="mb-3 bg-gray-900 text-white px-3 py-2 shadow-md rounded-xl">
                    <p className="text-sm font-medium">Sumatera Barat {epoch}</p>
                </Card>
                <CollapsableLegends
                    title="Legend Tutupan Lahan"
                    currentSourceLayer={currentSourceLayer}
                    items={LandCoverOptions}
                />
            </div>

            {/* BOTTOM RIGHT CONTROLS - Slide in from bottom */}
            <div
                className={`absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 flex flex-col gap-3 z-50 transition-all duration-500 ease-out ${showOverlays
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-full opacity-0'
                    }`}
            >
                {/* LAYER CONTROL CARD */}
                <div
                    className="transition-all duration-500 ease-out"
                    style={{ transitionDelay: '200ms' }}
                >
                    <Card className="bg-gray-900/90 text-white backdrop-blur-lg shadow-xl border border-gray-700/50">
                        <CardBody className="p-0">
                            <Accordion
                                isCompact
                                defaultExpandedKeys={["layer-controls"]}
                            >
                                <AccordionItem
                                    key="layer-controls"
                                    aria-label="Layer Controls"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Layers size={18} className="text-brand" />
                                            <h3 className="text-sm md:text-base font-semibold text-white">Layer Controls</h3>
                                        </div>
                                    }
                                    classNames={{
                                        trigger: "py-3 px-4 hover:bg-gray-800/30 transition-colors",
                                        title: "text-sm",
                                        content: "px-2 pb-4 pt-1"
                                    }}
                                >
                                    <div className="space-y-4">
                                        {/* Satellite Imagery Layer */}
                                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    {showRasterLayer ? <Eye size={16} className="text-blue-400" /> : <EyeOff size={16} className="text-gray-500" />}
                                                    <span className="text-sm font-medium text-gray-200">Satellite Imagery</span>
                                                </div>
                                                <Switch
                                                    size="sm"
                                                    isSelected={showRasterLayer}
                                                    onValueChange={setShowRasterLayer}
                                                    classNames={{
                                                        wrapper: "group-data-[selected=true]:bg-blue-500"
                                                    }}
                                                />
                                            </div>
                                            <Slider
                                                size="sm"
                                                step={5}
                                                minValue={0}
                                                maxValue={100}
                                                value={rasterOpacity}
                                                onChange={(val) => setRasterOpacity(val as number)}
                                                className="w-full"
                                                label={`Opacity: ${rasterOpacity}%`}
                                                isDisabled={!showRasterLayer}
                                                classNames={{
                                                    base: "max-w-full",
                                                    label: "text-xs text-gray-300 mb-2",
                                                    track: "bg-gray-700",
                                                    filler: "bg-blue-500",
                                                    thumb: "bg-blue-600 border-2 border-blue-400",
                                                }}
                                            />
                                        </div>

                                        {/* Land Cover Layer */}
                                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    {showVectorLayer ? <Eye size={16} className="text-green-400" /> : <EyeOff size={16} className="text-gray-500" />}
                                                    <span className="text-sm font-medium text-gray-200">Land Cover</span>
                                                </div>
                                                <Switch
                                                    size="sm"
                                                    isSelected={showVectorLayer}
                                                    onValueChange={setShowVectorLayer}
                                                    classNames={{
                                                        wrapper: "group-data-[selected=true]:bg-green-500"
                                                    }}
                                                />
                                            </div>
                                            <Slider
                                                size="sm"
                                                step={5}
                                                minValue={0}
                                                maxValue={100}
                                                value={vectorOpacity}
                                                onChange={(val) => setVectorOpacity(val as number)}
                                                className="w-full"
                                                label={`Opacity: ${vectorOpacity}%`}
                                                isDisabled={!showVectorLayer}
                                                classNames={{
                                                    base: "max-w-full",
                                                    label: "text-xs text-gray-300 mb-2",
                                                    track: "bg-gray-700",
                                                    filler: "bg-green-500",
                                                    thumb: "bg-green-600 border-2 border-green-400",
                                                }}
                                            />
                                        </div>
                                    </div>
                                </AccordionItem>
                            </Accordion>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}
