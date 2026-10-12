'use client'
import { LandCoverClass } from "@/constant/landcover.constant";
import { useEffect, useRef } from "react";

export default function LandCoverSumutChart({ data, currentEpoch }: { data: any, currentEpoch: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !data) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Chart dimensions
        const padding = { top: 40, right: 20, bottom: 60, left: 60 };
        const chartWidth = rect.width - padding.left - padding.right;
        const chartHeight = rect.height - padding.top - padding.bottom;

        // Get years and calculate max value
        const years = Object.keys(data).sort();
        const maxValue = Math.max(...years.map(year => {
            return Object.values(data[year] as any).reduce((sum: number, val: any) => sum + val, 0);
        }));

        // Draw Y-axis labels and grid
        ctx.strokeStyle = '#374151';
        ctx.fillStyle = '#9ca3af';
        ctx.font = '11px sans-serif';
        ctx.lineWidth = 1;

        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const value = (maxValue / ySteps) * i;
            const y = padding.top + chartHeight - (chartHeight / ySteps) * i;

            // Grid line
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            // Label
            const label = (value / 1000000).toFixed(1) + 'M';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, padding.left - 10, y);
        }

        // Draw bars
        const barWidth = chartWidth / years.length * 0.7;
        const barSpacing = chartWidth / years.length;

        years.forEach((year, index) => {
            const yearData = data[year];
            const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2;
            let currentY = padding.top + chartHeight;

            // Draw stacked segments
            Object.entries(LandCoverClass).forEach(([key, landCover]) => {
                const value = yearData[landCover.id] || 0;
                const segmentHeight = (value / maxValue) * chartHeight;

                if (segmentHeight > 0) {
                    ctx.fillStyle = landCover.color;
                    ctx.fillRect(x, currentY - segmentHeight, barWidth, segmentHeight);
                    currentY -= segmentHeight;
                }
            });

            // Highlight current epoch
            if (parseInt(year) === currentEpoch) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.strokeRect(x - 2, padding.top, barWidth + 4, chartHeight);
            }

            // Draw year label
            ctx.fillStyle = parseInt(year) === currentEpoch ? '#ffffff' : '#9ca3af';
            ctx.font = parseInt(year) === currentEpoch ? 'bold 12px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(year, x + barWidth / 2, padding.top + chartHeight + 10);
        });

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Land Cover Distribution (Hectares)', rect.width / 2, 20);

        // Draw Y-axis label
        ctx.save();
        ctx.translate(20, rect.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText('Hectares', 0, 0);
        ctx.restore();

    }, [data, currentEpoch]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
        />
    );
};