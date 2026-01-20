'use client';

import { useEffect, useRef } from 'react';
import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    CategoryScale,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { PricePoint } from '@/lib/api';

// Register Chart.js components
Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    CategoryScale,
    Filler,
    Tooltip,
    Legend
);

interface PriceChartProps {
    data: PricePoint[];
}

export function PriceChart({ data }: PriceChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Destroy existing chart
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(30, 64, 175, 0.2)');
        gradient.addColorStop(1, 'rgba(30, 64, 175, 0)');

        // Prepare data
        const chartData = data.map(point => ({
            x: new Date(point.time),
            y: point.price,
        }));

        // Calculate min/max for better Y axis
        const prices = data.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const padding = (maxPrice - minPrice) * 0.1 || 10;

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Price',
                        data: chartData,
                        borderColor: '#1E40AF',
                        backgroundColor: gradient,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#1E40AF',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: '#1F2937',
                        titleFont: {
                            size: 12,
                        },
                        bodyFont: {
                            size: 14,
                            weight: 'bold',
                        },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (context) => {
                                const xValue = context[0]?.parsed?.x;
                                if (xValue == null) return '';
                                const date = new Date(xValue);
                                return date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                });
                            },
                            label: (context) => `€${(context.parsed?.y ?? 0).toFixed(2)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: data.length > 90 ? 'month' : data.length > 30 ? 'week' : 'day',
                            displayFormats: {
                                day: 'MMM d',
                                week: 'MMM d',
                                month: 'MMM yyyy',
                            },
                        },
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: '#9CA3AF',
                            font: {
                                size: 11,
                            },
                            maxTicksLimit: 8,
                        },
                    },
                    y: {
                        min: minPrice - padding,
                        max: maxPrice + padding,
                        grid: {
                            color: '#F3F4F6',
                        },
                        ticks: {
                            color: '#9CA3AF',
                            font: {
                                size: 11,
                            },
                            callback: (value) => `€${Number(value).toFixed(0)}`,
                        },
                    },
                },
            },
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data]);

    if (data.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                No price history data available
            </div>
        );
    }

    return <canvas ref={canvasRef} />;
}

export default PriceChart;
