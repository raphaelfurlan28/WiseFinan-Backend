import React from 'react';
import {
    BookOpen, Shield, TrendingUp, TrendingDown, AlertTriangle,
    Target, Anchor, DollarSign, ArrowRight
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import '../styles/main.css';
import '../styles/main.css';
import './Strategies.css';

const strategies = [
    {
        name: "Lançamento Coberto",
        subtitle: "Geração de Renda (Dividendos Sintéticos)",
        risk: "Baixo",
        profit: "Moderado",
        view: "Alta Moderada / Lateral",
        profitCondition: "Você lucra se a ação subir, ficar parada ou cair levemente (até o preço de custo - prêmio). O lucro máximo ocorre se a ação estiver acima do strike da Call vendida no vencimento.",
        icon: DollarSign,
        color: "#4ade80",
        steps: [
            "1. Tenha as ações em carteira (Lote de 100).",
            "2. Venda uma CALL (Opção de Compra) com strike acima do preço atual (OTM).",
            "3. Receba o prêmio imediatamente.",
            "4. Se subir muito, você entrega as ações no strike + prêmio. Se cair/lateralizar, você fica com o prêmio e as ações."
        ],
        example: "Ação R$ 30,00. Vende Call Strike R$ 32,00 por R$ 0,80. Lucro máx: R$ 2,80 (R$ 2 na ação + R$ 0,80 prêmio)."
    },
    {
        name: "Venda de Put (Cash Secured)",
        subtitle: "Comprar Ações com Desconto",
        risk: "Baixo/Médio",
        profit: "Moderado",
        view: "Alta / Lateral",
        profitCondition: "Você lucra se a ação subir, ficar lateral ou cair até o strike. O lucro máximo é limitado ao prêmio recebido, e acontece se a ação terminar acima do strike.",
        icon: Anchor,
        color: "#38bdf8",
        steps: [
            "1. Tenha dinheiro em garantia para comprar o lote.",
            "2. Venda uma PUT com strike no preço que deseja pagar (abaixo do atual).",
            "3. Receba o prêmio.",
            "4. Se cair abaixo do strike, você é exercido e compra a ação barato (+ prêmio). Se subir, lucro total é o prêmio."
        ],
        example: "Ação R$ 30,00. Vende Put Strike R$ 28,00 por R$ 0,50. Se cair a R$ 27, compra por R$ 28 (custo efetivo R$ 27,50)."
    },
    {
        name: "Trava de Alta",
        subtitle: "Ganhar na Alta com Custo Reduzido",
        risk: "Limitado",
        profit: "Limitado",
        view: "Alta Moderada",
        profitCondition: "Você lucra se o ativo subir acima do seu ponto de equilíbrio (Strike A + Custo). O lucro máximo é atingido se o ativo superar o Strike B (ponta vendida).",
        icon: TrendingUp,
        color: "#facc15",
        steps: [
            "1. Compre uma CALL de strike menor (A).",
            "2. Venda uma CALL de strike maior (B).",
            "3. O custo da montagem é menor que comprar a seco.",
            "4. O lucro máximo é a diferença entre strikes (B - A) menos o custo."
        ],
        example: "Compra Call Strike 30 e Vende Call Strike 32. Paga R$ 0,80. Lucro máx R$ 2,00 - 0,80 = R$ 1,20."
    },
    {
        name: "Trava de Baixa",
        subtitle: "Ganhar na Queda com Proteção",
        risk: "Limitado",
        profit: "Limitado",
        view: "Baixa Moderada",
        profitCondition: "Você lucra se o ativo cair abaixo do ponto de equilíbrio. O lucro máximo ocorre se o ativo estiver abaixo do Strike B (ponta vendida) no vencimento.",
        icon: TrendingDown,
        color: "#f87171",
        steps: [
            "1. Compre uma PUT de strike maior (A).",
            "2. Venda uma PUT de strike menor (B).",
            "3. Lucra se o ativo cair até o strike B.",
            "4. Risco limitado ao custo da montagem."
        ],
        example: "Compra Put Strike 30 e Vende Put Strike 28. Paga R$ 0,70. Lucro máx R$ 1,30."
    },
    {
        name: "Collar",
        subtitle: "Proteção Total (Seguro Financiado)",
        risk: "Muito Baixo",
        profit: "Limitado",
        view: "Proteção / Alta Limitada",
        profitCondition: "Você lucra com a valorização da ação até o strike da Call. Se a ação cair, sua perda é travada no strike da Put. Ideal para proteger ganhos já obtidos.",
        icon: Shield,
        color: "#a855f7",
        steps: [
            "1. Tenha a ação em carteira.",
            "2. Compre uma PUT (Seguro) para proteção contra queda.",
            "3. Financie o seguro vendendo uma CALL (Lançamento Coberto) OTM.",
            "4. 'Custo Zero' se o prêmio da Call pagar a Put."
        ],
        example: "Ação R$ 30. Compra Put 28 (Proteção) e Vende Call 33 (Financiamento). Risco travado em R$ 28."
    },
    {
        name: "Compra a Seco (Pózinho)",
        subtitle: "Alavancagem Explosiva (Alto Risco)",
        risk: "Alto (Perda Total)",
        profit: "Ilimitado",
        view: "Movimento Brusco",
        profitCondition: "Você só lucra se o ativo tiver uma movimentação forte e rápida na direção escolhida, superando o preço de exercício + prêmio pago. Se ficar parado, vira pó.",
        icon: AlertTriangle,
        color: "#ef4444",
        steps: [
            "1. Compre uma CALL ou PUT muito fora do dinheiro (OTM).",
            "2. Custo muito baixo (centavos).",
            "3. Se o ativo explodir, a opção valoriza 1.000%+. Se não, vira pó (perde o que colocou).",
            "4. Use apenas 'dinheiro da pinga'."
        ],
        example: "Compra Call Strike 40 (Ativo a 30) por R$ 0,05. Se ativo for a 45, opção vale R$ 5,00 (100x)."
    },
    {
        name: "Iron Condor",
        subtitle: "Lucrar com Lateralização",
        risk: "Limitado",
        profit: "Limitado",
        view: "Lateral (Sem movimento)",
        profitCondition: "Você lucra se o preço do ativo permanecer DENTRO de um intervalo específico até o vencimento. Se sair muito para cima ou para baixo, você tem prejuízo limitado.",
        icon: Target,
        color: "#6366f1", // Indigo
        steps: [
            "1. Vende uma Trava de Alta (OTM) e Vende uma Trava de Baixa (OTM).",
            "2. Recebe crédito na montagem.",
            "3. Se o ativo ficar entre as pontas vendidas até o vencimento, lucro máximo.",
            "4. Prejuízo se explodir para qualquer lado."
        ],
        example: "Vende Call 35/37 e Vende Put 25/23 (Ativo a 30). Ganha se ficar entre 25 e 35."
    },
    {
        name: "Straddle / Strangle",
        subtitle: "Apostar na Volatilidade Extrema",
        risk: "Limitado ao Custo",
        profit: "Alto",
        view: "Explosão (Qualquer lado)",
        profitCondition: "Você lucra se o ativo se mover MUITO para qualquer lado (subir muito ou cair muito), cobrindo o custo das duas opções compradas. Se ficar parado, prejuízo total.",
        icon: TrendingUp, // Using generic trend
        color: "#ec4899", // Pink
        steps: [
            "1. Compre uma CALL e uma PUT do mesmo strike (Straddle) ou strikes diferentes (Strangle).",
            "2. Lucra se o ativo subir MUITO ou cair MUITO.",
            "3. Prejuízo se o ativo ficar parado (perde os dois prêmios)."
        ],
        example: "Compra Call 30 e Put 30. Custo R$ 2,00. Lucra se passar de 32 ou cair abaixo de 28."
    }
];

// Helper to generate idealized payoff data
const getPayoffData = (name) => {
    const data = [];
    switch (name) {
        case "Lançamento Coberto":
        case "Venda de Put (Cash Secured)":
            data.push({ price: 80, pnl: -15 });
            data.push({ price: 90, pnl: -5 });
            data.push({ price: 95, pnl: 0 }); // Breakeven
            data.push({ price: 100, pnl: 5 }); // Strike
            data.push({ price: 110, pnl: 5 }); // Cap
            data.push({ price: 120, pnl: 5 });
            break;

        case "Trava de Alta":
            data.push({ price: 80, pnl: -5 });
            data.push({ price: 90, pnl: -5 });
            data.push({ price: 95, pnl: 0 });
            data.push({ price: 100, pnl: 5 });
            data.push({ price: 110, pnl: 5 });
            break;

        case "Trava de Baixa":
            data.push({ price: 80, pnl: 5 });
            data.push({ price: 90, pnl: 5 });
            data.push({ price: 95, pnl: 0 });
            data.push({ price: 100, pnl: -5 });
            data.push({ price: 110, pnl: -5 });
            break;

        case "Collar":
            data.push({ price: 80, pnl: -5 });
            data.push({ price: 90, pnl: -5 });
            data.push({ price: 95, pnl: 0 });
            data.push({ price: 100, pnl: 5 });
            data.push({ price: 110, pnl: 5 });
            break;

        case "Compra a Seco (Pózinho)":
            data.push({ price: 80, pnl: -2 });
            data.push({ price: 100, pnl: -2 });
            data.push({ price: 110, pnl: 8 });
            data.push({ price: 120, pnl: 18 });
            break;

        case "Iron Condor":
            data.push({ price: 80, pnl: -10 });
            data.push({ price: 90, pnl: 5 });
            data.push({ price: 100, pnl: 5 });
            data.push({ price: 110, pnl: -10 });
            break;

        case "Straddle / Strangle":
            data.push({ price: 80, pnl: 10 });
            data.push({ price: 90, pnl: 0 });
            data.push({ price: 100, pnl: -10 });
            data.push({ price: 110, pnl: 0 });
            data.push({ price: 120, pnl: 10 });
            break;

        default:
            return [];
    }
    return data;
};

// Helper to get zones
const getZones = (name) => {
    switch (name) {
        case "Lançamento Coberto":
        case "Venda de Put (Cash Secured)":
        case "Trava de Alta":
        case "Collar":
            return [
                { x1: 80, x2: 95, type: 'loss' },
                { x1: 95, x2: 120, type: 'profit' }
            ];
        case "Trava de Baixa":
            return [
                { x1: 80, x2: 95, type: 'profit' },
                { x1: 95, x2: 120, type: 'loss' }
            ];
        case "Compra a Seco (Pózinho)":
            return [
                { x1: 80, x2: 105, type: 'loss' },
                { x1: 105, x2: 120, type: 'profit' }
            ];
        case "Iron Condor":
            return [
                { x1: 80, x2: 88, type: 'loss' },
                { x1: 88, x2: 102, type: 'profit' },
                { x1: 102, x2: 120, type: 'loss' }
            ];
        case "Straddle / Strangle":
            return [
                { x1: 80, x2: 90, type: 'profit' },
                { x1: 90, x2: 110, type: 'loss' },
                { x1: 110, x2: 120, type: 'profit' }
            ];
        default:
            return [];
    }
};

const StrategyChart = ({ strategy, color }) => {
    const data = getPayoffData(strategy);
    const zones = getZones(strategy);

    if (!data.length) return null;

    const gradId = `grad-${strategy.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <div style={{ width: '100%', height: 100, marginTop: '8px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    {/* Zones Background */}
                    {zones.map((zone, i) => (
                        <ReferenceArea
                            key={i}
                            x1={zone.x1}
                            x2={zone.x2}
                            fill={zone.type === 'profit' ? '#4ade80' : '#ef4444'}
                            fillOpacity={0.1}
                        />
                    ))}

                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />

                    <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke={color}
                        fill={`url(#${gradId})`}
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Labels Overlay */}
            <div style={{
                position: 'absolute', top: 5, left: 0, right: 0, bottom: 0,
                display: 'flex', justifyContent: 'space-between', padding: '0 10px',
                pointerEvents: 'none', fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase'
            }}>
                <div style={{ position: 'absolute', bottom: 5, left: '10%', color: '#ef4444', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '4px' }}>Prejuízo</div>
                <div style={{ position: 'absolute', top: 5, right: '10%', color: '#4ade80', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '4px' }}>Lucro</div>
            </div>
        </div>
    );
};

