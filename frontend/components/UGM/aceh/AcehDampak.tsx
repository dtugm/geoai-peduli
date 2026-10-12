'use client';
import dynamic from "next/dynamic";
import { Button, Card, CardBody, CardHeader, Switch, Slider } from "@heroui/react";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Calendar, ChevronLeft, ChevronRight, Eye, EyeOff, Layers } from "lucide-react";
import { epochPbfTilesUrl, epochTilesUrl } from "../sumut/MapClass";
import { useSumutComparisonStore } from "@/store/ugm/sumutComparison.store";
import Link from "next/link";
import { LandCoverOptions } from "@/constant/landcover.constant";
import CollapsableLegends from "@/components/app/card/CollapsableLegends";

const AcehDampakMap = dynamic(() => import("@/components/UGM/aceh/AcehDampakMap"), {
    ssr: false,
});

export default function AcehDampakView() {
    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const [selectedEpochLeft, setSelectedEpochLeft] = useState<number | null>(2021);
    const [selectedEpochRight, setSelectedEpochRight] = useState<number | null>(2022);
    const [showOverlays, setShowOverlays] = useState(false);

    // Layer visibility and opacity states
    const [leftLayerVisible, setLeftLayerVisible] = useState(true);
    const [rightLayerVisible, setRightLayerVisible] = useState(true);
    const [leftOpacity, setLeftOpacity] = useState(100);
    const [rightOpacity, setRightOpacity] = useState(100);

    // Raster layer visibility and opacity states
    const [leftRasterVisible, setLeftRasterVisible] = useState(true);
    const [rightRasterVisible, setRightRasterVisible] = useState(true);
    const [leftRasterOpacity, setLeftRasterOpacity] = useState(100);
    const [rightRasterOpacity, setRightRasterOpacity] = useState(100);

    const { setTutupanKiri, setTutupanKanan, setBasemapKiri, setBasemapKanan } = useSumutComparisonStore()

    // Trigger animations on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowOverlays(true);
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const selectEpochKiri = (year: number) => {
        setSelectedEpochLeft(year)
        setBasemapKiri(epochTilesUrl[year])
        setTutupanKiri(epochPbfTilesUrl[year])
        setLeftOpen(false) // Auto close on mobile after selection
    }
    const selectEpochKanan = (year: number) => {
        setSelectedEpochRight(year)
        setBasemapKanan(epochTilesUrl[year])
        setTutupanKanan(epochPbfTilesUrl[year])
        setRightOpen(false) // Auto close on mobile after selection
    }

    return (
        <div className="h-full w-full relative">
            {/* <div
                className={`absolute right-2 top-2 z-40 transition-all duration-500 ease-out ${showOverlays
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-full opacity-0'
                    }`}
                style={{ transitionDelay: '100ms' }}
            >

                <CollapsableLegends
                    title="Legend Tutupan Lahan"
                    position="right"
                    items={LandCoverOptions}
                />
            </div> */}
            {/* Main Content - Map (Full Width) */}
            <main className="h-full w-full overflow-auto">
                <AcehDampakMap
                    leftLayerVisible={leftLayerVisible}
                    rightLayerVisible={rightLayerVisible}
                    leftOpacity={leftOpacity / 100}
                    rightOpacity={rightOpacity / 100}
                    leftRasterVisible={leftRasterVisible}
                    rightRasterVisible={rightRasterVisible}
                    leftRasterOpacity={leftRasterOpacity / 100}
                    rightRasterOpacity={rightRasterOpacity / 100}
                />
            </main>

            {/* Back Button - Top Left Corner - Fade in */}
            <div
                className={`absolute left-2 top-4 z-10 pointer-events-auto transition-all duration-500 ease-out ${showOverlays
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-8 opacity-0'
                    }`}
                style={{ transitionDelay: '100ms' }}
            >
                <div className="flex gap-2">

                    <Link href="/aceh" className="md:flex">
                        <Button
                            isIconOnly
                            size="sm"
                            className="bg-black/60 text-white shadow-lg hover:shadow-xl transition-shadow"
                            endContent={<ArrowLeft size={16} />}
                        >
                        </Button>
                    </Link>
                    <CollapsableLegends
                        title="Legend Tutupan Lahan"

                        items={LandCoverOptions}
                    />
                </div>
            </div>

            {/* Year Display with Controls - Bottom Corners - Slide up */}
            <div
                className={`absolute bottom-4 left-2 right-2 z-10 pointer-events-auto flex justify-between items-end gap-2 md:bottom-6 md:left-4 md:right-4 transition-all duration-500 ease-out ${showOverlays
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-full opacity-0'
                    }`}
            >
                {/* Left Year Display with Controls */}
                <div
                    className="bg-gray-900/90 text-white rounded-lg shadow-lg backdrop-blur-sm"
                    style={{ transitionDelay: '200ms' }}
                >
                    <div className="px-3 py-2 md:px-4 md:py-2.5 border-b border-gray-700">
                        <p className="text-xs md:text-sm font-medium whitespace-nowrap w-[200px]">
                            Layer Before
                        </p>
                    </div>
                    <div className="px-3 py-2 md:px-4 md:py-3 space-y-3">
                        {/* Vector Layer Controls */}
                        <div className="space-y-2 pb-2 border-b border-gray-700">
                            <p className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <Layers size={12} />
                                Vector Layer
                            </p>
                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {leftLayerVisible ? <Eye size={14} className="text-blue-400" /> : <EyeOff size={14} className="text-gray-500" />}
                                    <span className="text-xs">Visible</span>
                                </div>
                                <Switch
                                    size="sm"
                                    isSelected={leftLayerVisible}
                                    onValueChange={setLeftLayerVisible}
                                    classNames={{
                                        wrapper: "group-data-[selected=true]:bg-primary"
                                    }}
                                />
                            </div>
                            {/* Opacity Slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">Opacity</span>
                                    <span className="text-xs font-medium">{leftOpacity}%</span>
                                </div>
                                <Slider
                                    size="sm"
                                    step={5}
                                    minValue={0}
                                    maxValue={100}
                                    value={leftOpacity}
                                    onChange={(value) => setLeftOpacity(value as number)}
                                    className="max-w-full"
                                    classNames={{
                                        base: "max-w-full",
                                        label: "text-sm font-medium mb-4",
                                        track: "bg-gray-700 h-2",
                                        filler: "bg-gradient-to-r from-primary to-brand",
                                        thumb: "bg-brand border-2 border-primary w-5 h-5",
                                        mark: "bg-gray-600",
                                        step: "data-[in-range=true]:bg-primary/30"
                                    }}
                                    isDisabled={!leftLayerVisible}
                                />
                            </div>
                        </div>

                        {/* Raster Layer Controls */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <Layers size={12} />
                                Raster Layer
                            </p>
                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {leftRasterVisible ? <Eye size={14} className="text-purple-400" /> : <EyeOff size={14} className="text-gray-500" />}
                                    <span className="text-xs">Visible</span>
                                </div>
                                <Switch
                                    size="sm"
                                    isSelected={leftRasterVisible}
                                    onValueChange={setLeftRasterVisible}
                                    classNames={{
                                        wrapper: "group-data-[selected=true]:bg-primary"
                                    }}
                                />
                            </div>
                            {/* Opacity Slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">Opacity</span>
                                    <span className="text-xs font-medium">{leftRasterOpacity}%</span>
                                </div>
                                <Slider
                                    size="sm"
                                    step={5}
                                    minValue={0}
                                    maxValue={100}
                                    value={leftRasterOpacity}
                                    onChange={(value) => setLeftRasterOpacity(value as number)}
                                    className="max-w-full"
                                    classNames={{
                                        base: "max-w-full",
                                        label: "text-sm font-medium mb-4",
                                        track: "bg-gray-700 h-2",
                                        filler: "bg-gradient-to-r from-purple-500 to-pink-500",
                                        thumb: "bg-pink-500 border-2 border-purple-500 w-5 h-5",
                                        mark: "bg-gray-600",
                                        step: "data-[in-range=true]:bg-purple-500/30"
                                    }}
                                    isDisabled={!leftRasterVisible}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Year Display with Controls */}
                <div
                    className="bg-gray-900/90 text-white rounded-lg shadow-lg backdrop-blur-sm"
                    style={{ transitionDelay: '300ms' }}
                >
                    <div className="px-3 py-2 md:px-4 md:py-2.5 border-b border-gray-700">
                        <p className="text-xs md:text-sm font-medium whitespace-nowrap w-[200px]">
                            Layer After
                        </p>
                    </div>
                    <div className="px-3 py-2 md:px-4 md:py-3 space-y-3">
                        {/* Vector Layer Controls */}
                        <div className="space-y-2 pb-2 border-b border-gray-700">
                            <p className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <Layers size={12} />
                                Vector Layer
                            </p>
                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {rightLayerVisible ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} className="text-gray-500" />}
                                    <span className="text-xs">Visible</span>
                                </div>
                                <Switch
                                    size="sm"
                                    isSelected={rightLayerVisible}
                                    onValueChange={setRightLayerVisible}
                                    classNames={{
                                        wrapper: "group-data-[selected=true]:bg-primary"
                                    }}
                                />
                            </div>
                            {/* Opacity Slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">Opacity</span>
                                    <span className="text-xs font-medium">{rightOpacity}%</span>
                                </div>
                                <Slider
                                    size="sm"
                                    step={5}
                                    minValue={0}
                                    maxValue={100}
                                    value={rightOpacity}
                                    onChange={(value) => setRightOpacity(value as number)}
                                    className="max-w-full"
                                    classNames={{
                                        base: "max-w-full",
                                        label: "text-sm font-medium mb-4",
                                        track: "bg-gray-700 h-2",
                                        filler: "bg-gradient-to-r from-primary to-brand",
                                        thumb: "bg-brand border-2 border-primary w-5 h-5",
                                        mark: "bg-gray-600",
                                        step: "data-[in-range=true]:bg-primary/30"
                                    }}
                                    isDisabled={!rightLayerVisible}
                                />
                            </div>
                        </div>

                        {/* Raster Layer Controls */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                                <Layers size={12} />
                                Raster Layer
                            </p>
                            {/* Visibility Toggle */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {rightRasterVisible ? <Eye size={14} className="text-purple-400" /> : <EyeOff size={14} className="text-gray-500" />}
                                    <span className="text-xs">Visible</span>
                                </div>
                                <Switch
                                    size="sm"
                                    isSelected={rightRasterVisible}
                                    onValueChange={setRightRasterVisible}
                                    classNames={{
                                        wrapper: "group-data-[selected=true]:bg-primary"
                                    }}
                                />
                            </div>
                            {/* Opacity Slider */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">Opacity</span>
                                    <span className="text-xs font-medium">{rightRasterOpacity}%</span>
                                </div>
                                <Slider
                                    size="sm"
                                    step={5}
                                    minValue={0}
                                    maxValue={100}
                                    value={rightRasterOpacity}
                                    onChange={(value) => setRightRasterOpacity(value as number)}
                                    className="max-w-full"
                                    classNames={{
                                        base: "max-w-full",
                                        label: "text-sm font-medium mb-4",
                                        track: "bg-gray-700 h-2",
                                        filler: "bg-gradient-to-r from-purple-500 to-pink-500",
                                        thumb: "bg-pink-500 border-2 border-purple-500 w-5 h-5",
                                        mark: "bg-gray-600",
                                        step: "data-[in-range=true]:bg-purple-500/30"
                                    }}
                                    isDisabled={!rightRasterVisible}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Mobile Toggle Buttons - Bottom Center - Fade in */}
            <div
                className={`md:hidden absolute bottom-[180px] left-1/2 -translate-x-1/2 flex justify-between w-full px-5 z-30 transition-all duration-500 ease-out ${showOverlays
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-8 opacity-0'
                    }`}
                style={{ transitionDelay: '400ms' }}
            >
                <Button
                    isIconOnly
                    size="lg"
                    className={`${leftOpen ? 'bg-primary' : 'bg-gray-800/80'} text-white shadow-lg backdrop-blur-sm transition-all`}
                    onPress={() => {
                        setLeftOpen(!leftOpen);
                        setRightOpen(false);
                    }}
                >
                    <ChevronRight size={20} />
                </Button>
                <Button
                    isIconOnly
                    size="lg"
                    className={`${rightOpen ? 'bg-primary' : 'bg-gray-800/80'} text-white shadow-lg backdrop-blur-sm transition-all`}
                    onPress={() => {
                        setRightOpen(!rightOpen);
                        setLeftOpen(false);
                    }}
                >
                    <ChevronLeft size={20} />
                </Button>
            </div>

        </div>
    );
}
