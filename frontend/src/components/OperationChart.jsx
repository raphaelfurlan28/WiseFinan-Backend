import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './StockDetail.css'; // Reusing styling

const CHART_TIMEFRAMES = [
    { label: '15m', range: '1mo', interval: '15m' },
    { label: '1D', range: '6mo', interval: '1d' },
    { label: '1S', range: '1y', interval: '1wk' },
    { label: '1M', range: '5y', interval: '1mo' },
];

export default function OperationChart({ operation }) {
    const { option, type, stock, strategy } = operation;
    const ticker = stock?.ticker || option?.ticker?.substring(0, 4) + '3'; // Fallback approximation
    const [chartTimeframe, setChartTimeframe] = useState(CHART_TIMEFRAMES[1]); // Default 1D
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState(null);
    const [chartData, setChartData] = useState(null);
    const chartContainerRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const fetchChartData = useCallback(async () => {
        if (!ticker) return;
        setChartLoading(true);
        setChartError(null);
        try {
            const url = getApiUrl(`/api/chart/${ticker}?range=${chartTimeframe.range}&interval=${chartTimeframe.interval}`);
            const res = await fetch(url);
            const data = await res.json();
            if (data.error || !data.candles || data.candles.length === 0) {
                setChartError(data.error || 'Sem dados disponíveis.');
                setChartData(null);
            } else {
                setChartData(data);
            }
        } catch (err) {
            console.error('Chart fetch error:', err);
            setChartError('Erro ao buscar dados.');
            setChartData(null);
        } finally {
            setChartLoading(false);
        }
    }, [ticker, chartTimeframe]);

    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    useEffect(() => {
        if (!chartContainerRef.current || !chartData || !chartData.candles.length) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.remove();
            chartInstanceRef.current = null;
        }

        const container = chartContainerRef.current;
        const chart = createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { color: 'transparent' },
                textColor: '#64748b',
                fontSize: 11,
                fontFamily: "'Inter', -apple-system, sans-serif",
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            crosshair: {
                mode: 0,
                vertLine: { color: 'rgba(255, 255, 255, 0.4)', width: 1, style: 2, labelBackgroundColor: '#334155' },
                horzLine: { color: 'rgba(255, 255, 255, 0.4)', width: 1, style: 2, labelBackgroundColor: '#334155' },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.06)',
                scaleMargins: { top: 0.1, bottom: 0.25 },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.06)',
                timeVisible: chartTimeframe.interval === '15m',
                secondsVisible: false,
                rightOffset: 3,
                barSpacing: 6,
            },
            handleScroll: { vertTouchDrag: false },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#4ade80', downColor: '#ef4444',
            borderUpColor: '#4ade80', borderDownColor: '#ef4444',
            wickUpColor: '#4ade80', wickDownColor: '#ef4444',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#94a3b8', priceFormat: { type: 'volume' }, priceScaleId: 'volume',
        });

        // Map data directly using the pre-formatted time from the backend
        const mappedCandles = chartData.candles.map(c => ({
            time: c.time,
            open: c.open, high: c.high, low: c.low, close: c.close
        }));

        const mappedVolume = chartData.candles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'
        }));

        candleSeries.setData(mappedCandles);
        volumeSeries.setData(mappedVolume);

        // ==== STRATEGY LINES (Strike & Breakeven) ====
        const strikeVal = parseFloat(String(option.strike).replace(',', '.')) || 0;
        const premium = option.last_price || 0;

        if (strikeVal > 0) {
            // Draw Strike Line (Yellow)
            candleSeries.createPriceLine({
                price: strikeVal,
                color: '#FFF', // Solid Yellow
                lineWidth: 1,
                lineStyle: 1, // Dotted
                axisLabelVisible: true,
                title: 'Strike', // Left title
                axisLabelColor: '#FFF',
                axisLabelTextColor: '#000',
            });

            // Draw Breakeven based on Strategy
            let breakeven = 0;
            let beTitle = "";
            let beColor = "#38bdf8"; // Solid Blue

            if (strategy === 'compra_call') {
                breakeven = strikeVal + premium;
                beTitle = `Breakeven ⇧ Lucro`;
            } else if (strategy === 'compra_put') {
                breakeven = strikeVal - premium;
                beTitle = `Breakeven ⇩ Lucro`;
            } else if (strategy === 'venda_put') {
                breakeven = strikeVal - premium;
                beTitle = `Breakeven`;
            } else if (strategy === 'venda_call') {
                const currentPrice = stock?.price ? parseFloat(String(stock.price).replace(',', '.')) : strikeVal;
                breakeven = currentPrice - premium;
                beTitle = `Breakeven Aprox`;
            }

            if (breakeven > 0) {
                candleSeries.createPriceLine({
                    price: breakeven,
                    color: '#4ADE80',
                    lineWidth: 1,
                    lineStyle: 1, // Dotted
                    axisLabelVisible: true,
                    title: beTitle,
                    axisLabelColor: '#4ADE80',
                    axisLabelTextColor: '#000',
                });
            }
        }

        chart.timeScale().fitContent();
        chartInstanceRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current && chartInstanceRef.current) {
                chartInstanceRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [chartData, chartTimeframe, option, strategy, stock]);

    return (
        <div className="detail-chart-section" style={{ margin: '10px 0 20px 0' }}>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="stats-header-minimal" style={{ marginBottom: '0px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {stock?.image_url ? (
                        <img
                            src={stock.image_url}
                            alt={ticker}
                            style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'contain', background: '#fff', padding: '2px' }}
                        />
                    ) : (
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                            {ticker?.charAt(0)}
                        </div>
                    )}
                    <h3 style={{ fontSize: '1rem', color: '#f1f5f9', margin: 0 }}>{ticker}</h3>
                </div>
                <div className="home-period-selector">
                    {CHART_TIMEFRAMES.map(tf => (
                        <button
                            key={tf.label}
                            className={`home-period-btn ${chartTimeframe.label === tf.label ? 'active' : ''}`}
                            onClick={() => setChartTimeframe(tf)}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="chart-clean-wrapper">
                <div className="chart-container" style={{ height: 260, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                    {chartLoading ? (
                        <ModernLoader text="Carregando..." />
                    ) : chartError ? (
                        <div className="chart-empty">{chartError}</div>
                    ) : chartData ? (
                        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <div className="chart-empty">Aguardando dados...</div>
                    )}
                </div>
            </div>
        </div>
    );
}
