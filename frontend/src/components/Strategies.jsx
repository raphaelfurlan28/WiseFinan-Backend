import React from 'react';
import {
    BookOpen, Shield, TrendingUp, TrendingDown, AlertTriangle,
    Target, Anchor, DollarSign, ArrowRight, Clock, Activity
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import '../styles/main.css';
import './Strategies.css';

const strategies = [
    {
        name: "Lançamento Coberto",
        subtitle: "Geração de Renda (Dividendos Sintéticos)",
        risk: "Baixo",
        view: "Alta Moderada / Lateral",
        icon: DollarSign,
        color: "#4ade80",
        sim: {
            ticker: "PETR4",
            stockPrice: 38.50,
            optionTicker: "PETRA40",
            strike: 40.00,
            premium: 1.20,
            expiry: "21/03/2026",
            breakeven: 37.30,
            maxProfit: 2.70,
            scenario: "Ação precisa ficar até R$ 40"
        },
        steps: [
            "Tenha as ações em carteira (Lote de 100).",
            "Venda uma CALL com strike acima do preço atual.",
            "Receba o prêmio imediatamente.",
            "Se subir muito, entrega ações no strike."
        ]
    },
    {
        name: "Venda de Put (Cash Secured)",
        subtitle: "Comprar Ações com Desconto",
        risk: "Baixo/Médio",
        view: "Alta / Lateral",
        icon: Anchor,
        color: "#38bdf8",
        sim: {
            ticker: "VALE3",
            stockPrice: 62.00,
            optionTicker: "VALEH58",
            strike: 58.00,
            premium: 0.85,
            expiry: "21/03/2026",
            breakeven: 57.15,
            maxProfit: 0.85,
            scenario: "Ação precisa ficar acima de R$ 58"
        },
        steps: [
            "Tenha dinheiro em garantia para o lote.",
            "Venda uma PUT com strike desejado.",
            "Receba o prêmio imediatamente.",
            "Se cair, compra a ação com desconto."
        ]
    },
    {
        name: "Trava de Alta",
        subtitle: "Ganhar na Alta com Custo Reduzido",
        risk: "Limitado",
        view: "Alta Moderada",
        icon: TrendingUp,
        color: "#facc15",
        sim: {
            ticker: "BBAS3",
            stockPrice: 28.00,
            optionTicker: "C30/C32",
            strike: 30.00,
            strikeB: 32.00,
            premium: 0.80,
            expiry: "21/03/2026",
            breakeven: 30.80,
            maxProfit: 1.20,
            scenario: "Ação precisa subir acima de R$ 30,80"
        },
        steps: [
            "Compre uma CALL de strike menor.",
            "Venda uma CALL de strike maior.",
            "Custo menor que comprar a seco.",
            "Lucro máx = diferença strikes - custo."
        ]
    },
    {
        name: "Trava de Baixa",
        subtitle: "Ganhar na Queda com Proteção",
        risk: "Limitado",
        view: "Baixa Moderada",
        icon: TrendingDown,
        color: "#f87171",
        sim: {
            ticker: "MGLU3",
            stockPrice: 12.50,
            optionTicker: "P14/P12",
            strike: 14.00,
            strikeB: 12.00,
            premium: 0.70,
            expiry: "21/03/2026",
            breakeven: 13.30,
            maxProfit: 1.30,
            scenario: "Ação precisa cair abaixo de R$ 13,30"
        },
        steps: [
            "Compre uma PUT de strike maior.",
            "Venda uma PUT de strike menor.",
            "Lucra se o ativo cair.",
            "Risco limitado ao custo."
        ]
    },
    {
        name: "Collar",
        subtitle: "Proteção Total (Seguro Financiado)",
        risk: "Muito Baixo",
        view: "Proteção / Alta Limitada",
        icon: Shield,
        color: "#a855f7",
        sim: {
            ticker: "ITUB4",
            stockPrice: 32.00,
            optionTicker: "P28 + C36",
            strike: 28.00,
            strikeB: 36.00,
            premium: 0,
            expiry: "21/03/2026",
            breakeven: 32.00,
            maxProfit: 4.00,
            scenario: "Proteção em R$ 28, limite de alta R$ 36"
        },
        steps: [
            "Tenha a ação em carteira.",
            "Compre uma PUT como seguro.",
            "Financie vendendo uma CALL.",
            "Custo zero se prêmios iguais."
        ]
    },
    {
        name: "Compra a Seco (Pózinho)",
        subtitle: "Alavancagem Explosiva (Alto Risco)",
        risk: "Alto (Perda Total)",
        view: "Movimento Brusco",
        icon: AlertTriangle,
        color: "#ef4444",
        sim: {
            ticker: "BOVA11",
            stockPrice: 125.00,
            optionTicker: "BOVAK140",
            strike: 140.00,
            premium: 0.15,
            expiry: "21/03/2026",
            breakeven: 140.15,
            maxProfit: "Ilimitado",
            scenario: "Ação precisa explodir acima de R$ 140,15"
        },
        steps: [
            "Compre CALL ou PUT muito OTM.",
            "Custo muito baixo (centavos).",
            "Se explodir, valoriza 1000%+.",
            "Se não, perde tudo (vira pó)."
        ]
    },
    {
        name: "Iron Condor",
        subtitle: "Lucrar com Lateralização",
        risk: "Limitado",
        view: "Lateral (Sem movimento)",
        icon: Target,
        color: "#6366f1",
        sim: {
            ticker: "PETR4",
            stockPrice: 38.00,
            optionTicker: "C40/42 + P36/34",
            strike: 36.00,
            strikeB: 40.00,
            premium: 0.60,
            expiry: "21/03/2026",
            breakeven: "35.40 - 40.60",
            maxProfit: 0.60,
            scenario: "Ação precisa ficar entre R$ 36 e R$ 40"
        },
        steps: [
            "Vende Trava de Alta + Trava de Baixa OTM.",
            "Recebe crédito na montagem.",
            "Se ficar entre as pontas, lucro máximo.",
            "Prejuízo se explodir para qualquer lado."
        ]
    },
    {
        name: "Straddle / Strangle",
        subtitle: "Apostar na Volatilidade Extrema",
        risk: "Limitado ao Custo",
        view: "Explosão (Qualquer lado)",
        icon: TrendingUp,
        color: "#ec4899",
        sim: {
            ticker: "VALE3",
            stockPrice: 62.00,
            optionTicker: "C62 + P62",
            strike: 62.00,
            premium: 2.50,
            expiry: "21/03/2026",
            breakeven: "59.50 ou 64.50",
            maxProfit: "Ilimitado",
            scenario: "Ação precisa mover mais de R$ 2,50"
        },
        steps: [
            "Compre CALL e PUT do mesmo strike.",
            "Lucra se subir ou cair muito.",
            "Prejuízo se ficar parado."
        ]
    }
];

// Helper to generate payoff data based on strategy
const getPayoffData = (name, sim) => {
    const data = [];
    const stock = sim?.stockPrice || 100;
    const strike = sim?.strike || stock;

    switch (name) {
        case "Lançamento Coberto":
        case "Venda de Put (Cash Secured)":
            data.push({ price: stock - 10, pnl: -8 });
            data.push({ price: stock - 5, pnl: -3 });
            data.push({ price: sim?.breakeven || stock - 2, pnl: 0 });
            data.push({ price: strike, pnl: sim?.maxProfit || 3 });
            data.push({ price: stock + 10, pnl: sim?.maxProfit || 3 });
            break;

        case "Trava de Alta":
            data.push({ price: stock - 5, pnl: -(sim?.premium || 0.8) });
            data.push({ price: strike, pnl: -(sim?.premium || 0.8) });
            data.push({ price: sim?.breakeven || strike + 1, pnl: 0 });
            data.push({ price: sim?.strikeB || strike + 2, pnl: sim?.maxProfit || 1.2 });
            data.push({ price: stock + 10, pnl: sim?.maxProfit || 1.2 });
            break;

        case "Trava de Baixa":
            data.push({ price: stock - 5, pnl: sim?.maxProfit || 1.3 });
            data.push({ price: sim?.strikeB || strike - 2, pnl: sim?.maxProfit || 1.3 });
            data.push({ price: sim?.breakeven || strike - 1, pnl: 0 });
            data.push({ price: strike, pnl: -(sim?.premium || 0.7) });
            data.push({ price: stock + 5, pnl: -(sim?.premium || 0.7) });
            break;

        case "Collar":
            data.push({ price: stock - 10, pnl: -(stock - strike) });
            data.push({ price: strike, pnl: -(stock - strike) });
            data.push({ price: stock, pnl: 0 });
            data.push({ price: sim?.strikeB || stock + 4, pnl: sim?.maxProfit || 4 });
            data.push({ price: stock + 10, pnl: sim?.maxProfit || 4 });
            break;

        case "Compra a Seco (Pózinho)":
            data.push({ price: stock, pnl: -(sim?.premium || 0.15) });
            data.push({ price: strike - 5, pnl: -(sim?.premium || 0.15) });
            data.push({ price: strike, pnl: -(sim?.premium || 0.15) });
            data.push({ price: strike + 5, pnl: 5 - (sim?.premium || 0.15) });
            data.push({ price: strike + 15, pnl: 15 - (sim?.premium || 0.15) });
            break;

        case "Iron Condor":
            data.push({ price: stock - 10, pnl: -1.4 });
            data.push({ price: strike, pnl: sim?.maxProfit || 0.6 });
            data.push({ price: stock, pnl: sim?.maxProfit || 0.6 });
            data.push({ price: sim?.strikeB || stock + 2, pnl: sim?.maxProfit || 0.6 });
            data.push({ price: stock + 10, pnl: -1.4 });
            break;

        case "Straddle / Strangle":
            data.push({ price: stock - 10, pnl: 10 - (sim?.premium || 2.5) });
            data.push({ price: stock - 5, pnl: 5 - (sim?.premium || 2.5) });
            data.push({ price: stock, pnl: -(sim?.premium || 2.5) });
            data.push({ price: stock + 5, pnl: 5 - (sim?.premium || 2.5) });
            data.push({ price: stock + 10, pnl: 10 - (sim?.premium || 2.5) });
            break;

        default:
            return [];
    }
    return data;
};

// Enhanced chart with simulation info
const StrategyChart = ({ strategy, color, sim }) => {
    const data = getPayoffData(strategy, sim);

    // Strategies where you RECEIVE premium (sell strategies)
    const isSellStrategy = strategy === "Lançamento Coberto" || strategy === "Venda de Put (Cash Secured)";

    if (!data.length) return null;

    const gradId = `grad-${strategy.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <div style={{ marginTop: '12px' }}>
            {/* Simulation Info Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '12px',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Ativo</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>{sim?.ticker}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>R$ {sim?.stockPrice?.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Opção</div>
                    <div style={{ fontSize: '0.85rem', color: color, fontWeight: 'bold' }}>{sim?.optionTicker}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Strike R$ {sim?.strike?.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Vencimento</div>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Clock size={12} /> {sim?.expiry}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: 100, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
                        <XAxis dataKey="price" hide />
                        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            labelStyle={{ color: '#94a3b8' }}
                            formatter={(value) => [`R$ ${value.toFixed(2)}`, 'P/L']}
                            labelFormatter={(value) => `Preço: R$ ${value}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="pnl"
                            stroke={color}
                            fill={`url(#${gradId})`}
                            strokeWidth={3}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Key Metrics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '12px'
            }}>
                <div style={{
                    background: 'rgba(74, 222, 128, 0.1)',
                    padding: '8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid rgba(74, 222, 128, 0.2)'
                }}>
                    <div style={{ fontSize: '0.65rem', color: '#4ade80', textTransform: 'uppercase' }}>Lucro Máx</div>
                    <div style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: 'bold' }}>
                        {typeof sim?.maxProfit === 'number' ? `R$ ${sim.maxProfit.toFixed(2)}` : sim?.maxProfit}
                    </div>
                </div>
                <div style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    padding: '8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid rgba(251, 191, 36, 0.2)'
                }}>
                    <div style={{ fontSize: '0.65rem', color: '#fbbf24', textTransform: 'uppercase' }}>Breakeven</div>
                    <div style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>
                        {typeof sim?.breakeven === 'number' ? `R$ ${sim.breakeven.toFixed(2)}` : sim?.breakeven}
                    </div>
                </div>
                <div style={{
                    background: isSellStrategy ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: isSellStrategy ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    <div style={{ fontSize: '0.65rem', color: isSellStrategy ? '#4ade80' : '#ef4444', textTransform: 'uppercase' }}>
                        {isSellStrategy ? 'Prêmio Recebido' : 'Custo'}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: isSellStrategy ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>
                        {isSellStrategy ? '+' : '-'} R$ {sim?.premium?.toFixed(2) || '0.00'}
                    </div>
                </div>
            </div>

            {/* Scenario */}
            <div style={{
                marginTop: '12px',
                padding: '10px',
                background: `${color}15`,
                borderRadius: '8px',
                borderLeft: `3px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Activity size={16} color={color} />
                <span style={{ fontSize: '0.85rem', color: '#fff' }}>{sim?.scenario}</span>
            </div>
        </div>
    );
};

const Strategies = () => {
    React.useEffect(() => {
        const hash = window.location.hash;
        if (hash) {
            const id = hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, []);

    return (
        <div className="rf-container">
            {/* Header */}
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <BookOpen size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Estratégias de Opções</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                gap: '24px',
                paddingBottom: '40px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {strategies.map((strat, idx) => (
                    <div
                        key={idx}
                        id={strat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[()]/g, '')}
                        className="rf-card glass-card"
                    >
                        {/* Header */}
                        <div className="rf-card-header" style={{
                            background: `linear-gradient(90deg, ${strat.color}35, transparent)`
                        }}>
                            <div className="rf-card-icon" style={{ background: strat.color }}>
                                <strat.icon size={20} color="#fff" />
                            </div>
                            <div className="rf-card-title">
                                <h3>{strat.name}</h3>
                                <span>{strat.subtitle}</span>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="rf-card-content">

                            {/* Tags */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                <div className="strategy-badge">
                                    <span>Risco:</span> <span style={{ color: strat.color, fontWeight: 'bold' }}>{strat.risk}</span>
                                </div>
                                <div className="strategy-badge">
                                    <span>Cenário:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{strat.view}</span>
                                </div>
                            </div>

                            {/* Enhanced Chart with Simulation Data */}
                            <StrategyChart strategy={strat.name} color={strat.color} sim={strat.sim} />

                            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '16px 0' }}></div>

                            {/* Steps */}
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Como Executar</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {strat.steps.map((step, sIdx) => (
                                        <div key={sIdx} className="step-item">
                                            <ArrowRight size={12} color={strat.color} style={{ marginTop: '3px', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.85rem' }}>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Strategies;
