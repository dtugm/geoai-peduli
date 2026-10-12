'use client'
import { useEffect, useRef, useState } from 'react'
import maplibregl, { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import MaplibreCompare from '@maplibre/maplibre-gl-compare'
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css'
import { basemapStyles } from '@/constant/basemap.constant'
import { generateMatchRules } from '@/constant/landcover.constant'
import acehConstant from '@/constant/ugm/aceh.constant'
import { useAcehComparison } from '@/store/ugm/acehComparison.store'
import { getFirstVectorLayer } from '@/lib/utils/maplibre/maplibre.utils' // Pastikan import ini ada
import { Protocol } from 'pmtiles'

// --- REGISTER PROTOCOL ---
const protocol = new Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);

type FillPaint = Extract<LayerSpecification, { type: 'fill' }>['paint']

interface SumutComparisonMapProps {
    leftLayerVisible?: boolean;
    rightLayerVisible?: boolean;
    leftOpacity?: number;
    rightOpacity?: number;
    leftRasterVisible?: boolean;
    rightRasterVisible?: boolean;
    leftRasterOpacity?: number;
    rightRasterOpacity?: number;
}

const createPaintV2 = (primary: string, fallback: string, opacity: number = 0.5): FillPaint => ({
    'fill-color': [
        'match',
        ['coalesce', ['get', primary], ['get', fallback]],
        ...generateMatchRules()
    ] as unknown as ExpressionSpecification,
    'fill-opacity': opacity
})

