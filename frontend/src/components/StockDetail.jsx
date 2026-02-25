import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, ListPlus, Landmark, Target, DollarSign, ArrowUp, ArrowDown, Coins, PieChart, Activity, Shield } from 'lucide-react';
import OptionsModule from './OptionsModule';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './StockDetail.css';

const CHART_TIMEFRAMES = [
    { label: '15m', range: '1mo', interval: '15m' },
    { label: '1D', range: '6mo', interval: '1d' },
    { label: '1S', range: '1y', interval: '1wk' },
    { label: '1M', range: '5y', interval: '1mo' },
];

export default function StockDetail({ stock, onBack }) {
    const [showOptions, setShowOptions] = useState(false);
    const [chartTimeframe, setChartTimeframe] = useState(CHART_TIMEFRAMES[1]); // Default to 1D
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState(null);
    const [chartData, setChartData] = useState(null);
    const chartContainerRef = useRef(null);
    const chartInstanceRef = useRef(null);

    // Fetch candlestick data from yfinance API
    const fetchChartData = useCallback(async () => {
        if (!stock?.ticker) return;
        setChartLoading(true);
        setChartError(null);
        try {
            const url = getApiUrl(`/api/chart/${stock.ticker}?range=${chartTimeframe.range}&interval=${chartTimeframe.interval}`);
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
    }, [stock?.ticker, chartTimeframe]);

    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    // Render TradingView chart
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
                attributionLogo: false, // Hides the TradingView logo
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
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        candleSeries.setData(chartData.candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
        volumeSeries.setData(chartData.candles.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)' })));
        chart.timeScale().fitContent();
        const resizeObserver = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        resizeObserver.observe(container);
        chartInstanceRef.current = chart;
        return () => { resizeObserver.disconnect(); chart.remove(); chartInstanceRef.current = null; };
    }, [chartData, chartTimeframe.interval]);

    if (!stock) return null;

    const change = parseFloat(stock.change_day?.replace(',', '.') || 0);
    const isPositive = change > 0;
    const isNegative = change < 0;
    const isZero = change === 0;

    // Falta logic
    const faltaVal = stock.falta_val || 0;

    // Logic as per user request (Step 403):
    // FALTA POSITIVE/ZERO (>= 0): Price is below Low Cost (Cheap) -> 100% Full, Green.
    // FALTA NEGATIVE (< 0): Price is above Low Cost (Expensive, needs to drop) -> Reduced Fill.

    // Task List:
    // - [x] Modernize Progress Bar Cards <!-- id: 24 -->
    //     - [x] Refine Valuation section cards in StockDetail
    //     - [x] Modernize progress bars in StockList view
    // - [/] Overhaul Price History and Statistics UI <!-- id: 25 -->
    //     - [ ] Upgrade Price History card with premium glassmorphism
    //     - [ ] Redesign statistics cards for a modern, unified Look
    //     - [ ] Refine Recharts styling (glow, soft colors, minimalist grid)

    let progressWidth = 0;
    const isCheap = faltaVal >= 0;

    if (isCheap) {
        progressWidth = 100;
    } else {
        const distance = Math.abs(faltaVal);
        progressWidth = Math.max(0, 100 - distance);
    }

    // Dynamic Color Logic
    let barGradient;
    let textColor;
    let barGlow;

    if (isCheap) {
        // >= 0 is always Green
        barGradient = 'linear-gradient(90deg, #4ade80, #22c55e)';
        textColor = '#4ade80';
        barGlow = '0 0 12px rgba(74, 222, 128, 0.5)';
    } else {
        // Negative (Expensive)
        const distance = Math.abs(faltaVal);
        if (distance <= 15) {
            // Gap up to 15% (e.g. -10%) -> Green
            barGradient = 'linear-gradient(90deg, #4ade80, #22c55e)';
            textColor = '#4ade80';
            barGlow = '0 0 12px rgba(74, 222, 128, 0.5)';
        } else if (distance < 50) {
            // Gap 15-50% -> Yellow
            barGradient = 'linear-gradient(90deg, #facc15, #eab308)';
            textColor = '#facc15';
            barGlow = '0 0 12px rgba(250, 204, 21, 0.4)';
        } else {
            // Gap >= 50% -> Red
            barGradient = 'linear-gradient(90deg, #f87171, #ef4444)';
            textColor = '#ef4444';
            barGlow = '0 0 12px rgba(239, 68, 68, 0.5)';
        }
    }

    // Helper for formatting percentages (e.g. 0,03 -> 3,00%)
    const formatPercentage = (val) => {
        if (!val) return "--";
        const valStr = val.toString().replace('.', '').replace(',', '.').replace('%', '').trim();
        const value = parseFloat(valStr);
        if (isNaN(value)) return val;

        let pct = value;
        // If small decimal like 0.03, assume it is 3%
        if (value < 1.0 && value > -1.0 && value !== 0) {
            pct = value * 100;
        }

        return pct.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
    };

    const parsePrice = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        try {
            const clean = val.toString().replace('R$', '').replace(' ', '').replace('%', '').replace('.', '').replace(',', '.');
            return parseFloat(clean) || 0;
        } catch (e) {
            return 0;
        }
    };

    return (
        <div className="stock-detail-container">
            {/* HEADER */}
            <header className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="header-left" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <ArrowLeft size={24} color="var(--text-primary)" />
                    <h1 style={{ margin: 0, fontSize: '24px' }}>{stock.ticker}</h1>
                </div>

                <button
                    className="view-options-btn"
                    onClick={() => setShowOptions(true)}
                    style={{
                        backgroundColor: '#4ade80',
                        color: '#000000',
                        border: 'none',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                        padding: '8px 16px',
                        borderRadius: '50px',
                        fontSize: '13px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <ListPlus size={16} color="#000000" strokeWidth={2.5} />
                    Opções Disponíveis
                </button>
            </header>

            <div className="main-info">
                <div className="company-logo">
                    {stock.image_url ? (
                        <img src={stock.image_url} alt={stock.ticker} />
                    ) : (
                        <div className="detail-placeholder-icon">{stock.ticker[0]}</div>
                    )}
                </div>
                <h2>{stock.company_name}</h2>
                <span className="sector-badge">{stock.sector}</span>
            </div>

            <div className="price-hero">
                <span className="current-price">R$ {stock.price}</span>
                <div className={`price-change ${isPositive ? 'up' : isNegative ? 'down' : ''}`}>
                    {isPositive && <TrendingUp size={20} />}
                    {isNegative && <TrendingDown size={20} />}
                    {isZero && <div style={{ width: 16, height: 2, background: '#fff', marginRight: 4 }}></div>}
                    <span>{(parseFloat((stock.change_day || "0").toString().replace(',', '.')) * 100).toFixed(2).replace('.', ',')}%</span>
                </div>
            </div>

            <div className="about-section">
                <div className="about-header">
                    <h3>Sobre a empresa</h3>
                </div>
                <p>{stock.about || "Informação não disponível."}</p>
            </div>

            {showOptions && <OptionsModule ticker={stock.ticker} logoUrl={stock.image_url} onClose={() => setShowOptions(false)} />}

            {/* Historical Chart Section - TradingView Candlestick */}
            <div className="detail-chart-section">
                <div style={{ marginBottom: '14px' }}>
                    <div className="stats-header-minimal" style={{ marginBottom: '10px' }}>
                        <TrendingUp size={20} color="var(--text-primary)" />
                        <h3>Histórico de Preços</h3>
                    </div>
                    <div className="home-period-selector" style={{ alignSelf: 'flex-start' }}>
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
                    <div className="chart-container" style={{ height: 300, width: '100%' }}>
                        {chartLoading ? (
                            <ModernLoader text="Carregando gráfico..." />
                        ) : chartError ? (
                            <div className="chart-empty">{chartError}</div>
                        ) : chartData ? (
                            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <div className="chart-empty">Selecione um período.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="detail-stats-section">
                <div className="stats-header-minimal">
                    <Activity size={20} color="var(--text-primary)" />
                    <h3>Estatísticas</h3>
                </div>

                <div className="stats-clean-list">
                    <div className="stat-clean-row">
                        <span className="label">Dividend yield</span>
                        <span className="value">{formatPercentage(stock.dividend)}</span>
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">Proventos (12 Meses)</span>
                        {(() => {
                            try {
                                const priceStr = (stock.price || "0").toString().replace('R$', '').replace('.', '').replace(',', '.');
                                const price = parseFloat(priceStr);
                                const divStr = (stock.dividend || "0").toString().replace(',', '.').replace('%', '').trim();
                                let divPct = parseFloat(divStr);
                                if (divPct < 1 && divPct > 0) divPct = divPct * 100;

                                if (price > 0 && divPct > 0) {
                                    const divValue = price * (divPct / 100);
                                    return (
                                        <span className="value">
                                            {divValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    );
                                }
                            } catch (e) { return <span className="value">--</span>; }
                            return <span className="value">--</span>;
                        })()}
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">Payout Médio</span>
                        <span className="value">{formatPercentage(stock.payout)}</span>
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">Volat. (Ano)</span>
                        <span className="value">{stock.vol_ano || "--"}</span>
                    </div>

                    <h4 className="stats-sub-title">
                        <Activity size={20} color="var(--text-primary)" />
                        Rentabilidade
                    </h4>

                    <div className="stat-clean-row">
                        <span className="label">ROE</span>
                        <span className="value">{stock.roe_val || "--"}</span>
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">ROA</span>
                        <span className="value">{stock.roa_val || "--"}</span>
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">ROIC</span>
                        <span className="value">{stock.roic_val || "--"}</span>
                    </div>

                    <h4 className="stats-sub-title">
                        <TrendingUp size={20} color="var(--text-primary)" />
                        Crescimento (CAGR 5 Anos)
                    </h4>

                    <div className="stat-clean-row">
                        <span className="label">CAGR/LUC</span>
                        <span className="value" style={{ color: parsePrice(stock.cagr_luc) > 0 ? '#4ade80' : (parsePrice(stock.cagr_luc) < 0 ? '#ef4444' : 'inherit') }}>
                            {stock.cagr_luc || "--"}
                        </span>
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">CAGR/PAT</span>
                        <span className="value" style={{ color: parsePrice(stock.cagr_pat) > 0 ? '#4ade80' : (parsePrice(stock.cagr_pat) < 0 ? '#ef4444' : 'inherit') }}>
                            {stock.cagr_pat || "--"}
                        </span>
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">CAGR/ROE</span>
                        <span className="value" style={{ color: parsePrice(stock.cagr_roe) > 0 ? '#4ade80' : (parsePrice(stock.cagr_roe) < 0 ? '#ef4444' : 'inherit') }}>
                            {stock.cagr_roe || "--"}
                        </span>
                    </div>

                    <h4 className="stats-sub-title">
                        <Shield size={20} color="var(--text-primary)" />
                        Endividamento
                    </h4>

                    <div className="stat-clean-row">
                        <span className="label">Dívida Líq./PL</span>
                        <div className="value-group">
                            <span className="value" style={{ color: parsePrice(stock.div_pl) > 2.5 ? '#ef4444' : '#fff' }}>
                                {stock.div_pl || "--"}
                            </span>
                            {parsePrice(stock.div_pl) > 2.5 && <span className="sub-value" style={{ color: '#64748b', fontSize: '9px', marginTop: '2px', fontWeight: 500 }}>RISCO ELEVADO</span>}
                        </div>
                    </div>

                    <div className="stat-clean-row">
                        <span className="label">Dívida Líq./EBIT</span>
                        <div className="value-group">
                            <span className="value" style={{ color: parsePrice(stock.div_ebit) > 2.5 ? '#ef4444' : '#fff' }}>
                                {stock.div_ebit || "--"}
                            </span>
                            {parsePrice(stock.div_ebit) > 2.5 && <span className="sub-value" style={{ color: '#64748b', fontSize: '9px', marginTop: '2px', fontWeight: 500 }}>RISCO ELEVADO</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Valuation Cards */}
            <div className="valuation-section">
                <h3>Valuation (Precificação)</h3>

                <div className="valuation-grid">
                    <div className="valuation-card low-cost">
                        <div className="val-card-header">
                            <TrendingUp size={16} color="#4ade80" />
                            <span className="label">Custo Baixo</span>
                        </div>
                        <div className="val-card-content" style={{ padding: '20px' }}>
                            <span className="value">R$ {stock.min_val}</span>
                        </div>
                    </div>
                    <div className="valuation-card high-cost">
                        <div className="val-card-header">
                            <ArrowDown size={16} color="#f87171" />
                            <span className="label">Custo Alto</span>
                        </div>
                        <div className="val-card-content" style={{ padding: '20px' }}>
                            <span className="value">R$ {stock.max_val}</span>
                        </div>
                    </div>
                </div>

                <div className="progress-container">
                    <div className="progress-labels">
                        <span>Falta para Custo Baixo</span>
                        <span style={{ color: textColor }}>{stock.falta_pct}</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: `${progressWidth}%`,
                                background: barGradient,
                                boxShadow: barGlow
                            }}
                        ></div>
                    </div>
                    <p className="progress-hint">
                        {!isCheap
                            ? "Ainda falta cair para atingir o preço alvo."
                            : "Já atingiu ou ultrapassou o custo baixo (potencial compra)."}
                    </p>
                </div>

                {/* Fundamentals Charts Section */}
                <FundamentalsSection ticker={stock.ticker} />

            </div>
        </div>
    );
}

// Sub-component to handle fetching and rendering fundamentals
function FundamentalsSection({ ticker }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(getApiUrl(`/api/stocks/${ticker}/fundamentals`))
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching fundamentals:", err);
                setLoading(false);
            });
    }, [ticker]);

    if (loading) return <div className="chart-loading" style={{ height: 200 }}>Carregando fundamentos...</div>;

    // Debugging: Show message if no data instead of null
    if (!data || data.length === 0) {
        return (
            <div className="fundamentals-section">
                <h3 className="section-title">Análise Fundamentalista</h3>
                <div style={{ padding: 20, textAlign: 'center', color: '#888', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    Sem dados fundamentalistas disponíveis para {ticker}.
                    <br /><small>(Verifique se o ticker consta na aba LUCRO da planilha)</small>
                </div>
            </div>
        );
    }

    const addTrendline = (dataset, key) => {
        if (!dataset || dataset.length < 2) return dataset;
        const n = dataset.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        const points = dataset.map((d, i) => {
            const val = d[key] || 0;
            return { x: i, y: val };
        });
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumXX += p.x * p.x;
        });
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return dataset.map((d, i) => ({
            ...d,
            [`${key}_trend`]: slope * i + intercept
        }));
    };

    const dataWithTrend = addTrendline(addTrendline(addTrendline(data, 'lucro'), 'patrimonio'), 'roe')
        .map(item => ({
            ...item,
            roe: item.roe ? item.roe * 100 : 0,
            roe_trend: item.roe_trend ? item.roe_trend * 100 : 0
        }));

    const currencyFormatter = (val) => {
        if (Math.abs(val) >= 1000000) return `R$ ${(val / 1000000).toFixed(0)}M`;
        return `R$ ${val.toFixed(0)}`;
    }
    const tooltipCurrencyFormatter = (val) => `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)}`;
    const roeFormatter = (val) => `${val.toFixed(2)}%`;

    const ChartContainer = ({ title, children, icon: Icon, color }) => (
        <div className="rf-card glass-card" style={{ marginBottom: '20px' }}>
            <div className="rf-card-header" style={{
                background: `linear-gradient(90deg, ${color}60, transparent)`,
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#000', // Black icon on bright bg
                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                }}>
                    {Icon && <Icon size={18} strokeWidth={2.5} />}
                </div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{title}</h4>
            </div>
            <div style={{ height: 250, width: '100%', padding: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="fundamentals-section">
            <h3 className="section-title" style={{
                fontSize: '1.4rem',
                marginBottom: '20px',
                background: 'linear-gradient(90deg, #fff, #94a3b8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: '700'
            }}>
                Análise Fundamentalista
            </h3>


            <ChartContainer title="Lucro Líquido" icon={TrendingUp} color="#4ade80">
                <ComposedChart data={dataWithTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={currencyFormatter} width={45} axisLine={false} tickLine={false} />
                    <Tooltip
                        formatter={(value, name) => [tooltipCurrencyFormatter(value), name]}
                        labelStyle={{ color: '#94a3b8' }}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="lucro" fill="#fff" radius={[4, 4, 0, 0]} name="Lucro Líquido" barSize={20} />
                    <Line type="monotone" dataKey="lucro_trend" stroke="#facc15" strokeWidth={2} dot={false} name="Tendência" />
                </ComposedChart>
            </ChartContainer>

            <ChartContainer title="Patrimônio Líquido" icon={Landmark} color="#60a5fa">
                <ComposedChart data={dataWithTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={currencyFormatter} width={45} axisLine={false} tickLine={false} />
                    <Tooltip
                        formatter={(value, name) => [tooltipCurrencyFormatter(value), name]}
                        labelStyle={{ color: '#94a3b8' }}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="patrimonio" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Patrimônio Líquido" barSize={20} />
                    <Line type="monotone" dataKey="patrimonio_trend" stroke="#facc15" strokeWidth={2} dot={false} name="Tendência" />
                </ComposedChart>
            </ChartContainer>

            <ChartContainer title="ROE (Retorno s/ Patrimônio)" icon={Target} color="#34d399">
                <ComposedChart data={dataWithTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={roeFormatter} width={40} axisLine={false} tickLine={false} />
                    <Tooltip
                        formatter={(value, name) => [roeFormatter(value), name]}
                        labelStyle={{ color: '#94a3b8' }}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="roe" fill="#34d399" radius={[4, 4, 0, 0]} name="ROE" barSize={20} />
                    <Line type="monotone" dataKey="roe_trend" stroke="#facc15" strokeWidth={2} dot={false} name="Tendência" />
                </ComposedChart>
            </ChartContainer>
        </div>
    );
}
