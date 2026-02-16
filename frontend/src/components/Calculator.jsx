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
    const [initialAmount, setInitialAmount] = useState(0);
    const [monthlyAmount, setMonthlyAmount] = useState(0);
    const [maturityDate, setMaturityDate] = useState('');
    const [rateAnnual, setRateAnnual] = useState(10.0);
    const [ipcaProj, setIpcaProj] = useState(4.5); // Default expected IPCA
    const [selicRate, setSelicRate] = useState(10.75); // Default Selic
    const [selectedIR, setSelectedIR] = useState(0); // 0, 0.15 or 0.225

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
                    const ipcaValue = parseFloat(indices.ipca.replace('%', '').replace(',', '.'));
                    setIpcaProj(ipcaValue);
                }
                if (indices.selic) {
                    const selicValue = parseFloat(indices.selic.replace('%', '').replace(',', '.'));
                    setSelicRate(selicValue);
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
        if (!bond) return;
        setSelectedBond(bond);
        setSearchTerm(bond.titulo);
        setIsDropdownOpen(false);

        // Auto-fill Maturity Date
        if (bond.vencimento) {
            const parts = bond.vencimento.split('/');
            if (parts.length === 3) {
                setMaturityDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                setMaturityDate(bond.vencimento);
            }
        }

        // Rate Parsing with IPCA/Selic Summation
        let rateStr = bond.taxa_compra || "";
        const titleUpper = (bond.titulo || "").toUpperCase();

        // Detect if it's an IPCA bond (including Renda+ and Educa+)
        const isIPCA = titleUpper.includes("IPCA") ||
            titleUpper.includes("RENDA+") ||
            titleUpper.includes("EDUCA+") ||
            rateStr.toUpperCase().includes("IPCA");

        // Detect Selic
        const isSelic = titleUpper.includes("SELIC") || rateStr.toUpperCase().includes("SELIC");

        if (bond.yield_val !== undefined) {
            // ETFs already have the real-time yield from API
            setRateAnnual(Number(bond.yield_val));
        } else if (isIPCA) {
            // Extract the fixed percentage part (e.g., "6,56" from "IPCA + 6,56%")
            const match = rateStr.match(/(\d+([.,]\d+)?)/);
            const fixed = match ? parseFloat(match[0].replace(',', '.')) : 0;
            // Sum fixed rate + current IPCA projection from API
            const totalRate = fixed + (ipcaProj || 0);
            setRateAnnual(Number(totalRate.toFixed(2)));
            console.log(`IPCA Bond: Fixed ${fixed}% + IPCA ${ipcaProj}% = ${totalRate}%`);
        } else if (isSelic) {
            // Selic Logic: Fixed + Selic Index
            const match = rateStr.match(/(\d+([.,]\d+)?)/);
            const fixed = match ? parseFloat(match[0].replace(',', '.')) : 0;
            const totalRate = fixed + (selicRate || 10.75);
            setRateAnnual(Number(totalRate.toFixed(2)));
        } else {
            // Prefixado
            const val = parseFloat(rateStr.replace(/[^\d.,]/g, "").replace(",", "."));
            setRateAnnual(val || 10);
        }
    };

    // Robust Currency Input Handler (Mask)
    const handleCurrencyChange = (value, setter) => {
        // Only keep digits
        const digits = value.replace(/\D/g, '');
        if (digits === '') {
            setter(0);
            return;
        }
        // Cents logic (standard for currency inputs)
        const num = parseFloat(digits) / 100;
        setter(num);
    };

    const formatCurrency = (val) => {
        const value = typeof val === 'number' ? val : 0;
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Calculation Effect
    useEffect(() => {
        calculateSimulation();
    }, [initialAmount, monthlyAmount, maturityDate, rateAnnual, selectedIR]);

    const calculateSimulation = () => {
        if (!maturityDate || !rateAnnual) return;

        const today = new Date();
        const end = new Date(maturityDate);

        // Calculate months diff
        const months = (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth());

        if (months <= 0) return;

        const data = [];
        let currentTotal = parseFloat(initialAmount || 0);
        let currentInvested = parseFloat(initialAmount || 0);
        const monthlyRate = Math.pow(1 + (rateAnnual / 100), 1 / 12) - 1;

        // Point 0
        data.push({
            month: 0,
            invested: currentInvested,
            total: currentTotal,
            label: today.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        });

        for (let i = 1; i <= months; i++) {
            currentTotal = currentTotal * (1 + monthlyRate);
            currentTotal += parseFloat(monthlyAmount || 0);
            currentInvested += parseFloat(monthlyAmount || 0);

            const d = new Date(today);
            d.setMonth(today.getMonth() + i);

            data.push({
                month: i,
                invested: parseFloat(currentInvested.toFixed(2)),
                total: parseFloat(currentTotal.toFixed(2)),
                label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            });
        }

        setChartData(data.map(item => {
            const grossYield = item.total - item.invested;
            const netYield = grossYield * (1 - selectedIR);
            return {
                ...item,
                total: parseFloat((item.invested + netYield).toFixed(2)),
                grossTotal: item.total
            };
        }));

        const finalGrossYield = currentTotal - currentInvested;
        const finalNetYield = finalGrossYield * (1 - selectedIR);

        setResults({
            endInvested: currentInvested,
            endTotal: currentInvested + finalNetYield,
            yield: finalNetYield,
            grossTotal: currentTotal,
            grossYield: finalGrossYield
        });
    };

    return (
        <div className="rf-container">
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <CalcIcon size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Simulador de Renda Fixa</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
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
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Aporte Inicial</label>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                background: 'rgba(30, 41, 59, 0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '0 12px'
                            }}>
                                <span style={{ color: '#fff', fontWeight: 'bold', marginRight: '8px' }}>R$</span>
                                <input type="text"
                                    value={formatCurrency(initialAmount)}
                                    onChange={e => handleCurrencyChange(e.target.value, setInitialAmount)}
                                    style={{
                                        width: '100%', background: 'transparent',
                                        border: 'none', color: '#fff',
                                        padding: '12px 0', fontSize: '1rem', outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Aporte Mensal</label>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                background: 'rgba(30, 41, 59, 0.6)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '0 12px'
                            }}>
                                <span style={{ color: '#fff', fontWeight: 'bold', marginRight: '8px' }}>R$</span>
                                <input type="text"
                                    value={formatCurrency(monthlyAmount)}
                                    onChange={e => handleCurrencyChange(e.target.value, setMonthlyAmount)}
                                    style={{
                                        width: '100%', background: 'transparent',
                                        border: 'none', color: '#fff',
                                        padding: '12px 0', fontSize: '1rem', outline: 'none'
                                    }}
                                />
                            </div>
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
                                margin: '-16px -16px 12px -16px',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <DollarSign size={20} color="#000000" />
                                </div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Total Investido</h3>
                            </div>
                            <div className="rf-card-content" style={{ padding: '4px 16px' }}>
                                <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#f8fafc' }}>
                                    R$ {results ? results.endInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
                                </span>
                            </div>
                        </div>

                        <div className="rf-card glass-card" style={{ padding: '16px' }}>
                            <div className="rf-card-header" style={{
                                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                                borderRadius: '16px 16px 0 0',
                                padding: '12px 16px',
                                margin: '-16px -16px 12px -16px',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <TrendingUp size={20} color="#000000" />
                                </div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Total Acumulado</h3>
                            </div>
                            <div className="rf-card-content" style={{ padding: '4px 16px' }}>
                                <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#4ade80' }}>
                                    R$ {results ? results.endTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
                                </span>
                            </div>
                        </div>

                        <div className="rf-card glass-card" style={{ padding: '16px' }}>
                            <div className="rf-card-header" style={{
                                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                                borderRadius: '16px 16px 0 0',
                                padding: '12px 16px',
                                margin: '-16px -16px 12px -16px',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <TrendingUp size={20} color="#000000" />
                                </div>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Rendimento</h3>
                            </div>
                            <div className="rf-card-content" style={{ padding: '4px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#38bdf8' }}>
                                        + R$ {results ? results.yield.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0,00"}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', marginBottom: '8px' }}>
                                    {selectedIR > 0 ? `* Valor líquido após descontar ${selectedIR * 100}% de IR.` : '* Valor bruto. Sujeito a IR no resgate.'}
                                </div>

                                {/* IR Selection Buttons */}
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', gap: '2px', width: 'fit-content' }}>
                                    {[
                                        { label: 'Bruto', val: 0 },
                                        { label: '15%', val: 0.15 },
                                        { label: '22.5%', val: 0.225 }
                                    ].map((opt) => (
                                        <button
                                            key={opt.label}
                                            onClick={() => setSelectedIR(opt.val)}
                                            style={{
                                                background: selectedIR === opt.val ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                                                color: selectedIR === opt.val ? '#38bdf8' : '#64748b',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
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
    );
};

export default Calculator;
