'use client';
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Button, Card, CardBody, CardHeader, Select, SelectItem } from "@heroui/react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import sumutConstant from "../sumut/constant/sumut.constant";
import { ChartBar, ChevronLeft, ChevronRightIcon } from "lucide-react";
const AcehMap = dynamic(() => import("@/components/UGM/aceh/AcehMap"), {
    ssr: false,
});
const DATA = sumutConstant.data_luasan_aceh
const COLORS = sumutConstant.classColor
export default function AcehView() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState("2025.shp");
    const [chartKey, setChartKey] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile screen
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Force re-render charts after transition
    useEffect(() => {
        const timer = setTimeout(() => {
            setChartKey(prev => prev + 1);
        }, 600);

        return () => clearTimeout(timer);
    }, [isSidebarOpen]);

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const sidebar = document.getElementById('mobile-sidebar');
            const toggleButton = document.getElementById('toggle-button');

            if (isMobile && isSidebarOpen && sidebar && toggleButton) {
                if (!sidebar.contains(event.target as Node) && !toggleButton.contains(event.target as Node)) {
                    setIsSidebarOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSidebarOpen, isMobile]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobile && isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isSidebarOpen, isMobile]);

    // Prepare stacked bar chart data
    const stackedBarData = DATA.map((yearData) => {
        const year = yearData.nama_shp.replace('.shp', '');
        const dataPoint: any = { year };

        yearData.data.forEach((item) => {
            dataPoint[item.kelas] = Math.round(item.luas_ha);
        });

        return dataPoint;
    });

    // Prepare pie chart data (selected year) - Sorted by value descending
    const pieChartData = DATA.find(d => d.nama_shp === selectedYear)?.data
        .map(item => ({
            name: item.kelas,
            value: Math.round(item.luas_ha)
        }))
        .sort((a, b) => b.value - a.value) || [];

    const years = DATA.map(d => ({ key: d.nama_shp, label: d.nama_shp.replace('.shp', '') }));

    // Format Y-axis
    const formatYAxis = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(0)}M`;
        }
        return value.toLocaleString();
    };

    // Format number for display
    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('id-ID').format(value);
    };

    // Custom label for pie chart
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (percent < 0.05) return null;

        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize={11}
                fontWeight="500"
            >
                {`${(percent * 100).toFixed(1)}%`}
            </text>
        );
    };

    const handleToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Render Charts Component (reusable for both desktop and mobile)
    const ChartsContent = ({ isMobileView = false }: { isMobileView?: boolean }) => (
        <div className="space-y-4">
            {/* Pie Chart */}
            <Card className="bg-gray-800/50 border-gray-700/50">
                <CardHeader className={`pb-0 ${isMobileView ? 'pt-3 px-3' : 'pt-4 px-4'} flex-col items-start`}>
                    <h4 className={`font-bold ${isMobileView ? 'text-base' : 'text-large'} text-white`}>
                        Distribusi Luas per Kelas
                    </h4>
                    <Select
                        label="Pilih Tahun"
                        selectedKeys={[selectedYear]}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="mt-2 w-full"
                        size="sm"
                        variant="faded"
                    >
                        {years.map((year) => (
                            <SelectItem key={year.key}>
                                {year.label}
                            </SelectItem>
                        ))}
                    </Select>
                </CardHeader>
                <CardBody className={isMobileView ? 'p-3' : 'px-4 pb-4'}>
                    <div style={{ width: '100%', height: isMobileView ? 300 : 450 }}>
                        <ResponsiveContainer key={`pie-${isMobileView ? 'mobile' : 'desktop'}-${chartKey}-${selectedYear}`}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy={isMobileView ? "50%" : "45%"}
                                    labelLine={false}
                                    label={renderCustomLabel}
                                    outerRadius={isMobileView ? 80 : 110}
                                    innerRadius={isMobileView ? 25 : 30}
                                    fill="#8884d8"
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                    stroke="#1f2937"
                                    strokeWidth={isMobileView ? 1 : 2}
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[entry.name as keyof typeof COLORS]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any, name: any) => [
                                        `${formatNumber(value)} ha`,
                                        name
                                    ]}
                                    contentStyle={{
                                        backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        color: '#FFFFFF',
                                        fontSize: isMobileView ? '11px' : '12px'
                                    }}
                                    labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#FFFFFF' }}
                                />
                                {!isMobileView && (
                                    <Legend
                                        wrapperStyle={{
                                            fontSize: '11px',
                                            color: '#9ca3af',
                                            paddingTop: '10px'
                                        }}
                                        layout="horizontal"
                                        align="center"
                                        verticalAlign="bottom"
                                        iconType="circle"
                                    />
                                )}
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Data Summary Table */}
                    <div className={`mt-${isMobileView ? '3' : '4'} space-y-${isMobileView ? '1' : '2'} max-h-${isMobileView ? '40' : '48'} overflow-y-auto`}>
                        <h5 className="text-sm font-semibold text-gray-300 mb-2">
                            Detail Data ({selectedYear.replace('.shp', '')})
                        </h5>
                        {pieChartData.slice(0, isMobileView ? 5 : pieChartData.length).map((item, index) => (
                            <div key={index} className="flex justify-between items-center py-1 px-2 bg-gray-700/30 rounded text-xs">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`${isMobileView ? 'w-2 h-2' : 'w-3 h-3'} rounded-full`}
                                        style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] }}
                                    />
                                    <span className="text-gray-300">{item.name}</span>
                                </div>
                                <span className="text-white font-mono">
                                    {formatNumber(item.value)} ha
                                </span>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Bar Chart */}
            <Card className="bg-gray-800/50 border-gray-700/50">
                <CardHeader className={`pb-0 ${isMobileView ? 'pt-3 px-3' : 'pt-4 px-4'} flex-col items-start`}>
                    <h4 className={`font-bold ${isMobileView ? 'text-base' : 'text-large'} text-white`}>
                        {isMobileView ? 'Trend Luas Lahan' : 'Luas Lahan per Tahun'}
                    </h4>
                    <small className="text-gray-400">{isMobileView ? '2021-2025' : 'Hectares (2021-2025)'}</small>
                </CardHeader>
                <CardBody className={isMobileView ? 'p-3' : 'px-4 pb-4'}>
                    <div style={{ width: '100%', height: isMobileView ? 250 : 400 }}>
                        <ResponsiveContainer key={`bar-${isMobileView ? 'mobile' : 'desktop'}-${chartKey}`}>
                            <BarChart data={stackedBarData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="year"
                                    fontSize={isMobileView ? 10 : 12}
                                    tick={{ fill: '#9ca3af' }}
                                    stroke="#6b7280"
                                />
                                <YAxis
                                    label={!isMobileView ? {
                                        value: 'Hectares',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: { fill: '#9ca3af' }
                                    } : undefined}
                                    fontSize={isMobileView ? 9 : 11}
                                    tick={{ fill: '#9ca3af' }}
                                    tickFormatter={formatYAxis}
                                    stroke="#6b7280"
                                />
                                <Tooltip
                                    formatter={(value: any) => formatNumber(value) + ' ha'}
                                    contentStyle={{
                                        backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        color: '#f3f4f6',
                                        fontSize: '11px'
                                    }}
                                    labelStyle={{ color: '#f3f4f6' }}
                                />
                                {!isMobileView && (
                                    <Legend
                                        wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
                                        iconType="rect"
                                    />
                                )}
                                <Bar dataKey="Vegetasi Tinggi" stackId="a" fill={COLORS["Vegetasi Tinggi"]} />
                                <Bar dataKey="Sawit" stackId="a" fill={COLORS["Sawit"]} />
                                <Bar dataKey="Vegetasi Rendah" stackId="a" fill={COLORS["Vegetasi Rendah"]} />
                                <Bar dataKey="Tanah Terbuka" stackId="a" fill={COLORS["Tanah Terbuka"]} />
                                <Bar dataKey="Perkebunan Lain" stackId="a" fill={COLORS["Perkebunan Lain"]} />
                                <Bar dataKey="Emplacement" stackId="a" fill={COLORS["Emplacement"]} />
                                <Bar dataKey="Badan Air" stackId="a" fill={COLORS["Badan Air"]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardBody>
            </Card>
        </div>
    );

    return (
        <div className="h-full w-full flex relative bg-black">
            {/* Desktop Sidebar */}
            <div
                className={`
                    hidden md:block
                    fixed left-0 top-0 h-full z-[90]
                    bg-gray-900/95 backdrop-blur-md border-r border-gray-700/50
                    transition-transform duration-500 ease-in-out
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
                style={{ width: '384px' }}
            >
                <div className="h-full p-4 overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4 text-white">Dashboard Analisis</h2>
                    <ChartsContent />
                </div>
            </div>

            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[80] md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar - Slide from bottom */}
            <div
                id="mobile-sidebar"
                className={`
                    md:hidden
                    fixed inset-x-0 bottom-0 z-[90]
                    bg-gray-900/98 backdrop-blur-md border-t border-gray-700/50
                    transition-transform duration-500 ease-in-out
                    ${isSidebarOpen ? 'translate-y-0' : 'translate-y-full'}
                    rounded-t-2xl
                    shadow-2xl
                `}
                style={{
                    maxHeight: '85vh',
                    height: 'auto'
                }}
            >
                {/* Mobile Drag Handle */}
                <div className="flex justify-center py-3 border-b border-gray-700/50 cursor-pointer" onClick={() => setIsSidebarOpen(false)}>
                    <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
                </div>

                <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 60px)' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white">Dashboard Analisis</h2>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-gray-400 hover:text-white"
                            onPress={() => setIsSidebarOpen(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>

                    <ChartsContent isMobileView={true} />
                </div>
            </div>

            {/* Toggle Button - Responsive */}
            <Button
                id="toggle-button"
                isIconOnly
                size="sm"
                className={`
                    fixed z-[100]
                    transition-all duration-500 ease-in-out
                    bg-gray-800/90 hover:bg-gray-700/90 
                    border border-gray-700/50 hover:border-gray-600/70
                    text-white hover:text-gray-200
                    shadow-lg hover:shadow-xl
                    backdrop-blur-sm
                    
                    /* Desktop styles */
                    md:top-1/2 md:-translate-y-1/2 md:w-8 md:h-12 md:rounded-r-lg md:rounded-l-none
                    
                    /* Mobile styles */
                    top-20 right-4 w-12 h-12 rounded-full
                    md:bottom-auto md:right-auto
                `}
                style={{
                    left: !isMobile && isSidebarOpen ? '384px' : !isMobile ? '0px' : 'auto'
                }}
                onPress={handleToggleSidebar}
            >
                <div className="transition-transform duration-300">
                    {/* Desktop Icons */}
                    <div className="hidden md:block">
                        {isSidebarOpen ? (
                            <ChevronLeft />
                        ) : (
                            <ChevronRightIcon />
                        )}
                    </div>

                    {/* Mobile Icon */}
                    <div className="md:hidden">
                        <ChartBar />
                    </div>
                </div>
            </Button>

            {/* Main Content - Responsive margin */}
            <main
                className={`
                    flex-1 overflow-auto flex flex-col transition-all duration-500 ease-in-out
                    ${!isMobile && isSidebarOpen ? 'ml-96' : 'ml-0'}
                `}
            >
                <AcehMap />
            </main>
        </div >
    );
}