export default function SumutComparisonMap({
    leftLayerVisible = true,
    rightLayerVisible = true,
    leftOpacity = 1,
    rightOpacity = 1,
    leftRasterVisible = true,
    rightRasterVisible = true,
    leftRasterOpacity = 1,
    rightRasterOpacity = 1,
}: SumutComparisonMapProps) {
    const { tutupanKiri, tutupanKanan, basemapKanan, basemapKiri } = useAcehComparison()

    const beforeRef = useRef<maplibregl.Map | null>(null)
    const afterRef = useRef<maplibregl.Map | null>(null)
    const compareRef = useRef<any | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Track if maps are loaded
    const [beforeMapLoaded, setBeforeMapLoaded] = useState(false)
    const [afterMapLoaded, setAfterMapLoaded] = useState(false)

    // init maps
    useEffect(() => {
        if (!containerRef.current) return

        containerRef.current.innerHTML = `
            <div id="before" class="absolute inset-0"></div>
            <div id="after" class="absolute inset-0"></div>
        `

        const beforeMap = new maplibregl.Map({
            container: 'before',
            style: basemapStyles['arcgis-world-imagery'],
            center: acehConstant.aceh.coordinate,
            zoom: 6,
            attributionControl: false
        })

        const afterMap = new maplibregl.Map({
            container: 'after',
            style: basemapStyles['arcgis-world-imagery'],
            center: acehConstant.aceh.coordinate,
            zoom: 6,
            attributionControl: false
        })

        // Wait for maps to load
        beforeMap.on('load', () => {
            setBeforeMapLoaded(true)
        })

        afterMap.on('load', () => {
            setAfterMapLoaded(true)
        })

        beforeRef.current = beforeMap
        afterRef.current = afterMap

        const compare = new MaplibreCompare(beforeMap, afterMap, containerRef.current)
        compareRef.current = compare

        return () => {
            setBeforeMapLoaded(false)
            setAfterMapLoaded(false)

            const slider = containerRef.current?.querySelector('.maplibregl-compare')
            slider?.remove()
            compareRef.current = null

            beforeMap.remove()
            afterMap.remove()
        }
    }, [])

    // Before map - Add raster layer from basemapKiri
    useEffect(() => {
        const map = beforeRef.current;
        if (!map || !beforeMapLoaded || !basemapKiri) return;

        const addRasterLayer = () => {
            const sourceId = "before-raster-source";
            const layerId = "before-raster-layer";

            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);

            map.addSource(sourceId, {
                type: "raster",
                tiles: [basemapKiri],
                tileSize: 256,
                scheme: "tms",
                attribution: '© Raster Layer'
            });

            // Insert below vector layers if possible, otherwise just add
            const firstLayerId = map.getStyle().layers.find(l => l.type === 'fill')?.id;

            map.addLayer({
                id: layerId,
                type: "raster",
                source: sourceId,
                paint: {
                    'raster-opacity': leftRasterVisible ? leftRasterOpacity : 0
                }
            }, firstLayerId);
        };

        if (map.isStyleLoaded()) {
            addRasterLayer();
        } else {
            map.once('styledata', addRasterLayer);
        }
    }, [basemapKiri, beforeMapLoaded]);

    // After map - Add raster layer from basemapKanan
    useEffect(() => {
        const map = afterRef.current;
        if (!map || !afterMapLoaded || !basemapKanan) return;

        const addRasterLayer = () => {
            const sourceId = "after-raster-source";
            const layerId = "after-raster-layer";

            if (map.getLayer(layerId)) map.removeLayer(layerId);
            if (map.getSource(sourceId)) map.removeSource(sourceId);

            map.addSource(sourceId, {
                type: "raster",
                tiles: [basemapKanan],
                scheme: "tms",
                tileSize: 256,
                attribution: '© Raster Layer'
            });

            const firstLayerId = map.getStyle().layers.find(l => l.type === 'fill')?.id;

            map.addLayer({
                id: layerId,
                type: "raster",
                source: sourceId,
                paint: {
                    'raster-opacity': rightRasterVisible ? rightRasterOpacity : 0
                }
            }, firstLayerId);
        };

        if (map.isStyleLoaded()) {
            addRasterLayer();
        } else {
            map.once('styledata', addRasterLayer);
        }
    }, [basemapKanan, afterMapLoaded]);

    // Update left raster visibility and opacity
    useEffect(() => {
        const map = beforeRef.current;
        if (!map || !beforeMapLoaded) return;
        const layerId = "before-raster-layer";
        if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'raster-opacity', leftRasterVisible ? leftRasterOpacity : 0);
        }
    }, [leftRasterVisible, leftRasterOpacity, beforeMapLoaded]);

    // Update right raster visibility and opacity
    useEffect(() => {
        const map = afterRef.current;
        if (!map || !afterMapLoaded) return;
        const layerId = "after-raster-layer";
        if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, 'raster-opacity', rightRasterVisible ? rightRasterOpacity : 0);
        }
    }, [rightRasterVisible, rightRasterOpacity, afterMapLoaded]);

    // -------------------------------------------------------------------------
    // PMTILES LOGIC START
    // -------------------------------------------------------------------------

    // Before layer - Add/Update vector layer based on tutupanKiri (PMTiles)
    useEffect(() => {
        const map = beforeRef.current;
        if (!map || !beforeMapLoaded || !tutupanKiri) return;

        const addAllLayers = async () => {
            // Loop async
            for (let i = 0; i < tutupanKiri.length; i++) {
                const url = tutupanKiri[i];
                if (!url) continue;

                const sourceId = `before-source-${i}`;
                const layerId = `before-fill-${i}`;

                // Fetch layer name from PMTiles metadata
                const sourceLayerName = await getFirstVectorLayer(url);

                if (sourceLayerName) {
                    // Clean up
                    if (map.getLayer(layerId)) map.removeLayer(layerId);
                    if (map.getSource(sourceId)) map.removeSource(sourceId);

                    // Add Source (PMTiles Protocol)
                    map.addSource(sourceId, {
                        type: "vector",
                        url: "pmtiles://" + url, // <--- Prefix pmtiles://
                        attribution: '© PMTiles'
                    });

                    // Add Layer
                    map.addLayer({
                        id: layerId,
                        type: "fill",
                        source: sourceId,
                        "source-layer": sourceLayerName,
                        paint: createPaintV2(
                            "id",
                            "nmr_obj",
                            leftLayerVisible ? leftOpacity : 0
                        ),
                    });
                }
            }
        };

        if (map.isStyleLoaded()) {
            addAllLayers();
        } else {
            map.once("styledata", addAllLayers);
        }
    }, [tutupanKiri, beforeMapLoaded, leftLayerVisible, leftOpacity]);


    // After layer - Add/Update vector layer based on tutupanKanan (PMTiles)
    useEffect(() => {
        const map = afterRef.current;
        if (!map || !afterMapLoaded || !tutupanKanan) return;

        const addAllLayers = async () => {
            for (let i = 0; i < tutupanKanan.length; i++) {
                const url = tutupanKanan[i];
                if (!url) continue;

                const sourceId = `after-source-${i}`;
                const layerId = `after-fill-${i}`;

                const sourceLayerName = await getFirstVectorLayer(url);

                if (sourceLayerName) {
                    if (map.getLayer(layerId)) map.removeLayer(layerId);
                    if (map.getSource(sourceId)) map.removeSource(sourceId);

                    map.addSource(sourceId, {
                        type: "vector",
                        url: "pmtiles://" + url, // <--- Prefix pmtiles://
                        attribution: '© PMTiles'
                    });

                    map.addLayer({
                        id: layerId,
                        type: "fill",
                        source: sourceId,
                        "source-layer": sourceLayerName,
                        paint: createPaintV2(
                            "id",
                            "nmr_obj",
                            rightLayerVisible ? rightOpacity : 0
                        ),
                    });
                }
            }
        };

        if (map.isStyleLoaded()) {
            addAllLayers();
        } else {
            map.once("styledata", addAllLayers);
        }
    }, [tutupanKanan, afterMapLoaded, rightLayerVisible, rightOpacity]);

    // Update left vector layer visibility and opacity (Looping semua index)
    useEffect(() => {
        const map = beforeRef.current;
        if (!map || !beforeMapLoaded || !tutupanKiri) return;

        tutupanKiri.forEach((_, i) => {
            const layerId = `before-fill-${i}`;
            if (map.getLayer(layerId)) {
                const opacity = leftLayerVisible ? leftOpacity : 0;
                map.setPaintProperty(layerId, 'fill-opacity', opacity);
            }
        });
    }, [leftLayerVisible, leftOpacity, beforeMapLoaded, tutupanKiri]);

    // Update right vector layer visibility and opacity (Looping semua index)
    useEffect(() => {
        const map = afterRef.current;
        if (!map || !afterMapLoaded || !tutupanKanan) return;

        tutupanKanan.forEach((_, i) => {
            const layerId = `after-fill-${i}`;
            if (map.getLayer(layerId)) {
                const opacity = rightLayerVisible ? rightOpacity : 0;
                map.setPaintProperty(layerId, 'fill-opacity', opacity);
            }
        });
    }, [rightLayerVisible, rightOpacity, afterMapLoaded, tutupanKanan]);

    return (
        <div className="relative w-full h-full shadow-lg">
            <div ref={containerRef} className="absolute inset-0 overflow-hidden" />
        </div>
    )
}
