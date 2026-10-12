'use client'
import { useEffect, useRef, useState } from 'react'
import maplibregl, { ExpressionSpecification, LayerSpecification } from 'maplibre-gl'
import MaplibreCompare from '@maplibre/maplibre-gl-compare'
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css'
import { basemapStyles } from '@/constant/basemap.constant'
import { generateMatchRules, LandCoverOptions } from '@/constant/landcover.constant'
import { useComparisonStore } from '@/store/comparison.store'
import { epochTilesUrl } from './MapClass'

type FillPaint = Extract<LayerSpecification, { type: 'fill' }>['paint']

const createPaintV2 = (primary: string, fallback: string): FillPaint => ({
    'fill-color': [
        'match',
        ['coalesce', ['get', primary], ['get', fallback]],
        ...generateMatchRules()
    ] as unknown as ExpressionSpecification,
    'fill-opacity': 0.5
})

// Fungsi untuk check tiles availability
const checkTilesAvailability = async (tilesUrl: string): Promise<boolean> => {
    try {
        const testUrl = tilesUrl.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0')
        const response = await fetch(testUrl, { method: 'HEAD' })
        return response.ok
    } catch (error) {
        console.error('Tiles availability check failed:', error)
        return false
    }
}

export default function SumutMapView() {
    const { hguKiri, hguKanan } = useComparisonStore()
    const beforeRef = useRef<maplibregl.Map | null>(null)
    const afterRef = useRef<maplibregl.Map | null>(null)
    const compareRef = useRef<any | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [beforeDataName, setBeforeDataName] = useState<any>('ArcGis Imagery')
    const [afterDataName, setAfterDataName] = useState<any>('ArcGis Imagery')
    const [hasAwsTiles, setHasAwsTiles] = useState(false)
    const [showRasterLayer, setShowRasterLayer] = useState(true)
    const [rasterOpacity, setRasterOpacity] = useState(100)

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
            center: [99.07491852176645, 2.3238524849361055],
            zoom: 6,
        })

        const afterMap = new maplibregl.Map({
            container: 'after',
            style: basemapStyles['arcgis-world-imagery'],
            center: [99.07491852176645, 2.3238524849361055],
            zoom: 6,
        })

        beforeRef.current = beforeMap
        afterRef.current = afterMap

        const compare = new MaplibreCompare(beforeMap, afterMap, containerRef.current)
        compareRef.current = compare

        return () => {
            const slider = containerRef.current?.querySelector('.maplibregl-compare')
            slider?.remove()
            compareRef.current = null
            beforeMap.remove()
            afterMap.remove()
        }
    }, [])

    // Add Raster Layer to both maps - DIPERBAIKI
    useEffect(() => {
        const addRasterLayer = async (map: maplibregl.Map) => {
            if (!map) return

            // Tunggu sampai map benar-benar loaded
            const processLayer = async () => {
                const tilesUrl = epochTilesUrl?.[2021]
                console.log('Tiles URL:', tilesUrl)

                if (!tilesUrl) {
                    console.warn('No tiles URL found for 2021')
                    return
                }

                try {
                    // Check availability
                    const isAvailable = await checkTilesAvailability(tilesUrl)
                    console.log('Tiles available:', isAvailable)

                    if (!isAvailable) {
                        setHasAwsTiles(false)
                        return
                    }

                    // Remove existing layer and source if present
                    if (map.getLayer('sentinel-tiles-layer')) {
                        map.removeLayer('sentinel-tiles-layer')
                    }
                    if (map.getSource('sentinel-tiles-source')) {
                        map.removeSource('sentinel-tiles-source')
                    }

                    // Add source
                    map.addSource('sentinel-tiles-source', {
                        type: 'raster',
                        tiles: [tilesUrl],
                        tileSize: 256,
                        minzoom: 0,
                        maxzoom: 18,
                    })

                    // Add layer - pastikan di bawah vector layers
                    const firstSymbolLayer = map.getStyle().layers?.find(
                        (layer) => layer.type === 'symbol' || layer.type === 'fill'
                    )

                    map.addLayer(
                        {
                            id: 'sentinel-tiles-layer',
                            type: 'raster',
                            source: 'sentinel-tiles-source',
                            paint: {
                                'raster-opacity': showRasterLayer ? rasterOpacity / 100 : 0,
                            },
                        },
                        firstSymbolLayer?.id // Insert before first symbol/fill layer
                    )

                    setHasAwsTiles(true)
                    console.log('Raster layer added successfully')
                } catch (err) {
                    console.error('Error adding raster layer:', err)
                    setHasAwsTiles(false)
                }
            }

            // Pastikan style sudah loaded
            if (map.isStyleLoaded()) {
                await processLayer()
            } else {
                map.once('style.load', processLayer)
            }
        }

        const beforeMap = beforeRef.current
        const afterMap = afterRef.current

        if (beforeMap) {
            addRasterLayer(beforeMap)
        }

        if (afterMap) {
            addRasterLayer(afterMap)
        }
    }, [showRasterLayer, rasterOpacity])

    // Update raster opacity when changed
    useEffect(() => {
        const updateOpacity = (map: maplibregl.Map | null) => {
            if (!map || !map.getLayer('sentinel-tiles-layer')) return

            map.setPaintProperty(
                'sentinel-tiles-layer',
                'raster-opacity',
                showRasterLayer ? rasterOpacity / 100 : 0
            )
        }

        updateOpacity(beforeRef.current)
        updateOpacity(afterRef.current)
    }, [showRasterLayer, rasterOpacity])

    // Before layer
    useEffect(() => {
        const map = beforeRef.current
        if (!map || !hguKiri) {
            if (map?.getLayer('before-fill')) map.removeLayer('before-fill')
            if (map?.getSource('before-layer')) map.removeSource('before-layer')
            return
        }

        const addBeforeLayer = () => {
            if (map.getLayer('before-fill')) map.removeLayer('before-fill')
            if (map.getSource('before-layer')) map.removeSource('before-layer')

            map.addSource('before-layer', { type: 'geojson', data: hguKiri })
            map.addLayer({
                id: 'before-fill',
                type: 'fill',
                source: 'before-layer',
                paint: createPaintV2('nmr_kls', 'id')
            })

            zoomToGeoJSON(hguKiri)
        }

        const zoomToGeoJSON = (geojson: any) => {
            if (!geojson?.features?.length) return

            const bounds = new maplibregl.LngLatBounds()
            geojson.features.forEach((feature: any) => {
                const coords =
                    feature.geometry.type === 'Point'
                        ? [feature.geometry.coordinates]
                        : feature.geometry.type === 'Polygon'
                            ? feature.geometry.coordinates.flat()
                            : feature.geometry.type === 'MultiPolygon'
                                ? feature.geometry.coordinates.flat(2)
                                : []

                coords.forEach(([lng, lat]: any) => bounds.extend([lng, lat]))
            })

            if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40 })
        }

        map.isStyleLoaded() ? addBeforeLayer() : map.once('style.load', addBeforeLayer)
    }, [hguKiri])

    // After layer
    useEffect(() => {
        const map = afterRef.current
        if (!map || !hguKanan) {
            if (map?.getLayer('after-fill')) map.removeLayer('after-fill')
            if (map?.getSource('after-layer')) map.removeSource('after-layer')
            return
        }

        const addAfterLayer = () => {
            if (map.getLayer('after-fill')) map.removeLayer('after-fill')
            if (map.getSource('after-layer')) map.removeSource('after-layer')

            map.addSource('after-layer', { type: 'geojson', data: hguKanan })
            map.addLayer({
                id: 'after-fill',
                type: 'fill',
                source: 'after-layer',
                paint: createPaintV2('nmr_kls', 'id')
            })

            zoomToGeoJSON(hguKanan)
        }

        const zoomToGeoJSON = (geojson: any) => {
            if (!geojson?.features?.length) return

            const bounds = new maplibregl.LngLatBounds()
            geojson.features.forEach((feature: any) => {
                const coords =
                    feature.geometry.type === 'Point'
                        ? [feature.geometry.coordinates]
                        : feature.geometry.type === 'Polygon'
                            ? feature.geometry.coordinates.flat()
                            : feature.geometry.type === 'MultiPolygon'
                                ? feature.geometry.coordinates.flat(2)
                                : []

                coords.forEach(([lng, lat]: any) => bounds.extend([lng, lat]))
            })

            if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, duration: 80, essential: true })
        }

        map.isStyleLoaded() ? addAfterLayer() : map.once('style.load', addAfterLayer)
    }, [hguKanan])

    // Basemap switching - DIPERBAIKI
    type BasemapKey = keyof typeof basemapStyles

    function changeBasemap(
        styleKey: BasemapKey,
        ref: React.MutableRefObject<maplibregl.Map | null>,
        geojsonData?: GeoJSON.FeatureCollection,
        idPrefix?: string
    ) {
        const newStyle = basemapStyles[styleKey]
        const map = ref.current
        if (!map || !newStyle) return

        const center = map.getCenter()
        const zoom = map.getZoom()
        const cachedData = geojsonData

        map.setStyle(newStyle)

        map.once('style.load', async () => {
            // Restore view
            map.setCenter(center)
            map.setZoom(zoom)

            // Re-add raster layer after style change
            const tilesUrl = epochTilesUrl?.[2021]
            console.log(tilesUrl)
            if (tilesUrl && hasAwsTiles) {
                try {
                    // Add source
                    if (!map.getSource('sentinel-tiles-source')) {
                        map.addSource('sentinel-tiles-source', {
                            type: 'raster',
                            tiles: [tilesUrl],
                            tileSize: 256,
                            minzoom: 0,
                            maxzoom: 18,
                        })
                    }

                    // Add layer with proper ordering
                    if (!map.getLayer('sentinel-tiles-layer')) {
                        const firstSymbolLayer = map.getStyle().layers?.find(
                            (layer) => layer.type === 'symbol' || layer.type === 'fill'
                        )

                        map.addLayer(
                            {
                                id: 'sentinel-tiles-layer',
                                type: 'raster',
                                source: 'sentinel-tiles-source',
                                paint: {
                                    'raster-opacity': showRasterLayer ? rasterOpacity / 100 : 0,
                                },
                            },
                            firstSymbolLayer?.id
                        )
                    }
                } catch (err) {
                    console.error('Error re-adding raster layer after basemap change:', err)
                }
            }

            // Re-add vector layer
            if (!cachedData) return

            const layerId = `${idPrefix}-fill`
            const sourceId = `${idPrefix}-layer`

            if (map.getLayer(layerId)) map.removeLayer(layerId)
            if (map.getSource(sourceId)) map.removeSource(sourceId)

            map.addSource(sourceId, { type: 'geojson', data: cachedData })
            map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                paint: createPaintV2('nmr_kls', 'id')
            })
        })
    }

    const onSwitchBasemap = (
        key: BasemapKey,
        target: 'before' | 'after',
        name: string
    ) => {
        if (target === 'before' && beforeRef.current) {
            setBeforeDataName(name)
            changeBasemap(key, beforeRef, hguKiri || undefined, 'before')
        } else if (target === 'after' && afterRef.current) {
            setAfterDataName(name)
            changeBasemap(key, afterRef, hguKanan || undefined, 'after')
        }
    }

    return (
        <div className="relative w-full h-full shadow-lg">
            <div ref={containerRef} className="absolute inset-0 overflow-hidden" />
        </div>
    )
}