const Strategies = () => {
    return (
        <div className="rf-container">
            {/* Header */}
            <header className="rf-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <BookOpen size={28} color="#fff" />
                    </div>
                    <h1>Estratégias de Opções</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0), transparent)', marginTop: '16px' }}></div>
            </header>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px',
                paddingBottom: '40px'
            }}>
                {strategies.map((strat, idx) => (
                    <div key={idx} className="rf-card glass-card">
                        {/* Header */}
                        <div className="rf-card-header" style={{
                            background: `linear-gradient(90deg, ${strat.color}20, transparent)`
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

                            {/* Chart (NEW) */}
                            <div className="chart-container-wrapper">
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payoff Estimado</span>
                                <StrategyChart strategy={strat.name} color={strat.color} />
                            </div>

                            {/* Tags */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <div className="strategy-badge">
                                    <span>Risco:</span> <span style={{ color: strat.color, fontWeight: 'bold' }}>{strat.risk}</span>
                                </div>
                                <div className="strategy-badge">
                                    <span>Cenário:</span> <span style={{ color: '#fff', fontWeight: 'bold' }}>{strat.view}</span>
                                </div>
                            </div>

                            {/* Profit Condition */}
                            <div className="profit-box" style={{
                                background: `${strat.color}10`,
                                border: `1px solid ${strat.color}20`
                            }}>
                                <span style={{ fontSize: '0.75rem', color: strat.color, fontWeight: 'bold', textTransform: 'uppercase' }}>Quando Lucra?</span>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#fff', lineHeight: '1.4' }}>
                                    {strat.profitCondition}
                                </p>
                            </div>

                            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

                            {/* Steps */}
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Como Executar</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {strat.steps.map((step, sIdx) => (
                                        <div key={sIdx} className="step-item">
                                            <ArrowRight size={14} color={strat.color} style={{ marginTop: '4px', flexShrink: 0 }} />
                                            <span>{step.replace(/^\d+\.\s/, '')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Example */}
                            <div className="example-box" style={{ borderLeftColor: strat.color }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>EXEMPLO PRÁTICO</span>
                                <span style={{ fontSize: '0.85rem', color: '#fff', fontStyle: 'italic' }}>"{strat.example}"</span>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Strategies;
