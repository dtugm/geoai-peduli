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

const SumutComparisonMap = dynamic(() => import("@/components/UGM/SumutEpochDifference/SumutComparisonMap"), {
    ssr: false,
});

export default function SumutComparisonView() {
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
            {/* Left Sidebar - Overlay */}
            <div className={`bg-transparent absolute left-0 top-0 h-full transition-transform duration-300 z-20 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Card className="bg-gray-900/95 md:bg-gray-900/50 text-white backdrop-blur-lg w-full md:w-80 h-full md:h-auto rounded-none md:rounded-lg shadow-xl md:top-1/6 md:ml-2">
                    <CardHeader className="flex justify-between items-center border-b border-gray-700">
                        <h3 className="text-lg font-semibold">Left Epoch</h3>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="md:hidden bg-gradient-to-r from-primary to-brand text-white"
                            onPress={() => setLeftOpen(false)}
                        >
                            <ChevronLeft size={20} />
                        </Button>
                    </CardHeader>
                    <CardBody className="overflow-auto p-3 md:p-4">
                        <div className="space-y-2">
                            {Object.keys(epochPbfTilesUrl).map((year) => {
                                const yearNum = Number(year);
                                const isSelected = selectedEpochLeft === yearNum;

                                return (
                                    <Card
                                        key={year}
                                        isPressable
                                        isHoverable
                                        className={`w-full transition-all duration-200 cursor-pointer ${isSelected
                                            ? 'bg-gradient-to-r from-primary to-brand border-2 border-blue-400'
                                            : 'bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600'
                                            }`}
                                        onPress={() => selectEpochKiri(yearNum)}
                                    >
                                        <CardBody className="p-3 md:p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Calendar size={18} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                                    <div>
                                                        <p className={`font-semibold text-sm md:text-base ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                                            Epoch {year}
                                                        </p>
                                                        <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                                                            Tutupan Lahan Sumut {year}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                )}
                                            </div>
                                        </CardBody>
                                    </Card>
                                );
                            })}
                        </div>
                    </CardBody>
                </Card>
                <Button
                    isIconOnly
                    size="sm"
                    className={`bg-gradient-to-r from-primary to-brand text-white absolute -right-6 top-1/2 -translate-y-1/2 z-10 shadow-lg rounded-r-4xl rounded-l-lg py-6 hidden md:flex transition-all duration-500 ease-out ${showOverlays
                        ? 'translate-x-0 opacity-100'
                        : '-translate-x-full opacity-0'
                        }`}
                    style={{ transitionDelay: '400ms' }}
                    onPress={() => setLeftOpen(!leftOpen)}
                >
                    {leftOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </Button>
            </div>
            {/* Right Sidebar - Overlay */}
            <div className={`absolute right-0 top-0 h-full transition-transform duration-300 z-20 ${rightOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <Card className="bg-gray-900/95 md:bg-gray-900/50 text-white backdrop-blur-lg w-full md:w-80 h-full md:h-auto rounded-none md:rounded-lg shadow-xl md:top-1/6 md:mr-2">
                    <CardHeader className="flex justify-between items-center border-b border-gray-700">
                        <h3 className="text-lg font-semibold">Right Epoch</h3>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="bg-gradient-to-r from-primary to-brand text-white md:hidden"
                            onPress={() => setRightOpen(false)}
                        >
                            <ChevronRight size={20} />
                        </Button>
                    </CardHeader>
                    <CardBody className="overflow-auto p-3 md:p-4">
                        <div className="space-y-2">
                            {Object.keys(epochPbfTilesUrl).map((year) => {
                                const yearNum = Number(year);
                                const isSelected = selectedEpochRight === yearNum;

                                return (
                                    <Card
                                        key={year}
                                        isPressable
                                        isHoverable
                                        className={`w-full transition-all duration-200 cursor-pointer ${isSelected
                                            ? 'bg-gradient-to-r from-primary to-brand border-2 border-blue-400'
                                            : 'bg-gray-800/70 hover:bg-gray-700/70 border border-gray-600'
                                            }`}
                                        onPress={() => selectEpochKanan(yearNum)}
                                    >
                                        <CardBody className="p-3 md:p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Calendar size={18} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                                    <div>
                                                        <p className={`font-semibold text-sm md:text-base ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                                                            Epoch {year}
                                                        </p>
                                                        <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                                                            Tutupan Lahan Sumut {year}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                )}
                                            </div>
                                        </CardBody>
                                    </Card>
                                );
                            })}
                        </div>
                    </CardBody>
                </Card>

                {/* Toggle Button Right */}
                <Button
                    isIconOnly
                    size="sm"
                    className={`bg-gradient-to-r from-primary to-brand text-white absolute -left-6 top-1/2 -translate-y-1/2 z-10 shadow-lg rounded-l-4xl rounded-r-lg py-6 hidden md:flex transition-all duration-500 ease-out ${showOverlays
                        ? 'translate-x-0 opacity-100'
                        : 'translate-x-full opacity-0'
                        }`}
                    style={{ transitionDelay: '400ms' }}
                    onPress={() => setRightOpen(!rightOpen)}
                >
                    {rightOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </Button>
            </div>
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
            <main className="h-full w-full overflow-auto pointer-events-auto">
                <SumutComparisonMap
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
                className={`absolute left-2 top-2 z-10 pointer-events-auto transition-all duration-500 ease-out ${showOverlays
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-8 opacity-0'
                    }`}
                style={{ transitionDelay: '100ms' }}
            >
                <div className="flex gap-2">

                    <Link href="/sumut" className="md:flex">
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
                className={`absolute bottom-4 left-2 right-2 z-10 flex justify-between items-end gap-2 md:bottom-6 md:left-4 md:right-4 transition-all duration-500 ease-out pointer-events-none ${showOverlays
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-full opacity-0'
                    }`}
            >
                {/* Left Year Display with Controls */}
                <div
                    className="bg-gray-900/90 text-white rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto"
                    style={{ transitionDelay: '200ms' }}
                >
                    <div className="px-3 py-2 md:px-4 md:py-2.5 border-b border-gray-700">
                        <p className="text-xs md:text-sm font-medium whitespace-nowrap">
                            Tutupan Lahan Sumut {selectedEpochLeft || '-'}
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
                    className="bg-gray-900/90 text-white rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto"
                    style={{ transitionDelay: '300ms' }}
                >
                    <div className="px-3 py-2 md:px-4 md:py-2.5 border-b border-gray-700">
                        <p className="text-xs md:text-sm font-medium whitespace-nowrap">
                            Tutupan Lahan Sumut {selectedEpochRight || '-'}
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
