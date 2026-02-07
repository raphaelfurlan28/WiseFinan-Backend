import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ModernLoader from './ModernLoader';
import '../components/FixedIncome.css';
import './OptionsModule.css'; // Import Options Styles
import '../styles/main.css';
import { TrendingUp, TrendingDown, Landmark, ChevronRight, DollarSign, Calendar, AlertCircle, X, Sparkles, PieChart, Crosshair } from 'lucide-react';
import { getApiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';


const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    if (dateStr.includes("-")) {
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    }
    return dateStr;
};

const Home = ({ onNavigate }) => {
    const [opportunities, setOpportunities] = useState([]);
    const [expensiveOpportunities, setExpensiveOpportunities] = useState([]);
    const [fixedOpportunities, setFixedOpportunities] = useState([]);
    const [guaranteeOpportunities, setGuaranteeOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null);
    const [selectedOperation, setSelectedOperation] = useState(null);

    // Operation Modal Component - Supports 4 strategies
    const OperationModal = ({ operation, onClose }) => {
        if (!operation) return null;

        const { option, type, stock, strategy } = operation;
        // strategy can be: 'venda_put', 'venda_call', 'compra_put', 'compra_call'

        const strategyNames = {
            'venda_put': 'Venda de Put (Cash Secured)',
            'venda_call': 'Lançamento Coberto',
            'compra_put': 'Compra de Put a Seco',
            'compra_call': 'Compra de Call a Seco'
        };
        const strategyName = strategyNames[strategy] || 'Operação';

        const isPut = type === 'put';
        const isVenda = strategy?.startsWith('venda');
        const strategyColor = isPut ? '#ef4444' : '#38bdf8';

        const stockPrice = parseFloat((stock?.price || "0").replace('R$', '').replace('.', '').replace(',', '.'));
        const strikeVal = parseFloat(String(option.strike).replace(',', '.')) || 0;
        const premium = option.last_price || 0;
        const premiumTotal = premium * 100; // 1 lote = 100 opções
        const guaranteeNeeded = strikeVal * 100; // valor p/ 1 lote
        const costTotal = premiumTotal; // custo da compra a seco

        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(15px)'
            }} onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '92%', maxWidth: '420px', maxHeight: '85vh',
                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                        borderRadius: '24px', padding: '24px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        overflowY: 'auto', overflow: 'visible'
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: `${strategyColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Crosshair size={20} color={strategyColor} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>{strategyName}</h3>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{option.ticker} • {stock?.ticker}</span>
                            </div>
                        </div>
                    </div>

                    {/* Fechar button - positioned at top right */}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: -40, right: 0,
                            background: 'transparent',
                            border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#cbd5e1',
                            fontSize: '0.8rem', fontWeight: '300',
                            padding: '0'
                        }}
                    >
                        Fechar
                    </button>

                    {/* Dados da Operação */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', marginBottom: '20px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Ação Atual</span>
                                <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600 }}>R$ {stockPrice.toFixed(2).replace('.', ',')}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Strike</span>
                                <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 600 }}>R$ {option.strike}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>{isVenda ? 'Prêmio/Opção' : 'Custo/Opção'}</span>
                                <div style={{ fontSize: '1rem', color: isVenda ? '#4ade80' : '#ef4444', fontWeight: 600 }}>R$ {premium.toFixed(2).replace('.', ',')}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>{isVenda ? 'Prêmio/Lote' : 'Custo/Lote'}</span>
                                <div style={{ fontSize: '1rem', color: isVenda ? '#4ade80' : '#ef4444', fontWeight: 600 }}>R$ {premiumTotal.toFixed(2).replace('.', ',')}</div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Vencimento</span>
                                <div style={{ fontSize: '0.9rem', color: '#fff' }}>{formatDate(option.expiration)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Explicação da Estratégia */}
                    {
                        strategy === 'venda_put' && (
                            <>
                                {/* Venda de Put Cash Secured */}
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#4ade80' }}>1.</span> Garantia Necessária
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Tenha <strong style={{ color: '#fff' }}>R$ {guaranteeNeeded.toFixed(2).replace('.', ',')}</strong> em garantia (1 lote).
                                        <br />Preferencialmente em <strong style={{ color: '#38bdf8' }}>LFTS11</strong> para render enquanto garantia.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#4ade80' }}>2.</span> Execute a Venda
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Venda a PUT <strong style={{ color: '#fff' }}>{option.ticker}</strong> no strike R$ {option.strike}.
                                        <br />Você receberá <strong style={{ color: '#4ade80' }}>R$ {premiumTotal.toFixed(2).replace('.', ',')}</strong> de prêmio imediatamente.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#4ade80' }}>3.</span> Cenários no Vencimento
                                    </h4>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(74,222,128,0.1)', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
                                            <strong style={{ color: '#4ade80' }}>Ação ACIMA de R$ {option.strike}:</strong><br />
                                            Opção vira pó. Você fica com o prêmio total. ✓
                                        </div>
                                        <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                                            <strong style={{ color: '#ef4444' }}>Ação ABAIXO de R$ {option.strike}:</strong><br />
                                            Você será exercido e comprará 100 ações por R$ {option.strike} cada.
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>↻</span> Rolagem (Ajuste)
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Se a ação cair muito, você pode <strong style={{ color: '#fff' }}>rolar</strong> recomprando a PUT vendida e vendendo outra com strike menor ou vencimento mais longo.
                                    </p>
                                </div>
                            </>
                        )
                    }

                    {
                        strategy === 'venda_call' && (
                            <>
                                {/* Lançamento Coberto (Venda de Call) */}
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>1.</span> Requisito: Ter as Ações
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Tenha <strong style={{ color: '#fff' }}>100 ações de {stock?.ticker}</strong> em carteira para cada lote.
                                        <br />Suas ações serão a garantia da operação.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>2.</span> Execute a Venda
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Venda a CALL <strong style={{ color: '#fff' }}>{option.ticker}</strong> no strike R$ {option.strike}.
                                        <br />Você receberá <strong style={{ color: '#4ade80' }}>R$ {premiumTotal.toFixed(2).replace('.', ',')}</strong> de prêmio imediatamente.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>3.</span> Cenários no Vencimento
                                    </h4>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(74,222,128,0.1)', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
                                            <strong style={{ color: '#4ade80' }}>Ação ABAIXO de R$ {option.strike}:</strong><br />
                                            Opção vira pó. Você fica com prêmio + ações. ✓
                                        </div>
                                        <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                                            <strong style={{ color: '#ef4444' }}>Ação ACIMA de R$ {option.strike}:</strong><br />
                                            Você será exercido e venderá suas ações por R$ {option.strike} cada.
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>↻</span> Rolagem (Ajuste)
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Se a ação subir muito, você pode <strong style={{ color: '#fff' }}>rolar</strong> recomprando a CALL vendida e vendendo outra com strike maior ou vencimento mais longo.
                                    </p>
                                </div>
                            </>
                        )
                    }

                    {
                        strategy === 'compra_call' && (
                            <>
                                {/* Compra de Call a Seco */}
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>1.</span> Capital Necessário
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Você precisará de <strong style={{ color: '#ef4444' }}>R$ {costTotal.toFixed(2).replace('.', ',')}</strong> para comprar 1 lote (100 opções).
                                        <br />Este é o valor máximo que você pode perder.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>2.</span> Execute a Compra
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Compre a CALL <strong style={{ color: '#fff' }}>{option.ticker}</strong> no strike R$ {option.strike}.
                                        <br />Você está apostando que a ação <strong style={{ color: '#4ade80' }}>SUBIRÁ</strong> acima do strike até o vencimento.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#38bdf8' }}>3.</span> Cenários no Vencimento
                                    </h4>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(74,222,128,0.1)', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
                                            <strong style={{ color: '#4ade80' }}>Ação ACIMA de R$ {option.strike}:</strong><br />
                                            Você lucra a diferença × 100 ações. Lucro potencial ilimitado! ✓
                                        </div>
                                        <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                                            <strong style={{ color: '#ef4444' }}>Ação ABAIXO de R$ {option.strike}:</strong><br />
                                            Opção vira pó. Você perde o prêmio pago (R$ {costTotal.toFixed(2).replace('.', ',')}).
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#ef4444' }}>⚠</span> Risco Máximo
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Perda limitada ao prêmio pago. Operação especulativa de <strong style={{ color: '#fff' }}>alto risco</strong>.
                                    </p>
                                </div>
                            </>
                        )
                    }

                    {
                        strategy === 'compra_put' && (
                            <>
                                {/* Compra de Put a Seco */}
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#ef4444' }}>1.</span> Capital Necessário
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Você precisará de <strong style={{ color: '#ef4444' }}>R$ {costTotal.toFixed(2).replace('.', ',')}</strong> para comprar 1 lote (100 opções).
                                        <br />Este é o valor máximo que você pode perder.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#ef4444' }}>2.</span> Execute a Compra
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Compre a PUT <strong style={{ color: '#fff' }}>{option.ticker}</strong> no strike R$ {option.strike}.
                                        <br />Você está apostando que a ação <strong style={{ color: '#ef4444' }}>CAIRÁ</strong> abaixo do strike até o vencimento.
                                    </p>
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#ef4444' }}>3.</span> Cenários no Vencimento
                                    </h4>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '8px', padding: '8px', background: 'rgba(74,222,128,0.1)', borderRadius: '8px', borderLeft: '3px solid #4ade80' }}>
                                            <strong style={{ color: '#4ade80' }}>Ação ABAIXO de R$ {option.strike}:</strong><br />
                                            Você lucra a diferença × 100 ações. Lucro potencial até R$ {(strikeVal * 100).toFixed(0)}! ✓
                                        </div>
                                        <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                                            <strong style={{ color: '#ef4444' }}>Ação ACIMA de R$ {option.strike}:</strong><br />
                                            Opção vira pó. Você perde o prêmio pago (R$ {costTotal.toFixed(2).replace('.', ',')}).
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#ef4444' }}>⚠</span> Risco Máximo
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                        Perda limitada ao prêmio pago. Operação especulativa de <strong style={{ color: '#fff' }}>alto risco</strong>.
                                    </p>
                                </div>
                            </>
                        )
                    }
                </motion.div >
            </div >
        );
    };


    useEffect(() => {
        const fetchOpportunities = async () => {
            try {
                const res = await fetch(getApiUrl('/api/home'));
                const json = await res.json();

                // Handle new dictionary structure
                if (json.cheap && Array.isArray(json.cheap)) {
                    setOpportunities(json.cheap);
                    setExpensiveOpportunities(json.expensive || []);
                    setFixedOpportunities(json.fixed_income || []);
                    setGuaranteeOpportunities(json.guarantee || []);
                } else if (Array.isArray(json)) {
                    // Fallback for old API
                    setOpportunities(json);
                    setExpensiveOpportunities([]);
                }
            } catch (err) {
                console.error("Error fetching home data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunities();
    }, []);



    if (loading) return <ModernLoader text="Carregando Oportunidades..." />;

    // Helper to calculate or format distance
    const getDistance = (opt, stockPrice) => {
        let dist = 0;
        if (opt.distance !== undefined && opt.distance !== null) {
            const distStr = String(opt.distance).replace(',', '.');
            dist = parseFloat(distStr);
        } else {
            const strikeVal = parseFloat(String(opt.strike).replace(',', '.')) || 0;
            if (stockPrice > 0) {
                dist = ((strikeVal / stockPrice) - 1) * 100;
            }
        }
        return isNaN(dist) ? 0 : dist;
    };

    return (
        <div className="rf-container" style={{ paddingBottom: '80px' }}>
            {/* Greeting */}
            <div style={{ padding: '0 8px', marginBottom: '24px', marginTop: '16px' }}>
                <h1 style={{
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    marginBottom: '4px',
                    background: 'linear-gradient(90deg, #fff, #aaa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Olá Investidor
                </h1>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Seja bem vindo!</p>
            </div>

            {/* Renda Variável Header */}
            <div style={{ marginBottom: '12px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
                <TrendingUp size={24} color="#94a3b8" />
                <h2 style={{ fontSize: '1.25rem', color: '#94a3b8', margin: 0 }}>Renda Variável</h2>
            </div>

            {/* Parent Wrapper Card for "Oportunidade em Ativos Descontados" */}
            <div style={{ marginTop: '8px' }}>
                <div className="glass-card" style={{
                    borderRadius: '16px', // Matching FixedIncome card radius (16px)
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(30, 41, 59, 0.4)',
                    overflow: 'hidden', // Ensure header gradient doesn't overflow rounded corners
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(0, 255, 136, 0.35), transparent)',
                        borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div className="rf-card-icon" style={{
                            background: '#00ff88',
                            color: '#000',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <TrendingUp size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0 }}>
                            Oportunidade em Ativos Descontados
                        </h3>
                    </div>

                    <div style={{ padding: '24px' }}>
                        {opportunities.length === 0 ? (
                            <div className="rf-empty" style={{ marginTop: '0' }}>
                                <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                <p>Nenhuma oportunidade encontrada.</p>
                                <small style={{ color: '#666' }}>
                                    (Venda Coberta: Strike +5%, Yield &gt; 1% | Compra a Seco: Prazo &gt; 3m, Custo &lt; 2%)
                                </small>
                            </div>
                        ) : (
                            <div className="rf-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {opportunities.map((item, idx) => {
                                    const stock = item.stock;
                                    const putsCount = stock.puts_count || 0;
                                    const callsCount = stock.calls_count || 0;

                                    return (
                                        <div
                                            key={idx}
                                            className="rf-card icon-hover-effect glass-card"
                                            style={{
                                                borderLeft: '4px solid #4ade80',
                                                cursor: 'pointer',
                                                minHeight: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                padding: '0' // Reset padding so children control it
                                            }}
                                            onClick={() => setSelectedOpportunity({ ...item, opportunityType: 'cheap' })}
                                        >
                                            <div className="rf-card-header" style={{
                                                padding: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                marginBottom: '0'
                                            }}>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    {stock.image_url && (
                                                        <img
                                                            src={stock.image_url}
                                                            alt={stock.ticker}
                                                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                                                        />
                                                    )}
                                                    <div>
                                                        <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1' }}>{stock.ticker}</h3>
                                                        <span style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rf-card-content" style={{
                                                padding: '10px',
                                                display: 'flex',
                                                flexDirection: 'column', // Stack vertically as requested
                                                gap: '6px',
                                                marginTop: '0'
                                            }}>
                                                {putsCount > 0 && (
                                                    <div style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.8rem', width: 'fit-content' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{putsCount} Put{putsCount > 1 ? 's' : ''}</span>
                                                        <span style={{ fontWeight: '400', opacity: 0.9, marginLeft: '4px' }}>- para venda coberta</span>
                                                    </div>
                                                )}
                                                {callsCount > 0 && (
                                                    <div style={{ padding: '4px 10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', borderRadius: '12px', fontSize: '0.8rem', width: 'fit-content' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{callsCount} Call{callsCount > 1 ? 's' : ''}</span>
                                                        <span style={{ fontWeight: '400', opacity: 0.9, marginLeft: '4px' }}>- para compra a seco</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Parent Wrapper Card for "Oportunidade em Ativos Caros" (Expensive Assets) */}
            < div style={{ marginTop: '20px' }}>
                <div className="glass-card" style={{
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(30, 41, 59, 0.4)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.35), transparent)',
                        borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div className="rf-card-icon" style={{
                            background: '#ef4444',
                            color: '#fff',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <TrendingUp size={20} style={{ transform: 'rotate(180deg)' }} /> {/* Trending Down */}
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0 }}>
                            Oportunidade em Ativos Caros <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '400' }}>- em carteira</span>
                        </h3>
                    </div>

                    <div style={{ padding: '24px' }}>
                        {expensiveOpportunities.length === 0 ? (
                            <div className="rf-empty" style={{ marginTop: '0' }}>
                                <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#ef4444' }} />
                                <p style={{ color: '#ef4444' }}>Nenhuma oportunidade encontada.</p>
                                <small style={{ color: '#666' }}>
                                    (Venda Coberta: Strike &gt; Preço e &gt; Max | Compra a Seco: Prazo &gt; 3m, Custo &lt; 2%)
                                </small>
                            </div>
                        ) : (
                            <div className="rf-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {expensiveOpportunities.map((item, idx) => {
                                    const stock = item.stock;
                                    const putsCount = stock.puts_count || 0;
                                    const callsCount = stock.calls_count || 0;

                                    return (
                                        <div
                                            key={idx}
                                            className="rf-card icon-hover-effect glass-card"
                                            style={{
                                                borderLeft: '4px solid #ef4444', // Red border
                                                cursor: 'pointer',
                                                minHeight: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                padding: '0'
                                            }}
                                            onClick={() => setSelectedOpportunity({ ...item, opportunityType: 'expensive' })}
                                        >
                                            <div className="rf-card-header" style={{
                                                padding: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                marginBottom: '0'
                                            }}>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    {stock.image_url && (
                                                        <img
                                                            src={stock.image_url}
                                                            alt={stock.ticker}
                                                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                                                        />
                                                    )}
                                                    <div>
                                                        <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1' }}>{stock.ticker}</h3>
                                                        <span style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rf-card-content" style={{
                                                padding: '10px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                marginTop: '0'
                                            }}>
                                                {/* In Expensive Card: Calls are for Selling (Venda Coberta), Puts are for Buying (Compra a Seco) */}
                                                {callsCount > 0 && (
                                                    <div style={{ padding: '4px 10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', borderRadius: '12px', fontSize: '0.8rem', width: 'fit-content' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{callsCount} Call{callsCount > 1 ? 's' : ''}</span>
                                                        <span style={{ fontWeight: '400', opacity: 0.9, marginLeft: '4px' }}>- para venda coberta</span>
                                                    </div>
                                                )}
                                                {putsCount > 0 && (
                                                    <div style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', fontSize: '0.8rem', width: 'fit-content' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{putsCount} Put{putsCount > 1 ? 's' : ''}</span>
                                                        <span style={{ fontWeight: '400', opacity: 0.9, marginLeft: '4px' }}>- para compra a seco</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Separator and Renda Fixa Header */}
            < div style={{ margin: '32px 0 16px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div >

            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
                <Landmark size={24} color="#94a3b8" />
                <h2 style={{ fontSize: '1.25rem', color: '#94a3b8', margin: 0 }}>Renda Fixa</h2>
            </div>

            {/* Oportunidades em Renda Fixa Card */}
            <div style={{ marginTop: '0' }}>
                <div className="glass-card" style={{
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(30, 41, 59, 0.4)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header - Blue Theme */}
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.35), transparent)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div className="rf-card-icon" style={{
                            background: '#3b82f6', color: '#fff', width: '32px', height: '32px',
                            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Landmark size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0 }}>
                            Oportunidades em Renda Fixa
                        </h3>
                    </div>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {fixedOpportunities.length === 0 ? (
                            <div className="rf-empty" style={{ marginTop: '0' }}>
                                <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#3b82f6' }} />
                                <p style={{ color: '#3b82f6' }}>Nenhuma oportunidade encontrada.</p>
                            </div>
                        ) : (
                            fixedOpportunities.map((item, idx) => {
                                const rawRate = item.taxa_compra || "0,00";
                                const titleUpper = item.titulo.toUpperCase();
                                const isSelic = titleUpper.includes("SELIC");
                                const isIPCA = titleUpper.includes("IPCA") || titleUpper.includes("RENDA+");

                                let displayRate = rawRate;
                                let periodLabel = "ao ano";

                                // Ensure % symbol if missing
                                if (!displayRate.includes('%')) displayRate += '%';

                                // Logic per type
                                if (isSelic) {
                                    // Remove prefix, change period
                                    periodLabel = "ao dia útil";
                                } else if (isIPCA) {
                                    displayRate = `IPCA + ${displayRate}`;
                                }

                                return (
                                    <div key={idx} className="rf-card glass-card" style={{
                                        borderLeft: '4px solid #3b82f6',
                                        padding: '12px', cursor: 'default'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', display: 'block' }}>
                                                    {item.type_display || item.category}
                                                </span>
                                                <h4 style={{
                                                    fontSize: '0.85rem', color: '#f1f5f9', margin: '2px 0', fontWeight: 600,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }} title={item.titulo}>
                                                    {item.titulo}
                                                </h4>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                                <span style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    {displayRate}
                                                </span>
                                                <span style={{ display: 'block', fontSize: '0.65rem', color: '#64748b' }}>
                                                    {periodLabel}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#cbd5e1' }}>
                                            <span>Min: {item.min_investimento}</span>
                                            <span>Venc: {item.vencimento}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Garantia Card - Purple */}
            <div style={{ marginTop: '16px' }}>
                <div className="glass-card" style={{
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(30, 41, 59, 0.4)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.35), transparent)', // Purple
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '16px', display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div className="rf-card-icon" style={{
                            background: '#a855f7', color: '#fff', width: '32px', height: '32px',
                            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Landmark size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0 }}>
                            Garantia para opções
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        {guaranteeOpportunities.length > 0 ? (
                            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                {/* Left Side */}
                                <div>
                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#f8fafc', display: 'block' }}>
                                        {guaranteeOpportunities[0].titulo || 'LFTS11'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                        Vencimento: {guaranteeOpportunities[0].maturity || guaranteeOpportunities[0].vencimento || 'Indeterminado'}
                                    </span>
                                </div>

                                {/* Right Side */}
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {/* Rentabilidade */}
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Rentabilidade</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4ade80' }}>
                                        {guaranteeOpportunities[0].yield_val ? guaranteeOpportunities[0].yield_val.toFixed(2).replace('.', ',') + '%' : '-'}
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '8px' }}>
                                        {guaranteeOpportunities[0].yield_label || '12 Meses'}
                                    </span>

                                    {/* Minimo */}
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Mínimo</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: '500', color: '#f1f5f9' }}>
                                        {guaranteeOpportunities[0].min_investment ? (
                                            typeof guaranteeOpportunities[0].min_investment === 'number'
                                                ? guaranteeOpportunities[0].min_investment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                : guaranteeOpportunities[0].min_investment
                                        ) : '-'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                Buscando dados do LFTS11...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for Options - REPLICATING OPTIONSMODULE.CSS CLASSES */}
            {
                selectedOpportunity && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
                    }} onClick={() => setSelectedOpportunity(null)}>

                        {/* Main Modal Container matching .options-modal */}
                        <div style={{
                            width: '100%',
                            height: '90%',
                            backgroundColor: '#0f172a',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
                            animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }} onClick={e => e.stopPropagation()}>

                            {/* Header matching .options-header */}
                            <div style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {selectedOpportunity.stock.image_url ? (
                                        <img
                                            src={selectedOpportunity.stock.image_url}
                                            alt={selectedOpportunity.stock.ticker}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                objectFit: 'cover',
                                                backgroundColor: 'rgba(255,255,255,0.05)'
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            color: '#ccc'
                                        }}>
                                            {selectedOpportunity.stock.ticker ? selectedOpportunity.stock.ticker[0] : '#'}
                                        </div>
                                    )}
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                                        Opções de {selectedOpportunity.stock.ticker}
                                    </h2>
                                </div>
                                <button
                                    className="close-btn"
                                    onClick={() => setSelectedOpportunity(null)}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content Columns matching .options-content */}
                            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                                {/* Divider Line */}
                                <div style={{
                                    position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px',
                                    background: 'rgba(255, 255, 255, 0.05)', transform: 'translateX(-50%)', zIndex: 1
                                }}></div>

                                {/* LEFT COLUMN: CALLS */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Header matching .options-column.calls h3 */}
                                    <h3 style={{
                                        textAlign: 'center', padding: '12px', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0,
                                        background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderBottom: '2px solid #38bdf8'
                                    }}>
                                        CALLS
                                    </h3>
                                    {/* Cards List matching .cards-list */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedOpportunity.options.calls && selectedOpportunity.options.calls.length > 0 ? (
                                            selectedOpportunity.options.calls.map((opt, i) => {
                                                const stockPrice = parseFloat((selectedOpportunity.stock.price || "0").replace('R$', '').replace('.', '').replace(',', '.'));
                                                const dist = getDistance(opt, stockPrice);
                                                const isDistPos = dist >= 0;

                                                return (
                                                    <div key={i} className="option-card call" style={{
                                                        backgroundColor: '#1e293b', borderRadius: '12px', padding: '12px',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                                                        borderLeft: '3px solid #38bdf8'
                                                    }}>
                                                        {/* Card Header matching .card-header */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Strike</span>
                                                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>R$ {opt.strike}</span>
                                                                <div style={{
                                                                    fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                                                                    padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px',
                                                                    background: 'rgba(0, 0, 0, 0.2)', color: isDistPos ? '#4ade80' : '#f87171',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {isDistPos ? '▲' : '▼'} {dist.toFixed(2).replace('.', ',')}%
                                                                </div>
                                                            </div>
                                                            <span style={{
                                                                fontSize: '0.6rem', fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.1)',
                                                                color: 'rgba(255, 255, 255, 0.7)', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.3px',
                                                                whiteSpace: 'nowrap', flexShrink: 0
                                                            }}>
                                                                {opt.ticker}
                                                            </span>
                                                        </div>

                                                        {/* Separator */}
                                                        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', margin: '8px 0 10px 0' }}></div>

                                                        {/* Card Body matching .card-body */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                <span>Preço:</span>
                                                                <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>R$ {opt.last_price ? opt.last_price.toFixed(2).replace('.', ',') : '0,00'}</strong>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                <span>Prêmio:</span>
                                                                <strong style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: 600, textShadow: '0 0 10px rgba(74, 222, 128, 0.2)' }}>
                                                                    {opt.cost_display || opt.yield_display || '-'}
                                                                </strong>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '2px' }}>
                                                                <span>Vol: {opt.volume || '-'}</span>
                                                                <span>Neg: {opt.trades || '-'}</span>
                                                            </div>
                                                            <div style={{ marginTop: '0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                                                                <Calendar size={10} /> {formatDate(opt.expiration)}
                                                            </div>
                                                            {/* Ver Operação Button */}
                                                            <button
                                                                onClick={() => setSelectedOperation({
                                                                    option: opt,
                                                                    type: 'call',
                                                                    stock: selectedOpportunity.stock,
                                                                    strategy: selectedOpportunity.opportunityType === 'cheap' ? 'compra_call' : 'venda_call'
                                                                })}
                                                                style={{
                                                                    marginTop: '10px', width: '100%', padding: '8px 12px',
                                                                    background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
                                                                    borderRadius: '8px', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600,
                                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <Crosshair size={14} /> Ver Operação
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '40px', fontStyle: 'italic', opacity: 0.6 }}>
                                                Nenhuma Put disponível.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: PUTS */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Header matching .options-column.puts h3 */}
                                    <h3 style={{
                                        textAlign: 'center', padding: '12px', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0,
                                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderBottom: '2px solid #ef4444'
                                    }}>
                                        PUTS
                                    </h3>
                                    {/* Cards List matching .cards-list */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedOpportunity.options.puts && selectedOpportunity.options.puts.length > 0 ? (
                                            selectedOpportunity.options.puts.map((opt, i) => {
                                                const stockPrice = parseFloat((selectedOpportunity.stock.price || "0").replace('R$', '').replace('.', '').replace(',', '.'));
                                                const dist = getDistance(opt, stockPrice);
                                                const isDistPos = dist >= 0;

                                                return (
                                                    <div key={i} className="option-card put" style={{
                                                        backgroundColor: '#1e293b', borderRadius: '12px', padding: '12px',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                                                        borderLeft: '3px solid #ef4444'
                                                    }}>
                                                        {/* Card Header matching .card-header */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Strike</span>
                                                                <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>R$ {opt.strike}</span>
                                                                <div style={{
                                                                    fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                                                                    padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px',
                                                                    background: 'rgba(0, 0, 0, 0.2)', color: isDistPos ? '#4ade80' : '#f87171',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {isDistPos ? '▲' : '▼'} {dist.toFixed(2).replace('.', ',')}%
                                                                </div>
                                                            </div>
                                                            <span style={{
                                                                fontSize: '0.6rem', fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.1)',
                                                                color: 'rgba(255, 255, 255, 0.7)', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.3px',
                                                                whiteSpace: 'nowrap', flexShrink: 0
                                                            }}>
                                                                {opt.ticker}
                                                            </span>
                                                        </div>

                                                        {/* Separator */}
                                                        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', margin: '8px 0 10px 0' }}></div>

                                                        {/* Card Body matching .card-body */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                <span>Preço:</span>
                                                                <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>R$ {opt.last_price ? opt.last_price.toFixed(2).replace('.', ',') : '0,00'}</strong>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                <span>Prêmio:</span>
                                                                <strong style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: 600, textShadow: '0 0 10px rgba(74, 222, 128, 0.2)' }}>
                                                                    {opt.cost_display || opt.yield_display || '-'}
                                                                </strong>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '2px' }}>
                                                                <span>Vol: {opt.volume || '-'}</span>
                                                                <span>Neg: {opt.trades || '-'}</span>
                                                            </div>
                                                            <div style={{ marginTop: '0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                                                                <Calendar size={10} /> {formatDate(opt.expiration)}
                                                            </div>
                                                            {/* Ver Operação Button */}
                                                            <button
                                                                onClick={() => setSelectedOperation({
                                                                    option: opt,
                                                                    type: 'put',
                                                                    stock: selectedOpportunity.stock,
                                                                    strategy: selectedOpportunity.opportunityType === 'cheap' ? 'venda_put' : 'compra_put'
                                                                })}
                                                                style={{
                                                                    marginTop: '10px', width: '100%', padding: '8px 12px',
                                                                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    borderRadius: '8px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600,
                                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <Crosshair size={14} /> Ver Operação
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '40px', fontStyle: 'italic', opacity: 0.6 }}>
                                                Nenhuma Put disponível.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )
            }

            {/* Operation Explanation Modal */}
            <OperationModal
                operation={selectedOperation}
                onClose={() => setSelectedOperation(null)}
            />
        </div >
    );
};

export default Home;
