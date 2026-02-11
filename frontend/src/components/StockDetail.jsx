import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, ListPlus, Landmark, Target, DollarSign, ArrowUp, ArrowDown, Coins, PieChart, Activity } from 'lucide-react';
import OptionsModule from './OptionsModule';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './StockDetail.css';

export default function StockDetail({ stock, onBack }) {
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        if (stock?.ticker) {
            setLoadingHistory(true);
            fetch(getApiUrl(`/api/stocks/${stock.ticker}/history`))
                .then(res => res.json())
                .then(data => {
                    setHistory(data);
                    setLoadingHistory(false);
                })
                .catch(err => {
                    console.error("Error fetching history:", err);
                    setLoadingHistory(false);
                });
        }
    }, [stock]);

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
        } else if (distance <= 30) {
            // Gap 15-30% (e.g. -20%) -> Yellow
            barGradient = 'linear-gradient(90deg, #facc15, #eab308)';
            textColor = '#facc15';
            barGlow = '0 0 12px rgba(250, 204, 21, 0.4)';
        } else {
            // Gap > 30% -> Red
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

            {/* Historical Chart Section - Now in Card Format */}
            <div className="rf-card glass-card" style={{ marginTop: '24px', marginBottom: '24px' }}>
                <div className="rf-card-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="rf-card-icon" style={{ background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                            <TrendingUp size={18} color="#60a5fa" strokeWidth={2.5} />
                        </div>
                        <span className="label" style={{ fontSize: '10px' }}>Histórico de Preços</span>
                    </div>

                </div>
                <div className="rf-card-content" style={{ padding: '8px 12px 12px 12px' }}>
                    <div className="chart-container" style={{ height: 250, width: '100%' }}>
                        {loadingHistory ? (
                            <ModernLoader text="Carregando gráfico..." />
                        ) : history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isZero ? "#ffffff" : (isPositive ? "#4ade80" : "#ef4444")} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={isZero ? "#ffffff" : (isPositive ? "#4ade80" : "#ef4444")} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="date" hide={true} />
                                    <YAxis
                                        orientation="right"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={['auto', 'auto']}
                                        width={40}
                                    />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />

                                    {(() => {
                                        const parseVal = (v) => parseFloat((v || "0").toString().replace('R$', '').replace('.', '').replace(',', '.').trim());
                                        const currentP = parseVal(stock.price);
                                        const lowP = parseVal(stock.min_val);
                                        const highP = parseVal(stock.max_val);

                                        return (
                                            <>
                                                {/* Current Price Line */}
                                                <ReferenceLine y={currentP} stroke="#fff" strokeWidth={1} />

                                                {/* Custo Baixo Line */}
                                                {lowP > 0 && <ReferenceLine y={lowP} stroke="#22c55e" strokeWidth={1} />}

                                                {/* Custo Alto Line */}
                                                {highP > 0 && <ReferenceLine y={highP} stroke="#ef4444" strokeWidth={1} />}
                                            </>
                                        );
                                    })()}

                                    <Area type="monotone" dataKey="price" stroke={isZero ? "#ffffff" : (isPositive ? "#4ade80" : "#ef4444")} fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="chart-empty">Sem dados de histórico.</div>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                        marginTop: '6px',
                        padding: '2px',
                        whiteSpace: 'nowrap'
                    }}>
                        {/* Preço Item */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '1px', background: '#ffffff' }}></div>
                            <span style={{
                                fontSize: '0.6rem', fontWeight: '700',
                                background: 'linear-gradient(180deg, #ffffff, #94a3b8)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                textShadow: '0 1px 1px rgba(0,0,0,0.3)',
                                letterSpacing: '0.1px'
                            }}>
                                R$ {stock.price}
                            </span>
                        </div>

                        {/* Baixo Item */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '1px', background: '#22c55e' }}></div>
                            <span style={{
                                fontSize: '0.6rem', fontWeight: '700',
                                background: 'linear-gradient(180deg, #4ade80, #166534)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                textShadow: '0 1px 1px rgba(0,0,0,0.3)',
                                letterSpacing: '0.1px'
                            }}>
                                Min: {stock.min_val}
                            </span>
                        </div>

                        {/* Alto Item */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '1px', background: '#ef4444' }}></div>
                            <span style={{
                                fontSize: '0.6rem', fontWeight: '700',
                                background: 'linear-gradient(180deg, #f87171, #991b1b)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                textShadow: '0 1px 1px rgba(0,0,0,0.3)',
                                letterSpacing: '0.1px'
                            }}>
                                Max: {stock.max_val}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="rf-card glass-card">
                    <div className="rf-card-header">
                        <div className="rf-card-icon">
                            <DollarSign size={18} color="#4ade80" strokeWidth={2.5} />
                        </div>
                        <span className="label">Últ. Fechamento</span>
                    </div>
                    <div className="val-card-content">
                        <span className="value">R$ {stock.price}</span>
                    </div>
                </div>

                <div className="rf-card glass-card">
                    <div className="rf-card-header">
                        <div className="rf-card-icon">
                            <ArrowUp size={18} color="#4ade80" strokeWidth={2.5} />
                        </div>
                        <span className="label">Máxima 12m</span>
                    </div>
                    <div className="val-card-content">
                        <span className="value">R$ {stock.max_12m}</span>
                    </div>
                </div>

                <div className="rf-card glass-card">
                    <div className="rf-card-header">
                        <div className="rf-card-icon">
                            <ArrowDown size={18} color="#f87171" strokeWidth={2.5} />
                        </div>
                        <span className="label">Mínima 12m</span>
                    </div>
                    <div className="val-card-content">
                        <span className="value">R$ {stock.min_12m}</span>
                    </div>
                </div>

                <div className="rf-card glass-card">
                    <div className="rf-card-header">
                        <div className="rf-card-icon">
                            <Coins size={18} color="#facc15" strokeWidth={2.5} />
                        </div>
                        <span className="label">Dividendo (DY)</span>
                    </div>
                    <div className="val-card-content" style={{ width: '100%', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '4px' }}>
                            <span className="value">{formatPercentage(stock.dividend)}</span>
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
                                            <span style={{
                                                fontSize: '1.2rem',
                                                color: '#4ade80',
                                                fontWeight: '700',
                                                textShadow: '0 0 10px rgba(74, 222, 128, 0.3)'
                                            }}>
                                                {divValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        );
                                    }
                                } catch (e) { return null; }
                                return null;
                            })()}
                        </div>
                    </div>
                </div>

                <div className="rf-card glass-card">
                    <div className="rf-card-header">
                        <div className="rf-card-icon">
                            <PieChart size={18} color="#60a5fa" strokeWidth={2.5} />
                        </div>
                        <span className="label">Payout Médio</span>
                    </div>
                    <div className="val-card-content">
                        <span className="value">{formatPercentage(stock.payout)}</span>
                    </div>
                </div>

                <div className="rf-card glass-card">
                    <div className="rf-card-header">
                        <div className="rf-card-icon">
                            <Activity size={18} color="#a855f7" strokeWidth={2.5} />
                        </div>
                        <span className="label">Volat. (Ano)</span>
                    </div>
                    <div className="val-card-content">
                        <span className="value">{stock.vol_ano || "--"}</span>
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
                        <div className="val-card-content">
                            <span className="value">R$ {stock.min_val}</span>
                        </div>
                    </div>
                    <div className="valuation-card high-cost">
                        <div className="val-card-header">
                            <TrendingDown size={16} color="#f87171" />
                            <span className="label">Custo Alto</span>
                        </div>
                        <div className="val-card-content">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
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
