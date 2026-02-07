import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Shield, TrendingUp, Zap, Umbrella, Lock, Activity, Anchor, BarChart3, PieChart as PieIcon, DollarSign } from 'lucide-react';
import './FixedIncome.css';

const Portfolio = () => {
    const [selectedProfile, setSelectedProfile] = useState('moderado');
    const [investmentValue, setInvestmentValue] = useState('');

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
                { name: "Reserva de Emergência", value: 50, color: "#3b82f6", icon: Shield, desc: "Liquidez Diária (Selic/CDB)" },
                { name: "Proteção IPCA", value: 30, color: "#a855f7", icon: Umbrella, desc: "Tesouro IPCA+ (Poder de Compra)" },
                { name: "Pré-Fixados", value: 20, color: "#10b981", icon: Lock, desc: "Rentabilidade garantida (Curto Prazo)" }
            ]
        },
        moderado: {
            label: "Moderado",
            description: "Busca rentabilidade acima da inflação com exposição controlada em ações de baixa volatilidade.",
            data: [
                { name: "Reserva de Emergência", value: 30, color: "#3b82f6", icon: Shield, desc: "Liquidez e Segurança" },
                { name: "Proteção IPCA", value: 40, color: "#a855f7", icon: Umbrella, desc: "Longo Prazo e Aposentadoria" },
                { name: "Ações (Baixa Volatilidade)", value: 30, color: "#f59e0b", icon: Anchor, desc: "Setores Perenes: Energia, Seguros, Saneamento", isStock: true }
            ]
        },
        arrojado: {
            label: "Arrojado",
            description: "Foco na multiplicação de patrimônio, aceitando maior volatilidade em setores cíclicos.",
            data: [
                { name: "Reserva de Emergência", value: 15, color: "#3b82f6", icon: Shield, desc: "Liquidez Mínima" },
                { name: "Proteção IPCA", value: 25, color: "#a855f7", icon: Umbrella, desc: "Garantia Real" },
                { name: "Ações (Baixa Volatilidade)", value: 25, color: "#f59e0b", icon: Anchor, desc: "Base de Dividendos (Bancos, Utilities)", isStock: true },
                { name: "Ações (Alta Volatilidade)", value: 35, color: "#ef4444", icon: Activity, desc: "Crescimento: Varejo, Tech, Commodities", isStock: true }
            ]
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
            <header className="rf-header" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <PieIcon size={28} color="#fff" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>Divisão de Portfólio</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0), transparent)' }}></div>
            </header>

            {/* Profile Selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px', flexWrap: 'wrap' }}>
                {Object.keys(profiles).map((key) => {
                    const isActive = selectedProfile === key;
                    const p = profiles[key];
                    return (
                        <button
                            key={key}
                            onClick={() => setSelectedProfile(key)}
                            style={{
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: isActive ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                                background: isActive ? '#ffffff' : 'rgba(255,255,255,0.05)',
                                color: isActive ? '#000000' : '#94a3b8',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '1rem',
                                transition: 'all 0.3s ease',
                                minWidth: '140px',
                                boxShadow: isActive ? '0 0 20px rgba(255,255,255,0.3)' : 'none'
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
                            background: 'rgba(30, 41, 59, 0.6)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: '500',
                            outline: 'none',
                            width: '180px',
                            minWidth: '150px',
                            textAlign: 'left',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                    />
                </div>
            </div>

            {/* Content Grid */}
            <div className="portfolio-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

                {/* Chart Section */}
                <div className="rf-card glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                    <div className="rf-card-header" style={{
                        width: 'calc(100% + 48px)', // Fix alignment (Inner + 2*Padding)
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.15), transparent)',
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
                                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.15), transparent)',
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

                                        {/* Volatility Badge for Stocks */}
                                        {isStock && (
                                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {item.name.includes("Baixa") ? (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '4px 8px', borderRadius: '4px' }}>Var. Baixa</span>
                                                ) : (
                                                    <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '4px 8px', borderRadius: '4px' }}>Var. Alta</span>
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

            {/* Mobile Responsiveness Styles */}
            <style>{`
                @media (max-width: 1024px) {
                    .portfolio-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Portfolio;
