import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Shield, TrendingUp, Zap, Umbrella, Lock, Activity, Anchor, BarChart3, PieChart as PieIcon, DollarSign, Landmark, Building2, AlertTriangle, ChevronRight } from 'lucide-react';
import './FixedIncome.css';
import { getApiUrl } from '../services/api';
import InvestmentGoals from './InvestmentGoals';

const Portfolio = () => {
    const [selectedProfile, setSelectedProfile] = useState('moderado');
    const [investmentValue, setInvestmentValue] = useState('');
    const [allStocks, setAllStocks] = useState([]);
    const [fixedIncomeData, setFixedIncomeData] = useState([]);
    const [treasuryBonds, setTreasuryBonds] = useState([]);
    const [indices, setIndices] = useState({ selic: '', cdi: '', ipca: '', poupanca: '' });
    const [loading, setLoading] = useState(true);

    // Fetch stocks and fixed income data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [stocksRes, rfRes, treasuryRes, homeRes, indicesRes] = await Promise.all([
                    fetch(getApiUrl('/api/stocks')),
                    fetch(getApiUrl('/api/rf')),
                    fetch(getApiUrl('/api/etfs/treasury')),
                    fetch(getApiUrl('/api/home')),
                    fetch(getApiUrl('/api/indices'))
                ]);
                const stocks = await stocksRes.json();
                const rf = await rfRes.json();
                const treasury = await treasuryRes.json();
                const homeData = await homeRes.json();
                // Indices might fail, handle gracefully
                let indicesData = null;
                try {
                    indicesData = await indicesRes.json();
                } catch (e) {
                    console.warn("Failed to parse indices JSON", e);
                }

                if (Array.isArray(stocks)) setAllStocks(stocks);
                if (Array.isArray(rf)) setFixedIncomeData(rf);
                if (Array.isArray(treasury)) setTreasuryBonds(treasury);
                if (indicesData) setIndices(indicesData);

                // Merge fixed income from Home API if available
                if (homeData.fixed_income && Array.isArray(homeData.fixed_income)) {
                    // Check if we should append or replace. For now, let's append unique items or just use it ensuring it's array
                    // To avoid complexity, we can store it in a new state or just merge.
                    // The user wants "Títulos Públicos" which are often in homeData.fixed_income
                    // Let's create a specific state for this if needed, or just append to existing fixedIncomeData
                    setFixedIncomeData(prev => [...prev, ...homeData.fixed_income]);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
                // Fallback indices if fetch fails completely
                try {
                    const resIndices = await fetch(getApiUrl('/api/indices'));
                    const jsonIndices = await resIndices.json();
                    setIndices(jsonIndices);
                } catch (error) {
                    console.error("Error fetching indices", error);
                    setIndices({ selic: '10.75%', cdi: '10.65%', ipca: '6.40%', poupanca: '0.5% + TR' });
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Parse volatility value from string like "22,99%" to number
    const parseVolatility = (volStr) => {
        if (!volStr) return 999;
        const clean = volStr.toString().replace('%', '').replace(',', '.');
        return parseFloat(clean) || 999;
    };

    // Helper to parse percentage string to number
    const parsePercentage = (str) => {
        if (!str) return -999; // Default low value for descending sort if missing
        const clean = str.toString().replace('%', '').replace(',', '.');
        return parseFloat(clean) || -999;
    };

    // Helper to get stocks by specific sector rules
    const getStocksBySector = (sectorKeyword, count, sortKey = 'vol_ano', sortDir = 'asc') => {
        // Filter by sector keyword (case insensitive check)
        const sectorStocks = allStocks.filter(s => {
            const sectorName = s.sector || s.setor || '';
            return sectorName.toLowerCase().includes(sectorKeyword.toLowerCase());
        });

        // Sort by key
        sectorStocks.sort((a, b) => {
            let valA, valB;

            if (sortKey === 'vol_ano') {
                valA = parseVolatility(a[sortKey]);
                valB = parseVolatility(b[sortKey]);
            } else if (sortKey === 'falta_pct') {
                valA = parsePercentage(a[sortKey]);
                valB = parsePercentage(b[sortKey]);
            } else {
                valA = a[sortKey];
                valB = b[sortKey];
            }

            return sortDir === 'asc' ? valA - valB : valB - valA;
        });

        // Take top N
        return sectorStocks.slice(0, count);
    };

    // Filter stocks by volatility threshold
    // NOW: Filter by Highest Discount (Falta) within Low Volatility Sectors
    const getLowVolatilityStocks = () => {
        const sectors = ['Bancos', 'Energia', 'Saneamento', 'Seguradora'];
        let results = [];

        sectors.forEach(sector => {
            // Get 2 stocks per sector with HIGHEST DISCOUNT (falta_pct desc)
            const stocks = getStocksBySector(sector, 2, 'falta_pct', 'desc');
            results = [...results, ...stocks];
        });

        // Remove duplicates if any (though unlikely if sectors are distinct)
        const uniqueResults = Array.from(new Set(results.map(s => s.ticker)))
            .map(ticker => results.find(s => s.ticker === ticker));

        return uniqueResults;
    };

    // NOW: Filter by Highest Discount (Falta) within High Volatility Sectors
    const getHighVolatilityStocks = () => {
        const sectors = [
            'Bens Industriais',
            'Consumo',
            'Materiais Básicos',
            'Tecnologia',
            'Telecomunicações',
            'Papel e Celulose'
        ];
        let results = [];

        sectors.forEach(sector => {
            // Get 1 stock per sector with HIGHEST DISCOUNT (falta_pct desc)
            const stocks = getStocksBySector(sector, 1, 'falta_pct', 'desc');
            results = [...results, ...stocks];
        });

        const uniqueResults = Array.from(new Set(results.map(s => s.ticker)))
            .map(ticker => results.find(s => s.ticker === ticker));

        return uniqueResults;
    };

    // Filter fixed income by type
    const getFixedIncomeByType = (types) => {
        return fixedIncomeData
            .filter(item => types.some(t => (item.Nome || item.name || '').toLowerCase().includes(t.toLowerCase())))
            .slice(0, 3);
    };

    const formatCurrency = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleInvestmentChange = (e) => {
        let value = e.target.value;
        // Remove non-digits
        value = value.replace(/\D/g, "");

        if (value === "") {
            setInvestmentValue("");
            return;
        }

        // Convert to float (cents)
        const floatValue = parseFloat(value) / 100;

        // Format back to currency string
        const formatted = floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        setInvestmentValue(formatted);
    };

    // Helper to get raw number for calculations
    const getRawInvestment = () => {
        if (!investmentValue) return 0;
        // Remove 'R$', dots, and convert comma to dot. Handle non-breaking spaces if any.
        // Simple approach: remove everything except digits and comma, then replace comma with dot.
        return parseFloat(investmentValue.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    };

    // Allocation Logic based on User Request
    // 1. Conservative: 100% Fixed Income (Safety)
    // 2. Moderate: Introduction of Stocks (Low Volatility Sectors)
    // 3. Aggressive: Higher Stocks % (Including Higher Volatility Sectors)

    const profiles = {
        conservador: {
            label: "Conservador",
            description: "Foco total na preservação de capital. Alocação exclusiva em Renda Fixa.",
            data: [
                { name: "Reserva de Emergência", value: 50, color: "#3b82f6", icon: Shield, desc: "Liquidez Diária (Selic)", recommendationType: "selic" },
                { name: "Proteção IPCA", value: 30, color: "#a855f7", icon: Umbrella, desc: "Tesouro IPCA+ (Poder de Compra)", recommendationType: "ipca" },
                { name: "Pré-Fixados", value: 20, color: "#10b981", icon: Lock, desc: "Rentabilidade garantida", recommendationType: "prefixado" }
            ]
        },
        moderado: {
            label: "Moderado",
            description: "Busca rentabilidade acima da inflação com exposição controlada em ações de baixa volatilidade.",
            data: [
                { name: "Reserva de Emergência", value: 30, color: "#3b82f6", icon: Shield, desc: "Liquidez e Segurança", recommendationType: "selic" },
                { name: "Proteção IPCA", value: 40, color: "#a855f7", icon: Umbrella, desc: "Longo Prazo e Aposentadoria", recommendationType: "ipca" },
                { name: "Ações (Baixa Volatilidade)", value: 30, color: "#f59e0b", icon: Anchor, desc: "Setores Perenes: Energia, Seguros", isStock: true, recommendationType: "lowVol" }
            ]
        },
        arrojado: {
            label: "Arrojado",
            description: "Foco na multiplicação de patrimônio, aceitando maior volatilidade em setores cíclicos.",
            data: [
                { name: "Reserva de Emergência", value: 15, color: "#3b82f6", icon: Shield, desc: "Liquidez Mínima", recommendationType: "selic" },
                { name: "Proteção IPCA", value: 25, color: "#a855f7", icon: Umbrella, desc: "Garantia Real", recommendationType: "ipca" },
                { name: "Ações (Baixa Volatilidade)", value: 25, color: "#f59e0b", icon: Anchor, desc: "Dividendos (Bancos, Utilities)", isStock: true, recommendationType: "lowVol" },
                { name: "Ações (Alta Volatilidade)", value: 35, color: "#ef4444", icon: Activity, desc: "Crescimento: Varejo, Commodities", isStock: true, recommendationType: "highVol" }
            ]
        }
    };

    // Generate recommendations based on type
    const getRecommendations = (type) => {
        switch (type) {
            case 'selic':
                // Reserva de Emergência: Tesouro Selic
                let selic = treasuryBonds.filter(item => (item.titulo || '').toLowerCase().includes('selic'));
                if (!selic || selic.length === 0) {
                    selic = fixedIncomeData.filter(item => (item.titulo || item.name || '').toLowerCase().includes('selic'));
                }

                // Deduplicate by name just in case
                const seenSelic = new Set();
                selic = selic.filter(item => {
                    const name = item.titulo || item.name;
                    if (seenSelic.has(name)) return false;
                    seenSelic.add(name);
                    return true;
                });

                const lfts11Data = treasuryBonds.find(item => (item.titulo || '').toUpperCase().includes('LFTS11'));
                // LFTS11 is ETF, usually just Selic, we can use the ETF yield directly or Selic index
                const selicIndexVal = indices.selic ? parseFloat(indices.selic.replace('%', '').replace(',', '.')) : 0;

                const lfts11Yield = lfts11Data && lfts11Data.yield_val !== undefined
                    ? `${lfts11Data.yield_val.toFixed(2).replace('.', ',')}%`
                    : (selicIndexVal > 0 ? `${selicIndexVal.toFixed(2).replace('.', ',')}%` : 'Selic');

                return [
                    {
                        name: 'LFTS11 (ETF Selic)',
                        type: 'ETF de Renda Fixa',
                        // Use calculated yield
                        yield: lfts11Yield.includes('%') ? lfts11Yield : `${lfts11Yield}%`,
                        image: 'https://brapi.dev/api/v2/logo/LFTS11'
                    },
                    ...selic.slice(0, 2).map(t => {
                        // Calculate Total Yield: Fixed + Selic
                        let displayYield = t.rentabilidade_anual || t.taxa_compra || 'Selic';

                        try {
                            const rawRate = t.rentabilidade_anual || t.taxa_compra || "0";
                            const fixedPartStr = rawRate.toString().replace(/[^\d,.]/g, "").replace(",", ".");
                            const fixedPart = parseFloat(fixedPartStr) || 0;

                            if (selicIndexVal > 0) {
                                const total = fixedPart + selicIndexVal;
                                displayYield = `${total.toFixed(2).replace('.', ',')}%`;
                            } else if (!displayYield.includes('%')) {
                                displayYield += '%';
                            }
                        } catch (e) {
                            console.error("Error calc Portfolio Selic", e);
                        }

                        return {
                            name: t.titulo || t.name,
                            type: 'Tesouro Direto',
                            yield: displayYield,
                            image: null
                        };
                    })
                ];
            case 'ipca':
                // Proteção: IPCA+
                let ipca = treasuryBonds.filter(item => (item.titulo || '').toLowerCase().includes('ipca'));
                if (!ipca || ipca.length === 0) {
                    ipca = fixedIncomeData.filter(item => (item.titulo || item.name || '').toLowerCase().includes('ipca'));
                }

                // Deduplicate IPCA by name
                const seenIpca = new Set();
                ipca = ipca.filter(item => {
                    const name = item.titulo || item.name;
                    if (seenIpca.has(name)) return false;
                    seenIpca.add(name);
                    return true;
                });

                return ipca
                    .slice(0, 3)
                    .map(t => {
                        let rate = t.rentabilidade_anual || t.taxa_compra || "0";
                        let displayYield = rate;

                        // Logic to sum IPCA
                        // Expected format usually: "IPCA + 6,50%" or just "6,50%"
                        try {
                            // Extract numbers. If it has "+", likely refers to the fixed part.
                            // If simply "6.50", assumes it's the fixed part to add to IPCA.
                            let fixedString = rate.toString();
                            if (fixedString.includes('+')) {
                                fixedString = fixedString.split('+')[1];
                            }

                            const fixedPartStr = fixedString.replace(/[^\d,.]/g, "").replace(",", ".");
                            const fixedPart = parseFloat(fixedPartStr); // Fixed part (e.g. 6.50)

                            // Parse Dynamic IPCA (e.g. "4.50%" or "4.50" or "4,50")
                            const ipcaVal = indices.ipca || "0";
                            const ipcaClean = ipcaVal.toString().replace(/[^\d,.]/g, "").replace(",", ".");
                            const ipcaNum = parseFloat(ipcaClean); // Dynamic IPCA (e.g. 4.50)

                            if (!isNaN(fixedPart)) {
                                const total = fixedPart + (isNaN(ipcaNum) ? 0 : ipcaNum);
                                displayYield = total.toFixed(2).replace('.', ',') + '%';
                            }
                        } catch (e) {
                            console.error("Error parsing IPCA", e);
                        }

                        return {
                            name: t.titulo || t.name,
                            type: 'Tesouro Direto',
                            yield: displayYield,
                            image: null
                        };
                    });
            case 'prefixado':
                // Pré-fixados: CDBs, LCIs -> Agora Tesouro Prefixado
                return fixedIncomeData
                    .filter(item =>
                        (item.Nome || item.name || item.titulo || '').toLowerCase().includes('prefixado') ||
                        (item.Nome || item.name || item.titulo || '').toLowerCase().includes('pré') ||
                        (item.category || '').toLowerCase().includes('pré')
                    )
                    .slice(0, 3)
                    .map(item => {
                        let y = item.Rentabilidade || item.yield || item.taxa_compra || "0";
                        if (y && !y.toString().includes('%')) y += '%';
                        return {
                            name: item.Nome || item.name || item.titulo,
                            type: 'Tesouro Direto',
                            yield: y,
                            image: null
                        };
                    });
            case 'lowVol':
                return getLowVolatilityStocks().map(s => ({
                    name: s.ticker, // Ticker Top
                    type: `${s.company_name || 'Empresa'} • ${s.sector || s.setor || 'Setor'}`, // Name + Sector Bottom
                    isStock: true,
                    falta: s.falta_pct,
                    image: s.image_url || `https://brapi.dev/api/v2/logo/${s.ticker}`
                }));
            case 'highVol':
                return getHighVolatilityStocks().map(s => ({
                    name: s.ticker, // Ticker Top
                    type: `${s.company_name || 'Empresa'} • ${s.sector || s.setor || 'Setor'}`, // Name + Sector Bottom
                    isStock: true,
                    falta: s.falta_pct,
                    image: s.image_url || `https://brapi.dev/api/v2/logo/${s.ticker}`
                }));
            default:
                return [];
        }
    };

    const currentProfile = profiles[selectedProfile];

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'rgba(30, 41, 59, 0.9)', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                    <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>{payload[0].name}</p>
                    <p style={{ color: payload[0].payload.color, margin: 0 }}>{payload[0].value}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rf-container" style={{ paddingBottom: '80px' }}>
            {/* Header */}
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <PieIcon size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Divisão de Portfólio</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>

            {/* Profile Selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
                {Object.keys(profiles).map((key) => {
                    const isActive = selectedProfile === key;
                    const p = profiles[key];
                    // Color coding for each profile
                    const colorMap = {
                        conservador: '#4ade80', // Green
                        moderado: '#facc15',    // Yellow
                        arrojado: '#ef4444'     // Red
                    };
                    const profileColor = colorMap[key] || '#4ade80';

                    return (
                        <button
                            key={key}
                            onClick={() => setSelectedProfile(key)}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '20px',
                                border: isActive ? `2px solid ${profileColor}` : 'none',
                                background: isActive ? `${profileColor}20` : 'transparent',
                                color: isActive ? profileColor : '#64748b',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s ease',
                                minWidth: '120px'
                            }}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {/* Investment Simulation Input */}
            {/* Investment Simulation Input */}
            {/* Investment Simulation Input */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                        <DollarSign size={24} color="#10b981" />
                        <span style={{ color: '#fff', fontWeight: '500', fontSize: '16px' }}>Simular Valor:</span>
                    </div>
                    <input
                        type="text"
                        placeholder="R$ 0,00"
                        value={investmentValue}
                        onChange={handleInvestmentChange}
                        style={{
                            background: 'rgba(30, 41, 59, 0.4)',
                            border: 'none',
                            borderRadius: '24px',
                            padding: '10px 16px',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: '600',
                            outline: 'none',
                            width: '180px',
                            minWidth: '150px',
                            textAlign: 'left',
                            boxShadow: '0 2px 3px rgba(0, 0, 0, 0.2)'
                        }}
                    />
                </div>
            </div>

            {/* Content Grid */}
            <div className="portfolio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>

                {/* Chart Section */}
                <div className="rf-card glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '400px' }}>
                    <div className="rf-card-header" style={{
                        width: 'calc(100% + 48px)', // Fix alignment (Inner + 2*Padding)
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                        borderRadius: '16px 16px 0 0',
                        padding: '12px 16px',
                        margin: '-24px -24px 24px -24px',
                        marginBottom: '24px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <PieIcon size={20} color="#000000" />
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Alocação Sugerida</h3>
                    </div>

                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                {/* 3D Effect simulated with 2 Pies (Shadow layer) - Optional, simplified for now to clean UI */}
                                <Pie
                                    data={currentProfile.data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {currentProfile.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '-20px', fontSize: '0.9rem', maxWidth: '300px' }}>
                        Distriubuição ideal para o perfil <strong>{currentProfile.label}</strong>.
                    </p>
                </div>

                {/* Details Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '8px' }}>Perfil {currentProfile.label}</h2>
                        <p style={{ color: '#cbd5e1', lineHeight: '1.6' }}>{currentProfile.description}</p>
                    </div>

                    {/* Breakdown Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {currentProfile.data.map((item, idx) => {
                            const Icon = item.icon;
                            // Check if it's a "Stock" category to highlight Sector Logic
                            const isStock = item.isStock;

                            return (
                                <div key={idx} className="rf-card glass-card" style={{ padding: '0px', border: isStock ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                                    <div className="rf-card-header" style={{
                                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                                        borderRadius: '16px 16px 0 0',
                                        padding: '12px 16px',
                                        margin: '0',
                                        display: 'flex', alignItems: 'center', gap: '12px'
                                    }}>
                                        <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <Icon size={18} color="#000000" />
                                        </div>
                                        <h3 style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{item.name}</h3>
                                    </div>

                                    <div className="rf-card-content" style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: item.color }}>
                                                {item.value}%
                                            </div>

                                            {investmentValue && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>
                                                        Valor à Investir
                                                    </span>
                                                    <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>
                                                        {formatCurrency(getRawInvestment() * item.value / 100)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                                            {item.desc}
                                        </div>



                                        {/* Recommendations Section */}
                                        {item.recommendationType && (
                                            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                                    {isStock ? <TrendingUp size={14} color={item.color} /> : <Landmark size={14} color={item.color} />}
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        {isStock ? 'Ações Disponíveis' : 'Títulos Compatíveis'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {getRecommendations(item.recommendationType).length > 0 ? (
                                                        getRecommendations(item.recommendationType).map((rec, recIdx) => (
                                                            <div
                                                                key={recIdx}
                                                                style={{
                                                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                                    borderRadius: '12px',
                                                                    padding: '10px 12px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '10px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)';
                                                                    e.currentTarget.style.transform = 'translateX(4px)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)';
                                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                                }}
                                                            >
                                                                {/* Logo/Icon */}
                                                                {isStock && rec.image ? (
                                                                    <img
                                                                        src={rec.image}
                                                                        alt={rec.name}
                                                                        style={{
                                                                            width: 36,
                                                                            height: 36,
                                                                            borderRadius: '8px',
                                                                            objectFit: 'cover',
                                                                            background: '#fff',
                                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                                                        }}
                                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                                    />
                                                                ) : null}

                                                                {/* Fallback Icon */}
                                                                <div style={{
                                                                    width: 36,
                                                                    height: 36,
                                                                    borderRadius: '8px',
                                                                    background: item.color + '20',
                                                                    display: (isStock && rec.image) ? 'none' : 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}>
                                                                    {isStock ? (
                                                                        <Building2 size={16} color={item.color} />
                                                                    ) : (
                                                                        <Landmark size={16} color={item.color} />
                                                                    )}
                                                                </div>

                                                                {/* Content */}
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{
                                                                        fontSize: isStock ? '1rem' : '0.85rem',
                                                                        fontWeight: 600,
                                                                        color: '#fff',
                                                                        lineHeight: '1',
                                                                        marginBottom: isStock ? '2px' : '2px'
                                                                    }}>
                                                                        {rec.name}
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: isStock ? '0.75rem' : '0.7rem',
                                                                        fontWeight: 500,
                                                                        color: isStock ? '#aaa' : '#64748b',
                                                                        lineHeight: '1',
                                                                        marginTop: '0'
                                                                    }}>
                                                                        {rec.type}
                                                                    </div>
                                                                </div>

                                                                {/* Badge */}
                                                                {rec.yield && (
                                                                    <div style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                        <span style={{
                                                                            fontSize: '0.8rem',
                                                                            color: isStock ? (rec.yield.includes('Baixa') || parseFloat(rec.yield.replace('Vol: ', '').replace(',', '.')) < 25 ? 'rgb(52, 211, 153)' : '#f87171') : item.color,
                                                                            fontWeight: 600
                                                                        }}>
                                                                            {rec.yield}
                                                                        </span>
                                                                        {!isStock && (
                                                                            <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '1px' }}>
                                                                                {item.recommendationType === 'selic' ? (rec.name?.includes('LFTS11') ? 'ao Ano' : 'ao Ano') : 'ao Ano'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Discount Indicator */}
                                                                {isStock && rec.falta && (
                                                                    <div title={`Desconto: ${rec.falta} (Disclaimer: Compra recomendada apenas se descontado)`} style={{ marginLeft: '10px', position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {(() => {
                                                                            const faltaVal = parseFloat(rec.falta.replace('%', '').replace(',', '.')) || 0;
                                                                            let color = '#ef4444';
                                                                            if (faltaVal > -15) color = '#4ade80';
                                                                            else if (faltaVal >= -30) color = '#facc15';

                                                                            const fillPercentage = Math.max(0, Math.min(100, 100 + faltaVal));
                                                                            const radius = 13;
                                                                            const circumference = 2 * Math.PI * radius;
                                                                            const strokeDashoffset = circumference - (fillPercentage / 100) * circumference;

                                                                            return (
                                                                                <svg width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
                                                                                    <circle cx="16" cy="16" r={radius} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                                                                    <circle
                                                                                        cx="16" cy="16" r={radius} fill="transparent" stroke={color} strokeWidth="3"
                                                                                        strokeDasharray={circumference}
                                                                                        strokeDashoffset={strokeDashoffset}
                                                                                        strokeLinecap="round"
                                                                                    />
                                                                                </svg>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                                            {loading ? 'Carregando...' : 'Nenhuma sugestão disponível'}
                                                        </div>
                                                    )}
                                                </div>
                                                {isStock && (
                                                    <div style={{
                                                        marginTop: '12px',
                                                        padding: '10px',
                                                        background: `${item.color}08`,
                                                        borderRadius: '8px',
                                                        border: `1px solid ${item.color}20`,
                                                        fontSize: '0.70rem',
                                                        color: '#94a3b8',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <Zap size={12} color={item.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                            <p style={{ margin: 0 }}>
                                                                <strong style={{ color: item.color }}>Estratégia:</strong> Aguarde estar em custo baixo (descontado). Utilize <span style={{ color: '#fff' }}>Venda de Puts</span> como forma de aquisição, rentabilizando sua reserva de oportunidade enquanto aguarda o preço ideal.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {item.recommendationType === 'selic' && (
                                                    <div style={{
                                                        marginTop: '12px',
                                                        padding: '10px',
                                                        background: `${item.color}08`,
                                                        borderRadius: '8px',
                                                        border: `1px solid ${item.color}20`,
                                                        fontSize: '0.70rem',
                                                        color: '#94a3b8',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <Zap size={12} color={item.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                                                            <p style={{ margin: 0 }}>
                                                                <strong style={{ color: item.color }}>Estratégia:</strong> Utilize o <span style={{ color: '#fff' }}>LFTS11</span> como reserva de oportunidade, rentabilizando o capital através das opções enquanto as ações não estão descontadas.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>



            {/* Investment Goals Section */}
            <InvestmentGoals />

            {/* Mobile Responsiveness Styles */}
            <style>{`
                @media (max-width: 768px) {
                    .portfolio-grid {
                         grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div >
    );
};

export default Portfolio;
