
import React, { useState, useEffect } from 'react';
import './FixedIncome.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Shield, Lock, Clock, AlertTriangle, Landmark, Search } from 'lucide-react';
import { getApiUrl } from '../services/api';

// Helper to format date
const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    if (dateStr.includes("-")) {
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    }
    return dateStr;
};

// Helper handling currency
const formatCurrency = (val) => {
    if (val === undefined || val === null) return "R$ 0,00";

    // Check if it's a number
    if (typeof val === 'number') {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // String handling
    let v = val.toString().replace("R$", "").trim();
    if (v.includes(",")) return `R$ ${v}`; // Already formatted
    // Try to convert x.y to x,y
    return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const Card = ({ title, data, icon: Icon, colorClass, ipcaValue, selicValue }) => {


    // Helper to calculate total yield for IPCA
    const getDisplayYield = (item) => {
        // Handle ETF Yield (yield_val)
        if (item.yield_val !== undefined) {
            const val = item.yield_val;
            const label = item.yield_label || "12 Meses";
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: val >= 0 ? '#4ade80' : '#ef4444' }}>
                        {val.toFixed(2).replace('.', ',')}%
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#aaa' }}>{label}</span>
                </div>
            );
        }

        const rateStr = item.taxa_compra;
        const titleUpper = item.titulo ? item.titulo.toUpperCase() : "";
        const categoryUpper = item.category ? item.category.toUpperCase() : "";

        if (!rateStr) return "-";

        let displayRate = rateStr.toString();
        // Ensure formatting if it's just a number
        if (!displayRate.includes("%") && !displayRate.includes("IPCA")) {
            displayRate = `${displayRate}%`;
        }

        // Check if it's IPCA+ based on Title or Category
        // Note: Some titles are "Tesouro IPCA+ 2035".
        const isIPCA = titleUpper.includes("IPCA") || categoryUpper.includes("PROTEÇÃO") || categoryUpper.includes("LONGO PRAZO");

        // Exclude "Prefixado" explicitly just in case
        if (titleUpper.includes("PREFIXADO") || titleUpper.includes("LTN")) {
            return <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4ade80' }}>{displayRate}</span>;
        }

        if (isIPCA) {
            try {
                // Parse Fixed Part (e.g. "6.56" or "6,56")
                const fixedPartStr = rateStr.toString().replace(/[^\d,.]/g, "").replace(",", ".");
                const fixedPart = parseFloat(fixedPartStr);

                // Parse IPCA from prop (e.g. "4.50%" or "4,50")
                const ipcaClean = ipcaValue ? ipcaValue.toString().replace(/[^\d,.]/g, "").replace(",", ".") : "0";
                const ipcaNum = parseFloat(ipcaClean);

                if (!isNaN(fixedPart) && !isNaN(ipcaNum) && ipcaNum > 0) {
                    const total = fixedPart + ipcaNum;
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#00ff88' }}>
                                {total.toFixed(2).replace('.', ',')}%
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
                                (IPCA {ipcaValue} + {fixedPart.toLocaleString('pt-BR')}%)
                            </span>
                        </div>
                    );
                }
            } catch (e) {
                console.error("Error parsing IPCA yield", e);
            }
        }

        // SPECIAL REQUEST: Selic (Lft) -> Add "(dia útil)" + Sum Selic Index
        if (titleUpper.includes("SELIC")) {
            let totalRate = displayRate;
            try {
                // Parse Fixed Part
                const fixedPartStr = rateStr.toString().replace(/[^\d,.]/g, "").replace(",", ".");
                const fixedPart = parseFloat(fixedPartStr) || 0;

                // Parse Selic from prop (passed as selicValue)
                // Note: Card needs to receive selicValue prop
                const selicClean = selicValue ? selicValue.toString().replace(/[^\d,.]/g, "").replace(",", ".") : "0";
                const selicNum = parseFloat(selicClean) || 0;

                if (selicNum > 0) {
                    const total = fixedPart + selicNum;
                    totalRate = `${total.toFixed(2).replace('.', ',')}%`;
                }
            } catch (e) {
                console.error("Error summing Selic", e);
            }

            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#4ade80' }}>{totalRate}</span>
                    <span style={{ fontSize: '0.7rem', color: '#aaa' }}>(dia útil)</span>
                </div>
            );
        }

        // Default return
        return <span style={{ fontSize: '1rem' }}>{displayRate}</span>;
    };

    return (
        <div className={`rf-card glass-card ${colorClass}`}>
            <div className="rf-card-header">
                <div className="rf-card-icon">
                    <Icon size={20} />
                </div>
                <h3>{title}</h3>
            </div>
            <div className="rf-card-content">
                {data.map((item, idx) => (
                    <div key={idx} className="rf-item">
                        <div className="rf-item-main">
                            <span className="rf-item-name font-bold">{item.titulo ? item.titulo.replace("Tesouro ", "") : "Título"}</span>
                            <span className="rf-item-venc">
                                Vencimento: {item.maturity ? item.maturity : formatDate(item.vencimento)}
                            </span>
                        </div>
                        <div className="rf-item-details">
                            <div className="rf-detail-block">
                                <span className="rf-label">Rentabilidade</span>
                                <div className="rf-value highlight">{getDisplayYield(item)}</div>
                            </div>
                            <div className="rf-detail-block">
                                <span className="rf-label">Mínimo</span>
                                <span className="rf-value">{formatCurrency(item.min_investimento || item.min_investment)}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {data.length === 0 && <div className="rf-empty">Nenhum título disponível</div>}
            </div>
        </div>
    );
};

// ... IndicesCard and ComparativeChart unchanged ... 
// (Wait, we can't skip them in replace_file_content if we are replacing the whole block including Card definition and export default)
// Actually, I can target specific lines. 
// But the prompt above replaced from 29 to 370? NO.
// I will just replace the "getDisplayYield" inside Card, and "return" of Card.
// And then modify "FixedIncome" component to fetch data.
// So 2 replacements.

// Replacement 1: Update Card Component Logic
// ... done above? Wait, I need to do it as a tool call.

// Replacement 2: Update FixedIncome Component to fetch treasury etfs.


// IndicesBar removed in favor of IndicesCard

// New Indices Card Component
const IndicesCard = ({ indices }) => {
    const items = [
        { label: 'Selic', value: indices.selic },
        { label: 'CDI', value: indices.cdi },
        { label: 'IPCA (12m)', value: indices.ipca },
        { label: 'Poupança (12m)', value: indices.poupanca }
    ];

    // Use current date as reference for live indices
    const today = new Date().toLocaleDateString('pt-BR');

    return (
        <div className="rf-card glass-card card-indices">
            <div className="rf-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div className="rf-card-icon">
                        <TrendingUp size={20} />
                    </div>
                    <h3>Principais Índices</h3>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#999' }}>Ref: {today}</span>
            </div>
            <div className="rf-card-content">
                {items.map((item, idx) => (
                    <div key={idx} className="rf-item">
                        <div className="rf-item-main">
                            <span className="rf-item-name">{item.label}</span>
                        </div>
                        <div className="rf-item-details">
                            <span className="rf-value highlight">{item.value || '...'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ComparativeChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="rf-card glass-card" style={{ marginTop: '20px', padding: '8px' }}>
            <div className="rf-card-header">
                <div>
                    <h3>Rentabilidade Acumulada (5 Anos)</h3>
                    <p style={{ fontSize: '0.8rem', color: '#999', margin: '4px 0 0' }}>Mostra a evolução de R$ 100 investidos há 5 anos.</p>
                </div>
            </div>
            <div style={{ width: '100%', height: 350, marginTop: '20px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                            dataKey="date"
                            stroke="#666"
                            tick={{ fill: '#666', fontSize: 12 }}
                            tickFormatter={(val) => val.split("-")[0]} // Show Year
                        />
                        <YAxis
                            stroke="#666"
                            tick={{ fill: '#666', fontSize: 12 }}
                            domain={['auto', 'auto']}
                            tickFormatter={(val) => `R$ ${val}`} // ADDED R$
                        />
                        <RechartsTooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #333', borderRadius: '8px' }}
                            formatter={(value, name) => {
                                // Match color based on name
                                let color = '#fff';
                                if (name === 'Ibovespa') color = '#4ade80';
                                if (name === 'Selic Acum.') color = '#38bdf8';
                                if (name === 'Poupança') color = '#a855f7';
                                return [<span style={{ color: color, fontWeight: 'bold' }}>R$ {parseFloat(value).toFixed(2).replace('.', ',')}</span>, name];
                            }}
                            labelStyle={{ color: '#aaa', marginBottom: '5px' }}
                            itemStyle={{ paddingBottom: '2px' }} // Spacing
                        />
                        <Line type="monotone" dataKey="ibov" name="Ibovespa" stroke="#4ade80" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="selic" name="Selic Acum." stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="poupanca" name="Poupança" stroke="#a855f7" strokeWidth={2} dot={false} />
                        {/* Legend */}
                        <text x="50%" y="10" textAnchor="middle" fill="#999" fontSize="12">
                            Base 100
                        </text>
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginTop: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 12, height: 12, backgroundColor: '#4ade80', borderRadius: '50%' }}></div>
                    <span style={{ color: '#ccc' }}>Ibovespa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 12, height: 12, backgroundColor: '#38bdf8', borderRadius: '50%' }}></div>
                    <span style={{ color: '#ccc' }}>Selic</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 12, height: 12, backgroundColor: '#a855f7', borderRadius: '50%' }}></div>
                    <span style={{ color: '#ccc' }}>Poupança</span>
                </div>
            </div>
        </div>
    );
};

export default function FixedIncome() {
    const [data, setData] = useState([]);
    const [indices, setIndices] = useState({ selic: '', cdi: '', ipca: '', poupanca: '' });
    const [chartData, setChartData] = useState([]);
    const [treasuryEtfs, setTreasuryEtfs] = useState([]);
    // Remove global loading to allow progressive rendering
    // const [loading, setLoading] = useState(true); 
    const [isUpdating, setIsUpdating] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Progressive Loading: Fire all fetches in parallel with Promise.all
        const loadData = async () => {
            setIsUpdating(true);

            // All 4 fetches run in parallel
            await Promise.all([
                fetchIndices(),
                fetchFixedIncome(),
                fetchChartData(),
                fetchTreasuryEtfs()
            ]);

            setIsUpdating(false);
        };

        loadData();
    }, []);

    const fetchIndices = async () => {
        try {
            const res = await fetch(getApiUrl('/api/indices'));
            const json = await res.json();
            setIndices(json);
        } catch (err) {
            console.error("Error fetching indices:", err);
            setIndices({ selic: '10.75%', cdi: '10.65%', ipca: '4.50%', poupanca: '0.5% + TR' });
        }
    };

    const fetchFixedIncome = async () => {
        try {
            const res = await fetch(getApiUrl('/api/rf'));
            const json = await res.json();
            if (Array.isArray(json)) {
                setData(json);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchChartData = async () => {
        try {
            const res = await fetch(getApiUrl('/api/indicators/history'));
            const json = await res.json();
            if (Array.isArray(json)) {
                setChartData(json);
            }
        } catch (err) {
            console.error("Chart data error:", err);
        }
    };

    // NEW FETCH
    const fetchTreasuryEtfs = async () => {
        try {
            const res = await fetch(getApiUrl('/api/etfs/treasury'));
            const json = await res.json();
            if (Array.isArray(json)) {
                setTreasuryEtfs(json);
            }
        } catch (err) {
            console.error("Error fetching treasury ETFs:", err);
        }
    };

    // Non-blocking UI (Progressive Loading)

    // Filter Data
    const filteredData = data.filter(item =>
        !searchTerm || (item.titulo && item.titulo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const reserva = filteredData.filter(d => d.category === 'Reserva de Emergência');
    const protecao = filteredData.filter(d => d.category === 'Proteção contra Inflação' || d.titulo.includes("IPCA"));
    const prefixados = filteredData.filter(d => d.category === 'Pré-fixados' || d.titulo.includes("Prefixado"));
    const longoPrazo = filteredData.filter(d => d.category === 'Longo Prazo / Aposentadoria' || d.titulo.includes("Renda+") || d.titulo.includes("Educa+"));

    return (
        <div className="rf-container">
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Minimalist Header */}
                        <Landmark size={20} color="#94a3b8" />
                        <h1 style={{
                            margin: 0,
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            background: 'linear-gradient(90deg, #fff, #cbd5e1)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>Renda Fixa</h1>
                    </div>
                    {data.length > 0 && data[0].data_ref && (
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>
                            Atualizado: {formatDate(data[0].data_ref.split("T")[0])}
                        </span>
                    )}
                </div>

                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', margin: '16px 0' }}></div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(30, 41, 59, 0.4)',
                    borderRadius: '24px',
                    padding: '6px 12px',
                    marginBottom: '0',
                    border: 'none',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <Search size={16} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Buscar título..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', flex: 1, outline: 'none'
                        }}
                    />
                </div>
            </header>

            <div className="rf-grid">
                {/* Indices as the first card */}
                <IndicesCard indices={indices} />

                {/* Comparative Chart - Takes full width or part of grid? Ideally full width below indices or as a large card. */}
                {/* For layout, let's put it OUTSIDE the grid, below it, for full width. */}
            </div>

            <ComparativeChart data={chartData} />

            {/* Separator and Title for Títulos Públicos */}
            <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', marginBottom: '30px' }}></div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f8fafc' }}>Títulos Públicos</h2>
            </div>

            <div className="rf-grid">
                <Card
                    title="Reserva de Emergência"
                    data={reserva}
                    icon={AlertTriangle}
                    colorClass="card-reserva"
                    ipcaValue={indices.ipca}
                    selicValue={indices.selic}
                />

                <Card
                    title="Proteção contra Inflação"
                    data={protecao}
                    icon={Shield}
                    colorClass="card-protecao"
                    ipcaValue={indices.ipca}
                />

                <Card
                    title="Investimentos Pré-fixados"
                    data={prefixados}
                    icon={Lock}
                    colorClass="card-prefixado"
                    ipcaValue={indices.ipca}
                />

                <Card
                    title="Longo Prazo / Aposentadoria"
                    data={longoPrazo}
                    icon={Clock}
                    colorClass="card-longo"
                    ipcaValue={indices.ipca}
                />
            </div>

            {/* Separator and Title for Garantias */}
            <div style={{ marginTop: '40px', marginBottom: '20px' }}>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', marginBottom: '30px' }}></div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f8fafc' }}>Renda Fixa para Garantias</h2>
            </div>

            <div className="rf-grid">
                {/* NEW CARD: Treasury ETFs */}
                <Card
                    title="Fundos de Investimento (Tesouro)"
                    data={treasuryEtfs}
                    icon={ArrowUpRight}
                    colorClass="card-treasury"
                    ipcaValue={indices.ipca}
                />
            </div>
        </div>
    );
}
