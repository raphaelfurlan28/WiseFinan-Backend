import React, { useState, useEffect } from 'react';
import { Calculator as CalcIcon, DollarSign, Percent, Calendar, TrendingUp, ChevronDown, BarChart2, Target, Info, ArrowRight, AlertCircle, Landmark, RefreshCw, Shield, Lock, ClipboardCheck, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { getApiUrl } from '../services/api';
import './FixedIncome.css'; // Reusing glass card styles

const Calculator = () => {
    // State
    const [bonds, setBonds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Form State
    const [selectedBond, setSelectedBond] = useState(null);
    const [initialAmount, setInitialAmount] = useState(1000);
    const [monthlyAmount, setMonthlyAmount] = useState(200);
    const [maturityDate, setMaturityDate] = useState('');
    const [rateAnnual, setRateAnnual] = useState(10.0);
    const [ipcaProj, setIpcaProj] = useState(4.5); // Default expected IPCA

    // Result State
    const [results, setResults] = useState(null);
    const [chartData, setChartData] = useState([]);

    // Load Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get RF Data (Bonds)
                const res = await fetch(getApiUrl('/api/rf'));
                const bondsData = await res.json();

                // Get ETF Data (Real-time yfinance)
                const resEtf = await fetch(getApiUrl('/api/etfs/treasury'));
                const etfData = await resEtf.json();

                let allAssets = [];
                if (Array.isArray(bondsData)) allAssets = [...allAssets, ...bondsData];
                if (Array.isArray(etfData)) allAssets = [...etfData, ...allAssets]; // ETFs at top

                setBonds(allAssets);

                // Get Indices
                const resInd = await fetch(getApiUrl('/api/indices'));
                const indices = await resInd.json();
                if (indices.ipca) {
                    setIpcaProj(parseFloat(indices.ipca.replace('%', '').replace(',', '.')));
                }
            } catch (err) {
                console.error("Error loading simulator data", err);
            }
        };
        fetchData();
    }, []);

    // Filter bonds for dropdown
    const filteredBonds = bonds.filter(b =>
        !searchTerm || b.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectBond = (bond) => {
        setSelectedBond(bond);
        setSearchTerm(bond.titulo);
        setIsDropdownOpen(false);

        // Auto-fill Logic
        if (bond.vencimento) {
            // Format DD/MM/YYYY -> YYYY-MM-DD for input
            const parts = bond.vencimento.split('/');
            if (parts.length === 3) {
                setMaturityDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                setMaturityDate(bond.vencimento); // Fallback if already ISO or different
            }
        }

        // Rate Parsing
        // Examples: "11,25%", "IPCA + 6,56%", "Selic + 0,10%"
        let rateVal = 0;

        // ETF Case (Real Yield from API)
        if (bond.yield_val !== undefined) {
            setRateAnnual(Number(bond.yield_val));
            return;
        }

        let rateStr = bond.taxa_compra || "";

        // Simple heuristic parsing
        if (rateStr.toUpperCase().includes("IPCA")) {
            // Extract fixed part
            const fixedStr = rateStr.replace(/[^\d.,]/g, "").replace(",", ".");
            const fixed = parseFloat(fixedStr) || 0;
            // The user will see formatting, but we store annual total expectation
            // Actually better to keep fixed rate separate from IPCA proj?
            // Let's set rateAnnual to Fixed Part + IPCA Proj
            // But we need to update rateAnnual state when IPCA Proj changes too.
            // For simplicity, let's treat rateAnnual as the TOTAL Nominal Rate for calculation.
            setRateAnnual(fixed + ipcaProj);
        } else if (rateStr.toUpperCase().includes("SELIC")) {
            // Selic is variable. Let's assume current Selic (~10.75 or whatever from API).
            // If we have access to indices we could use that. defaulting to 10.75.
            setRateAnnual(10.75);
        } else {
            // Prefixado
            const val = parseFloat(rateStr.replace("R$", "").replace("%", "").replace(",", "."));
            setRateAnnual(val || 10);
        }
    };

    // Calculation Effect
    useEffect(() => {
        calculateSimulation();
    }, [initialAmount, monthlyAmount, maturityDate, rateAnnual]);

    const calculateSimulation = () => {
        if (!maturityDate || !rateAnnual) return;

        const today = new Date();
        const end = new Date(maturityDate);

        // Calculate months diff
        const months = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());

        if (months <= 0) return;

        const data = [];
        let currentTotal = parseFloat(initialAmount);
        let currentInvested = parseFloat(initialAmount);
        const monthlyRate = Math.pow(1 + (rateAnnual / 100), 1 / 12) - 1;

        // Point 0
        data.push({
            month: 0,
            invested: currentInvested,
            total: currentTotal,
            label: today.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        });

        for (let i = 1; i <= months; i++) {
            // Apply Interest
            currentTotal = currentTotal * (1 + monthlyRate);

            // Add Contribution
            currentTotal += parseFloat(monthlyAmount);
            currentInvested += parseFloat(monthlyAmount);

            // Logic to plot points? If too many months, maybe skip some for performance?
            // Recharts handles reasonable amounts (e.g. 360 points).

            // Generate label date
            const d = new Date(today);
            d.setMonth(today.getMonth() + i);

            data.push({
                month: i,
                invested: parseFloat(currentInvested.toFixed(2)),
                total: parseFloat(currentTotal.toFixed(2)),
                label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            });
        }

        setChartData(data);
        setResults({
            endInvested: currentInvested,
            endTotal: currentTotal,
            yield: currentTotal - currentInvested
        });
    };

    return (
        <div className="rf-container">
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CalcIcon size={28} color="#fff" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>Simulador de Renda Fixa</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0), transparent)' }}></div>
            </header>

            {/* Responsive Styles */}
            <style>{`
                .calc-grid {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 24px;
                }
                @media (max-width: 1024px) {
                    .calc-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .calc-results-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }
                @media (max-width: 768px) {
                    .calc-results-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="calc-grid">

                {/* Controls - Left Panel */}
                <div className="rf-card glass-card" style={{ padding: '16px' }}>
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                        borderRadius: '16px 16px 0 0',
                        padding: '12px 16px',
                        margin: '-16px -16px 16px -16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <DollarSign size={20} color="#000000" />
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Parâmetros</h3>
                    </div>

                    <div className="rf-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Bond Selector */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Título</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px 12px'
                                }}>
                                    <Search size={18} color="#94a3b8" style={{ marginRight: '8px' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            width: '100%',
                                            outline: 'none',
                                            fontSize: '1rem'
                                        }}
                                    />
                                    {isDropdownOpen && <ChevronDown size={18} color="#94a3b8" onClick={() => setIsDropdownOpen(false)} style={{ cursor: 'pointer' }} />}
                                </div>

                                {isDropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        maxHeight: '200px', overflowY: 'auto',
                                        background: '#1e293b', border: '1px solid #333',
                                        borderRadius: '8px', zIndex: 100, marginTop: '4px',
                                        padding: '4px'
                                    }}>
                                        {filteredBonds.length > 0 ? filteredBonds.map((b, idx) => (
                                            <div key={idx}
                                                onClick={() => handleSelectBond(b)}
                                                style={{
                                                    padding: '10px 12px',
                                                    cursor: 'pointer',
                                                    color: '#e2e8f0',
                                                    fontSize: '0.9rem',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                {b.titulo}
                                            </div>
                                        )) : (
                                            <div style={{ padding: '8px', color: '#666', textAlign: 'center' }}>Nenhum título</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Numeric Inputs */}
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Aporte Inicial (R$)</label>
                            <input type="number"
                                value={initialAmount} onChange={e => setInitialAmount(e.target.value)}
                                style={{
                                    width: '100%', background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                                    padding: '12px', borderRadius: '8px', fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Aporte Mensal (R$)</label>
                            <input type="number"
                                value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)}
                                style={{
                                    width: '100%', background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                                    padding: '12px', borderRadius: '8px', fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Data de Vencimento</label>
                            <input type="date"
                                value={maturityDate} onChange={e => setMaturityDate(e.target.value)}
                                style={{
                                    width: '100%', background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                                    padding: '12px', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Taxa Anual Esperada (%)</label>
                            <input type="number" step="0.01"
                                value={rateAnnual} onChange={e => setRateAnnual(e.target.value)}
                                style={{
                                    width: '100%', background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                                    padding: '12px', borderRadius: '8px', fontSize: '1rem'
                                }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                Considerando taxa fixa + IPCA projetado.
                            </span>
                        </div>

                    </div>
                </div>

                {/* Results - Right Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Summary Cards Grid */}
                    <div className="calc-results-grid">
                        <div className="rf-card glass-card" style={{ padding: '16px' }}>
                            <div className="rf-card-header" style={{
                                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                                borderRadius: '16px 16px 0 0',
                                padding: '12px 16px',
                                margin: '-16px -16px 16px -16px',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <DollarSign size={20} color="#000000" />
                                </div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Total Investido</h3>
                            </div>
                            <div className="rf-card-content">
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc' }}>
                                    R$ {results ? results.endInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
                                </span>
                            </div>
                        </div>

                        <div className="rf-card glass-card" style={{ padding: '16px' }}>
                            <div className="rf-card-header" style={{
                                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                                borderRadius: '16px 16px 0 0',
                                padding: '12px 16px',
                                margin: '-16px -16px 16px -16px',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <TrendingUp size={20} color="#000000" />
                                </div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Total Acumulado</h3>
                            </div>
                            <div className="rf-card-content">
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>
                                    R$ {results ? results.endTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
                                </span>
                            </div>
                        </div>

                        <div className="rf-card glass-card" style={{ padding: '16px' }}>
                            <div className="rf-card-header" style={{
                                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                                borderRadius: '16px 16px 0 0',
                                padding: '12px 16px',
                                margin: '-16px -16px 16px -16px',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <TrendingUp size={20} color="#000000" />
                                </div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Rendimento</h3>
                            </div>
                            <div className="rf-card-content">
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>
                                    + R$ {results ? results.yield.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                    * Valor bruto. Sujeito a IR no resgate.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="rf-card glass-card" style={{ flex: 1, minHeight: '400px', padding: '16px' }}>
                        <div className="rf-card-header" style={{
                            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                            borderRadius: '16px 16px 0 0',
                            padding: '12px 16px',
                            margin: '-16px -16px 16px -16px',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <TrendingUp size={20} color="#000000" />
                            </div>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Evolução Patrimonial</h3>
                        </div>
                        <div className="rf-card-content" style={{ height: '350px', padding: '0' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="label" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} minTickGap={30} />
                                    <YAxis
                                        stroke="#666"
                                        tick={{ fill: '#666', fontSize: 12 }}
                                        tickFormatter={(val) => `R$ ${val / 1000}k`}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #333', borderRadius: '8px' }}
                                        formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="total" name="Total Acumulado" stroke="#4ade80" strokeWidth={3} dot={false} />
                                    <Line type="monotone" dataKey="invested" name="Total Investido" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Calculator;
