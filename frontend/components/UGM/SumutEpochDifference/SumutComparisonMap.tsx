'use client'
import { useEffect, useRef, useState } from 'react'
import maplibregl, { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import MaplibreCompare from '@maplibre/maplibre-gl-compare'
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css'
import { basemapStyles } from '@/constant/basemap.constant'
import { generateMatchRules } from '@/constant/landcover.constant'
import { useSumutComparisonStore } from '@/store/ugm/sumutComparison.store'
import { Protocol } from "pmtiles"
import { PMTiles } from 'pmtiles' // Import PMTiles class

type FillPaint = Extract<LayerSpecification, { type: 'fill' }>['paint']

// Initialize PMTiles protocol once
if (!(maplibregl as any)._pmtilesProtocolAdded) {
    const protocol = new Protocol()
    maplibregl.addProtocol("pmtiles", protocol.tile)
        ; (maplibregl as any)._pmtilesProtocolAdded = true
}

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

// Helper function to get source layer name from PMTiles
type PMTilesMetadata = {
    vector_layers?: {
        id: string
        fields?: Record<string, string>
    }[]
}

async function getSourceLayerFromPMTiles(url: string): Promise<string | null> {
    try {
        const pmtiles = new PMTiles(url)
        const metadata: any = (await pmtiles.getMetadata()) as PMTilesMetadata

        // Try to get layer name from metadata
        if (metadata.vector_layers && metadata.vector_layers.length > 0) {
            return metadata.vector_layers[0].id
        }

        // Fallback: extract from filename
        const filename = url.split('/').pop()?.replace('.pmtiles', '')
        return filename || null
    } catch (error) {
        console.error('Error reading PMTiles metadata:', error)

        // Fallback: extract from filename
        const filename = url.split('/').pop()?.replace('.pmtiles', '')
        return filename || null
    }
}

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
    const { tutupanKiri, tutupanKanan, basemapKanan, basemapKiri } = useSumutComparisonStore()

    const beforeRef = useRef<maplibregl.Map | null>(null)
    const afterRef = useRef<maplibregl.Map | null>(null)
    const compareRef = useRef<any | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    const [beforeMapLoaded, setBeforeMapLoaded] = useState(false)
    const [afterMapLoaded, setAfterMapLoaded] = useState(false)

    // Init maps
    useEffect(() => {
        if (!containerRef.current) return

        containerRef.current.innerHTML = `
            <div id="before" class="absolute inset-0"></div>
            <div id="after" class="absolute inset-0"></div>
        `

        const beforeMap = new maplibregl.Map({
            container: 'before',
            style: basemapStyles['osm-standard'],
            center: [99.07491852176645, 2.3238524849361055],
            zoom: 6,
        })

        const afterMap = new maplibregl.Map({
            container: 'after',
            style: basemapStyles['osm-standard'],
            center: [99.07491852176645, 2.3238524849361055],
            zoom: 6,
        })

        beforeMap.on('load', () => {
            console.log('Before map loaded')
            setBeforeMapLoaded(true)
        })

        afterMap.on('load', () => {
            console.log('After map loaded')
            setAfterMapLoaded(true)
        })

        // Add error handlers
        beforeMap.on('error', (e) => {
            console.error('Before map error:', e)
        })

        afterMap.on('error', (e) => {
            console.error('After map error:', e)
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

    // Before map - Add raster layer
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
                attribution: '© Raster Layer'
            });

            map.addLayer({
                id: layerId,
                type: "raster",
                source: sourceId,
                paint: {
                    'raster-opacity': leftRasterVisible ? leftRasterOpacity : 0
                }
            }, map.getLayer("before-fill") ? "before-fill" : undefined);
        };

        if (map.isStyleLoaded()) {
            addRasterLayer();
        } else {
            map.once('styledata', addRasterLayer);
        }
    }, [basemapKiri, beforeMapLoaded, leftRasterVisible, leftRasterOpacity]);

    // After map - Add raster layer
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
                tileSize: 256,
                attribution: '© Raster Layer'
            });

            map.addLayer({
                id: layerId,
                type: "raster",
                source: sourceId,
                paint: {
                    'raster-opacity': rightRasterVisible ? rightRasterOpacity : 0
                }
            }, map.getLayer("after-fill") ? "after-fill" : undefined);
        };

        if (map.isStyleLoaded()) {
            addRasterLayer();
        } else {
            map.once('styledata', addRasterLayer);
        }
    }, [basemapKanan, afterMapLoaded, rightRasterVisible, rightRasterOpacity]);

    // Before layer - Add vector layer (PMTiles)
    useEffect(() => {
        const map = beforeRef.current;
        if (!map || !tutupanKiri || !beforeMapLoaded) return;

        const addLayer = async () => {
            try {
                const sourceId = "before-source";
                const layerId = "before-fill";

                // Get source layer name
                const sourceLayerName = await getSourceLayerFromPMTiles(tutupanKiri);

                if (!sourceLayerName) {
                    console.error('Could not determine source layer name for:', tutupanKiri);
                    return;
                }

                console.log('Before layer - Source layer name:', sourceLayerName);

                // Remove existing
                if (map.getLayer(layerId)) map.removeLayer(layerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);

                // Add source with correct URL format
                const pmtilesUrl = tutupanKiri.startsWith('pmtiles://')
                    ? tutupanKiri
                    : `pmtiles://${tutupanKiri}`;

                map.addSource(sourceId, {
                    type: "vector",
                    url: pmtilesUrl,
                    minzoom: 0,
                    maxzoom: 14,
                });

                // Add layer
                map.addLayer({
                    id: layerId,
                    type: "fill",
                    source: sourceId,
                    "source-layer": sourceLayerName,
                    paint: createPaintV2("id", "nmr_kls", leftLayerVisible ? leftOpacity : 0),
                });

                console.log('Before layer added successfully');
            } catch (error) {
                console.error('Error adding before layer:', error);
            }
        };

        if (map.isStyleLoaded()) {
            addLayer();
        } else {
            map.once('styledata', addLayer);
        }
    }, [tutupanKiri, beforeMapLoaded, leftLayerVisible, leftOpacity]);

    // After layer - Add vector layer (PMTiles)
    useEffect(() => {
        const map = afterRef.current;
        if (!map || !tutupanKanan || !afterMapLoaded) return;

        const addLayer = async () => {
            try {
                const sourceId = "after-source";
                const layerId = "after-fill";

                // Get source layer name
                const sourceLayerName = await getSourceLayerFromPMTiles(tutupanKanan);

                if (!sourceLayerName) {
                    console.error('Could not determine source layer name for:', tutupanKanan);
                    return;
                }

                console.log('After layer - Source layer name:', sourceLayerName);

                // Remove existing
                if (map.getLayer(layerId)) map.removeLayer(layerId);
                if (map.getSource(sourceId)) map.removeSource(sourceId);

                // Add source with correct URL format
                const pmtilesUrl = tutupanKanan.startsWith('pmtiles://')
                    ? tutupanKanan
                    : `pmtiles://${tutupanKanan}`;

                map.addSource(sourceId, {
                    type: "vector",
                    url: pmtilesUrl,
                    minzoom: 0,
                    maxzoom: 14,
                });

                // Add layer
                map.addLayer({
                    id: layerId,
                    type: "fill",
                    source: sourceId,
                    "source-layer": sourceLayerName,
                    paint: createPaintV2("id", "nmr_kls", rightLayerVisible ? rightOpacity : 0),
                });

                console.log('After layer added successfully');
            } catch (error) {
                console.error('Error adding after layer:', error);
            }
        };

        if (map.isStyleLoaded()) {
            addLayer();
        } else {
            map.once('styledata', addLayer);
        }
    }, [tutupanKanan, afterMapLoaded, rightLayerVisible, rightOpacity]);

    // Update left raster opacity
    useEffect(() => {
        const map = beforeRef.current;
        if (!map || !beforeMapLoaded) return;

        const layerId = "before-raster-layer";
        if (map.getLayer(layerId)) {
            const opacity = leftRasterVisible ? leftRasterOpacity : 0;
            map.setPaintProperty(layerId, 'raster-opacity', opacity);
        }
    }, [leftRasterVisible, leftRasterOpacity, beforeMapLoaded]);

    // Update right raster opacity
    useEffect(() => {
        const map = afterRef.current;
        if (!map || !afterMapLoaded) return;

        const layerId = "after-raster-layer";
        if (map.getLayer(layerId)) {
            const opacity = rightRasterVisible ? rightRasterOpacity : 0;
            map.setPaintProperty(layerId, 'raster-opacity', opacity);
        }
    }, [rightRasterVisible, rightRasterOpacity, afterMapLoaded]);

    // Update left vector opacity
    useEffect(() => {
        const map = beforeRef.current;
        if (!map || !beforeMapLoaded) return;

        const layerId = "before-fill";
        if (map.getLayer(layerId)) {
            const opacity = leftLayerVisible ? leftOpacity : 0;
            map.setPaintProperty(layerId, 'fill-opacity', opacity);
        }
    }, [leftLayerVisible, leftOpacity, beforeMapLoaded]);

    // Update right vector opacity
    useEffect(() => {
        const map = afterRef.current;
        if (!map || !afterMapLoaded) return;

        const layerId = "after-fill";
        if (map.getLayer(layerId)) {
            const opacity = rightLayerVisible ? rightOpacity : 0;
            map.setPaintProperty(layerId, 'fill-opacity', opacity);
        }
    }, [rightLayerVisible, rightOpacity, afterMapLoaded]);

    return (
        <div className="relative w-full h-full shadow-lg">
            <div ref={containerRef} className="absolute inset-0 overflow-hidden" />
        </div>
    )
}
