import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ModernLoader from './ModernLoader';
import '../components/FixedIncome.css';
import './OptionsModule.css'; // Import Options Styles
import './Dashboard.css'; // Import Dashboard Styles
import './News.css';
import '../styles/main.css';
import { TrendingUp, TrendingDown, Landmark, ChevronRight, DollarSign, Calendar, AlertCircle, X as CloseIcon, Sparkles, PieChart, Crosshair, Shield, Lock, Clock, AlertTriangle, Newspaper, BookOpen, BarChart2, Bitcoin, Euro, PoundSterling } from 'lucide-react';
import { getApiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StockTicker from './StockTicker';



const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    if (dateStr.includes("-")) {
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
    }
    return dateStr;
};

const formatVariation = (val) => {
    if (val === undefined || val === null) return "0,00%";
    let num = 0;
    if (typeof val === 'number') {
        num = val * 100;
    } else if (typeof val === 'string') {
        let clean = val.replace('%', '').replace(',', '.');
        num = parseFloat(clean);
        if (!val.includes('%') && Math.abs(num) < 1) {
            num = num * 100;
        }
    }
    return `${num.toFixed(2).replace('.', ',')}%`;
};

const Home = ({ onNavigate }) => {
    const [opportunities, setOpportunities] = useState([]);
    const [expensiveOpportunities, setExpensiveOpportunities] = useState([]);
    const [fixedOpportunities, setFixedOpportunities] = useState([]);
    const [guaranteeOpportunities, setGuaranteeOpportunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOpportunity, setSelectedOpportunity] = useState(null);
    const [selectedOperation, setSelectedOperation] = useState(null);

    // Home Highlights State
    const [homeNews, setHomeNews] = useState([]);
    const [homeCalendar, setHomeCalendar] = useState({ dividends: [], earnings: [] });
    const [stocksMap, setStocksMap] = useState({});
    const [topGainers, setTopGainers] = useState([]);
    const [topLosers, setTopLosers] = useState([]);

    // Indices State
    const [indices, setIndices] = useState({ selic: '', cdi: '', ipca: '', poupanca: '' });
    const [generalQuotes, setGeneralQuotes] = useState([]);
    const [qtPeriod, setQtPeriod] = useState('1D'); // 1D, 1S, 1M

    // Fetch Home Highlights
    useEffect(() => {
        const fetchHighlights = async () => {
            try {
                // News
                try {
                    const resNews = await fetch(getApiUrl('/api/news/highlights'));
                    const jsonNews = await resNews.json();
                    if (jsonNews.news) setHomeNews(jsonNews.news);
                } catch (e) {
                    console.error("Error fetching news highlights", e);
                }

                // Indices (for Selic calcs)
                try {
                    const resIndices = await fetch(getApiUrl('/api/indices'));
                    const jsonIndices = await resIndices.json();
                    setIndices(jsonIndices);
                } catch (e) {
                    console.error("Error fetching indices in Home", e);
                }

                // General Quotes
                try {
                    const resQuotes = await fetch(getApiUrl('/api/quotes'));
                    const jsonQuotes = await resQuotes.json();
                    setGeneralQuotes(jsonQuotes);
                } catch (e) {
                    console.error("Error fetching quotes", e);
                }

                // Stocks Map & Market Movers
                const resStocks = await fetch(getApiUrl('/api/stocks'));
                const jsonStocks = await resStocks.json();
                const map = {};
                if (Array.isArray(jsonStocks)) {
                    jsonStocks.forEach(s => map[s.ticker] = s);

                    // Calculate Gainers/Losers
                    const getVal = (v) => {
                        if (v === undefined || v === null) return 0;
                        let num = 0;
                        if (typeof v === 'number') {
                            num = Math.abs(v) < 1 ? v * 100 : v;
                        } else if (typeof v === 'string') {
                            let clean = v.replace('%', '').replace(',', '.');
                            num = parseFloat(clean);
                            if (!v.includes('%') && Math.abs(num) < 1) {
                                num = num * 100;
                            }
                        }
                        return isNaN(num) ? 0 : num;
                    };

                    const sorted = [...jsonStocks]
                        .filter(s => {
                            const val = getVal(s.change_day);
                            return val !== 0; // Filter out zeros as requested
                        })
                        .sort((a, b) => getVal(b.change_day) - getVal(a.change_day));

                    setTopGainers(sorted.slice(0, 3));
                    setTopLosers(sorted.slice(-3).reverse());
                }
                setStocksMap(map);

                // Calendar
                const resCal = await fetch(getApiUrl('/api/calendar'));
                const jsonCal = await resCal.json();

                // Filter Logic: Current Week (Today -> +7 days)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const limit = new Date(today);
                limit.setDate(today.getDate() + 7);

                const filterAndSort = (list) => {
                    if (!list) return [];
                    return list.filter(evt => {
                        if (!evt.date) return false;
                        const [y, m, d] = evt.date.split('-');
                        const eDate = new Date(y, m - 1, d);
                        return eDate >= today && eDate <= limit;
                    })
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .slice(0, 4);
                };

                setHomeCalendar({
                    dividends: filterAndSort(jsonCal.dividend_events),
                    earnings: filterAndSort(jsonCal.earnings_events)
                });
            } catch (err) {
                console.error("Error fetching home highlights", err);
            }
        };
        fetchHighlights();
    }, []);

    // Helper for Calendar Dates
    const formatDateSimple = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}`;
    };

    useEffect(() => {
        if (selectedOperation || selectedOpportunity) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedOperation, selectedOpportunity]);

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
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '94%', maxWidth: '440px',
                        display: 'flex', flexDirection: 'column'
                    }}
                >
                    <div style={{
                        background: 'linear-gradient(180deg, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)',
                        borderRadius: '28px',
                        padding: '32px 24px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 25px 70px -10px rgba(0,0,0,0.9)',
                        overflowY: 'auto',
                        maxHeight: '85vh',
                        backdropFilter: 'blur(20px)',
                        position: 'relative'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                zIndex: 100,
                                padding: 0,
                                color: 'rgba(255,255,255,0.5)'
                            }}
                        >
                            <CloseIcon size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', paddingRight: '40px' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                background: `linear-gradient(135deg, ${strategyColor}30 0%, ${strategyColor}10 100%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `1px solid ${strategyColor}40`,
                                boxShadow: `0 0 20px ${strategyColor}15`
                            }}>
                                <Crosshair size={24} color={strategyColor} />
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 700, letterSpacing: '-0.3px' }}>{strategyName}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{option.ticker}</span>
                                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#475569' }}></span>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{stock?.ticker}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        const strategyMap = {
                                            'venda_put': 'venda-de-put-cash-secured',
                                            'venda_call': 'lancamento-coberto',
                                            'compra_put': 'compra-a-seco-pozinho',
                                            'compra_call': 'compra-a-seco-pozinho'
                                        };
                                        const anchor = strategyMap[strategy] || '';
                                        if (anchor) window.location.hash = anchor;
                                        onNavigate('strategies');
                                        onClose();
                                    }}
                                    style={{
                                        alignSelf: 'flex-start',
                                        background: `linear-gradient(90deg, ${strategyColor}15, transparent)`,
                                        border: `1px solid ${strategyColor}30`,
                                        borderRadius: '8px',
                                        padding: '6px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        color: strategyColor,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        marginTop: '4px'
                                    }}
                                >
                                    <BookOpen size={14} />
                                    <span>Aprender sobre esta estratégia</span>
                                    <ChevronRight size={12} style={{ opacity: 0.6 }} />
                                </button>

                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    marginTop: '12px',
                                    paddingTop: '12px',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                    width: '100%',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vol. Implícita:</span>
                                        <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{option.sigma || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Delta:</span>
                                        <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{option.delta_val || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Preço B.S.:</span>
                                        <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>{option.bs_price_val || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '20px',
                            padding: '20px',
                            marginBottom: '28px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }}></div>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Ação Atual</span>
                                    </div>
                                    <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>R$ {stockPrice.toFixed(2).replace('.', ',')}</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: strategyColor }}></div>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Strike</span>
                                    </div>
                                    <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>R$ {option.strike}</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isVenda ? '#4ade80' : '#ef4444' }}></div>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{isVenda ? 'Prêmio/Opção' : 'Custo/Opção'}</span>
                                    </div>
                                    <div style={{ fontSize: '1.1rem', color: isVenda ? '#4ade80' : '#ef4444', fontWeight: 700 }}>R$ {premium.toFixed(2).replace('.', ',')}</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isVenda ? '#4ade80' : '#ef4444' }}></div>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{isVenda ? 'Prêmio/Lote' : 'Custo/Lote'}</span>
                                    </div>
                                    <div style={{ fontSize: '1.1rem', color: isVenda ? '#4ade80' : '#ef4444', fontWeight: 700 }}>R$ {premiumTotal.toFixed(2).replace('.', ',')}</div>
                                </div>
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', width: '100%' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={14} color="#64748b" />
                                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vencimento:</span>
                                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>{formatDate(option.expiration)}</span>
                            </div>
                        </div>

                        {(option.prob_success || option.edge_formatted) && (
                            <div style={{
                                background: 'rgba(56, 189, 248, 0.05)',
                                borderRadius: '16px',
                                padding: '16px 0',
                                marginBottom: '28px',
                                border: '1px solid rgba(56, 189, 248, 0.15)',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'center' }}>Prob. Desfecho Favorável</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></div>
                                        <span style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>{option.prob_success || 'N/A'}</span>
                                    </div>
                                </div>

                                <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }}></div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, textAlign: 'center' }}>Vantagem Teórica (Edge)</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {(() => {
                                            const edgeVal = parseFloat(option.edge_formatted);
                                            const isBuy = !strategy.includes('venda');
                                            // Adjusted Logic: If Buy strategy and Edge > 50% (Positive), show text
                                            if (isBuy && edgeVal > 50) {
                                                return (
                                                    <span style={{ fontSize: '0.9rem', color: '#facc15', fontWeight: 700 }}>Alta Volatilidade</span>
                                                );
                                            }
                                            return (
                                                <span style={{
                                                    fontSize: '1.25rem',
                                                    color: (strategy.includes('venda'))
                                                        ? (edgeVal > 0 ? '#4ade80' : '#ef4444')
                                                        : (edgeVal < 0 ? '#4ade80' : '#ef4444'),
                                                    fontWeight: 700
                                                }}>{option.edge_formatted || 'N/A'}</span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {strategy === 'venda_put' && (
                                <React.Fragment>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</div>
                                            <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '12px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Garantia Necessária</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                                Prepare <strong style={{ color: '#fff' }}>R$ {guaranteeNeeded.toFixed(2).replace('.', ',')}</strong>. Use <strong style={{ color: '#38bdf8' }}>LFTS11</strong> para que seu dinheiro renda enquanto serve de garantia.
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</div>
                                            <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '12px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Execute a Venda</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                                Venda a PUT <strong style={{ color: '#fff' }}>{option.ticker}</strong> no strike R$ {option.strike}. Receba <strong style={{ color: '#4ade80' }}>R$ {premiumTotal.toFixed(2).replace('.', ',')}</strong> na hora.
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>3</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Cenários no Vencimento</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ padding: '12px', background: 'rgba(74,222,128,0.05)', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.1)', borderLeft: '3px solid #4ade80' }}>
                                                    <div style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Acima de R$ {option.strike}</div>
                                                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>A opção vira pó e você embolsa o lucro total! ✓</div>
                                                </div>
                                                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444' }}>
                                                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Abaixo de R$ {option.strike}</div>
                                                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Você compra a ação pelo preço do strike (desconto real).</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            )}

                            {strategy === 'venda_call' && (
                                <React.Fragment>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</div>
                                            <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '12px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Requisito: Ter as Ações</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                                Tenha <strong style={{ color: '#fff' }}>100 ações de {stock?.ticker}</strong>. Elas servirão como a garantia real da sua operação.
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</div>
                                            <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '12px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Execute a Venda</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                                Venda a CALL <strong style={{ color: '#fff' }}>{option.ticker}</strong> no strike R$ {option.strike}. O prêmio de <strong style={{ color: '#4ade80' }}>R$ {premiumTotal.toFixed(2).replace('.', ',')}</strong> cai na hora.
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>3</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Cenários no Vencimento</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ padding: '12px', background: 'rgba(74,222,128,0.05)', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.1)', borderLeft: '3px solid #4ade80' }}>
                                                    <div style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Abaixo de R$ {option.strike}</div>
                                                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Opção expira. Você fica com o prêmio e continua com as ações.</div>
                                                </div>
                                                <div style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444' }}>
                                                    <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Acima de R$ {option.strike}</div>
                                                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Você entrega as ações pelo valor do strike (+ lucro da alta).</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            )}

                            {(strategy === 'compra_call' || strategy === 'compra_put') && (
                                <React.Fragment>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</div>
                                            <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '12px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Capital em Risco</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                                Você precisará de <strong style={{ color: '#ef4444' }}>R$ {costTotal.toFixed(2).replace('.', ',')}</strong>. Este valor representa sua perda máxima caso a tese não se confirme.
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</div>
                                            <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                                        </div>
                                        <div style={{ flex: 1, paddingBottom: '12px' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Tese de Mercado</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                                Compre a {strategy === 'compra_call' ? 'CALL' : 'PUT'} <strong style={{ color: '#fff' }}>{option.ticker}</strong>. Você aposta que o ativo {strategy === 'compra_call' ? <strong style={{ color: '#4ade80' }}>SUBIRÁ</strong> : <strong style={{ color: '#ef4444' }}>CAIRÁ</strong>} de forma brusca até o vencimento.
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>3</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>Expectativa</h4>
                                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <AlertTriangle size={20} color="#facc15" />
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                                                    Operação especulativa de alta volatilidade. Lucro ilimitado se o movimento ocorrer, mas risco de perda total do prêmio pago.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };


    useEffect(() => {
        const fetchWithRetry = async (retries = 3, delay = 1500) => {
            try {
                const res = await fetch(getApiUrl('/api/home'));
                const json = await res.json();

                let hasData = false;

                // Handle new dictionary structure
                if (json.cheap && Array.isArray(json.cheap)) {
                    if (json.cheap.length > 0 || (json.expensive && json.expensive.length > 0)) {
                        hasData = true;
                    }
                    setOpportunities(json.cheap);
                    setExpensiveOpportunities(json.expensive || []);
                    setFixedOpportunities(json.fixed_income || []);
                    setGuaranteeOpportunities(json.guarantee || []);
                } else if (Array.isArray(json)) {
                    // Fallback for old API
                    if (json.length > 0) hasData = true;
                    setOpportunities(json);
                    setExpensiveOpportunities([]);
                }

                // If no data and we have retries left, wait and retry
                if (!hasData && retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return fetchWithRetry(retries - 1, delay);
                }

                // Success or out of retries
                setLoading(false);

            } catch (err) {
                console.error("Error fetching home data:", err);
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return fetchWithRetry(retries - 1, delay);
                }
                setLoading(false);
            }
        };

        fetchWithRetry();
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

    // Volatility Circle Component
    const VolatilityCircle = ({ value }) => {
        const val = parseFloat(String(value).replace('%', '').replace(',', '.')) || 0;
        let color = '#ef4444';
        if (val > -15) color = '#4ade80';
        else if (val >= -30) color = '#facc15';

        const fillPercentage = Math.max(0, Math.min(100, 100 + val));
        const radius = 13;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (fillPercentage / 100) * circumference;

        return (
            <div title={`Desconto: ${value}%`} style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="16" cy="16" r={radius} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle
                        cx="16" cy="16" r={radius} fill="transparent" stroke={color} strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        );
    };

    return (
        <div className="rf-container" style={{ paddingBottom: '80px' }}>
            {/* Ticker de Variações */}
            <StockTicker />

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
                <p style={{ color: '#64748b', margin: 0 }}>Seja bem vindo!</p>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', margin: '24px 0 0 0' }}></div>
            </div>

            {/* Renda Variável Header */}
            <div style={{ marginBottom: '12px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
                <TrendingUp size={24} color="#94a3b8" />
                <h2 style={{ fontSize: '1.25rem', color: '#94a3b8', margin: 0 }}>Renda Variável</h2>
            </div>

            {/* Dashboard Grid for Two Columns on Desktop */}
            <div className="dashboard-grid">
                {/* 1. Oportunidade em Ativos Descontados */}
                <div style={{ marginTop: '8px' }}>
                    <div className="glass-card" style={{
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'rgba(30, 41, 59, 0.4)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%' // Ensure height fills grid cell
                    }}>
                        <div className="rf-card-header" style={{
                            background: 'linear-gradient(90deg, rgba(0, 255, 136, 0.35), transparent)',
                            borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                <div className="rf-card-icon" style={{
                                    background: '#00ff88',
                                    color: '#000',
                                    minWidth: '32px', // Prevent shrinking
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <TrendingUp size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0, lineHeight: '1.2' }}>
                                    Oportunidade em Ativos Descontados
                                </h3>
                            </div>
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

                                        // Backend already filters by date/strategy
                                        const validPuts = item.options?.puts || [];
                                        const validCalls = item.options?.calls || [];

                                        const putsCount = validPuts.length;
                                        const callsCount = validCalls.length;

                                        if (putsCount === 0 && callsCount === 0) return null; // Hide if no valid opts

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
                                                    justifyContent: 'space-between',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                    marginBottom: '0',
                                                    gap: '12px'
                                                }}>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        {stock.image_url ? (
                                                            <img
                                                                src={stock.image_url}
                                                                alt={stock.ticker}
                                                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '50%',
                                                                background: 'rgba(255,255,255,0.1)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{stock.ticker?.slice(0, 2)}</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1' }}>{stock.ticker}</h3>
                                                            <span style={{ fontSize: '0.65rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name}</span>
                                                        </div>
                                                    </div>

                                                    {/* Price and Volatility Circle */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ display: 'block', fontSize: '0.45rem', color: 'rgb(170, 170, 170)', textTransform: 'uppercase', marginBottom: '2px' }}>Preço Atual</span>
                                                            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>{stock.price || '---'}</span>
                                                        </div>
                                                        {stock.falta_pct && <VolatilityCircle value={stock.falta_pct} />}
                                                    </div>
                                                </div>

                                                <div className="rf-card-content" style={{
                                                    padding: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    marginTop: '0'
                                                }}>
                                                    {putsCount > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.55rem', color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: '0px' }}>Renda Extra :</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '0px' }}>
                                                                <div style={{
                                                                    padding: '6px 12px',
                                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                                    color: '#ef4444',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.75rem',
                                                                    whiteSpace: 'nowrap',
                                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <span style={{ fontWeight: '800' }}>{putsCount} PUTS</span>
                                                                    <span style={{ fontWeight: '500', opacity: 0.7 }}> - Para Venda Coberta</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {callsCount > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.55rem', color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: '0px' }}>Alavancagem de Capital :</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '0px' }}>
                                                                <div style={{
                                                                    padding: '6px 12px',
                                                                    background: 'rgba(56, 189, 248, 0.15)',
                                                                    color: '#38bdf8',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.75rem',
                                                                    whiteSpace: 'nowrap',
                                                                    border: '1px solid rgba(56, 189, 248, 0.2)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <span style={{ fontWeight: '800' }}>{callsCount} CALLS</span>
                                                                    <span style={{ fontWeight: '500', opacity: 0.7 }}> - Para Compra a Seco</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                            }
                        </div>
                    </div>
                </div>

                {/* 2. Oportunidade em Ativos Caros */}
                <div style={{ marginTop: '8px' }}>
                    <div className="glass-card" style={{
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'rgba(30, 41, 59, 0.4)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}>
                        <div className="rf-card-header" style={{
                            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.35), transparent)',
                            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                <div className="rf-card-icon" style={{
                                    background: '#ef4444',
                                    color: '#fff',
                                    minWidth: '32px',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <TrendingUp size={20} style={{ transform: 'rotate(180deg)' }} /> {/* Trending Down */}
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0, lineHeight: '1.2' }}>
                                    Oportunidade em Ativos Caros <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '400' }}>- em carteira</span>
                                </h3>
                            </div>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {expensiveOpportunities.length === 0 ? (
                                <div className="rf-empty" style={{ marginTop: '0' }}>
                                    <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                    <p>Nenhuma oportunidade encontrada.</p>
                                </div>
                            ) : (
                                <div className="rf-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {expensiveOpportunities.map((item, idx) => {
                                        const stock = item.stock;

                                        // Backend already filters by date/strategy
                                        const validCalls = item.options?.calls || [];
                                        const validPuts = item.options?.puts || [];

                                        const callsCount = validCalls.length;
                                        const putsCount = validPuts.length;

                                        if (callsCount === 0 && putsCount === 0) return null;

                                        return (
                                            <div
                                                key={idx}
                                                className="rf-card icon-hover-effect glass-card"
                                                style={{
                                                    borderLeft: '4px solid #ef4444',
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
                                                    justifyContent: 'space-between',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                    marginBottom: '0',
                                                    gap: '12px'
                                                }}>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                                        {stock.image_url ? (
                                                            <img
                                                                src={stock.image_url}
                                                                alt={stock.ticker}
                                                                style={{ width: 36, height: 36, minWidth: 36, borderRadius: '50%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: 36,
                                                                height: 36,
                                                                minWidth: 36,
                                                                borderRadius: '50%',
                                                                background: 'rgba(255,255,255,0.1)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{stock.ticker?.slice(0, 2)}</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1' }}>{stock.ticker}</h3>
                                                            <span style={{ fontSize: '0.65rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name}</span>
                                                        </div>
                                                    </div>

                                                    {/* Price and Volatility Circle */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ display: 'block', fontSize: '0.45rem', color: 'rgb(170, 170, 170)', textTransform: 'uppercase', marginBottom: '2px' }}>Preço Atual</span>
                                                            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>{stock.price || '---'}</span>
                                                        </div>
                                                        {stock.falta_pct && <VolatilityCircle value={stock.falta_pct} />}
                                                    </div>
                                                </div>

                                                <div className="rf-card-content" style={{
                                                    padding: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    marginTop: '0'
                                                }}>
                                                    {callsCount > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.55rem', color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: '0px' }}>Renda Extra :</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '0px' }}>
                                                                <div style={{
                                                                    padding: '6px 12px',
                                                                    background: 'rgba(56, 189, 248, 0.15)',
                                                                    color: '#38bdf8',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.75rem',
                                                                    whiteSpace: 'nowrap',
                                                                    border: '1px solid rgba(56, 189, 248, 0.2)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <span style={{ fontWeight: '800' }}>{callsCount} CALLS</span>
                                                                    <span style={{ fontWeight: '500', opacity: 0.7 }}> - Para Lançamento Coberto</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {putsCount > 0 && (
                                                        <div>
                                                            <span style={{ fontSize: '0.55rem', color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: '0px' }}>Alavancagem de Capital :</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '0px' }}>
                                                                <div style={{
                                                                    padding: '6px 12px',
                                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                                    color: '#ef4444',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.75rem',
                                                                    whiteSpace: 'nowrap',
                                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <span style={{ fontWeight: '800' }}>{putsCount} PUTS</span>
                                                                    <span style={{ fontWeight: '500', opacity: 0.7 }}> - Para Compra a Seco</span>
                                                                </div>
                                                            </div>
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
                </div>
            </div>


            {/* Resumo do Dia: Maiores Altas e Baixas */}
            < div style={{ margin: '32px 0 16px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div >

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
                <TrendingUp size={24} color="#94a3b8" />
                <h2 style={{ fontSize: '1.25rem', color: '#94a3b8', margin: 0 }}>Resumo do Dia</h2>
            </div>

            <div className="dashboard-grid" style={{ marginTop: '0' }}>
                {/* Maiores Altas */}
                <div className="glass-card">
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(74, 222, 128, 0.2), transparent)',
                        borderBottom: '1px solid rgba(74, 222, 128, 0.1)'
                    }}>
                        <div className="rf-card-icon" style={{
                            background: '#4ade80',
                            width: '32px', height: '32px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <TrendingUp size={18} color="#000" />
                        </div>
                        <h3>Maiores Altas</h3>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        {topGainers.length > 0 ? (
                            topGainers.map((stock, idx) => (
                                <React.Fragment key={idx}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {stock.image_url ? (
                                                <img
                                                    src={stock.image_url}
                                                    alt={stock.ticker}
                                                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{stock.ticker?.slice(0, 2)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{stock.ticker}</h3>
                                                <span style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ fontSize: '0.55rem', color: 'rgb(170, 170, 170)', textTransform: 'uppercase', fontWeight: 600 }}>Var. dia</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontWeight: 'bold', fontSize: '1rem' }}>
                                                <TrendingUp size={16} />
                                                {formatVariation(stock.change_day)}
                                            </div>
                                        </div>
                                    </div>
                                    {idx < topGainers.length - 1 && (
                                        <div style={{ margin: '12px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)' }}></div>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Nenhum dado disponível.</p>
                        )}
                    </div>
                </div>

                {/* Maiores Baixas */}
                <div className="glass-card">
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(248, 113, 113, 0.2), transparent)',
                        borderBottom: '1px solid rgba(248, 113, 113, 0.1)'
                    }}>
                        <div className="rf-card-icon" style={{
                            background: '#f87171',
                            width: '32px', height: '32px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            <TrendingDown size={18} color="#fff" />
                        </div>
                        <h3>Maiores Baixas</h3>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        {topLosers.length > 0 ? (
                            topLosers.map((stock, idx) => (
                                <React.Fragment key={idx}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {stock.image_url ? (
                                                <img
                                                    src={stock.image_url}
                                                    alt={stock.ticker}
                                                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>{stock.ticker?.slice(0, 2)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{stock.ticker}</h3>
                                                <span style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ fontSize: '0.55rem', color: 'rgb(170, 170, 170)', textTransform: 'uppercase', fontWeight: 600 }}>Var. dia</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontWeight: 'bold', fontSize: '1rem' }}>
                                                <TrendingDown size={16} />
                                                {formatVariation(stock.change_day)}
                                            </div>
                                        </div>
                                    </div>
                                    {idx < topLosers.length - 1 && (
                                        <div style={{ margin: '12px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)' }}></div>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Nenhum dado disponível.</p>
                        )}
                    </div>
                </div>
            </div>

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
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                            <div className="rf-card-icon" style={{
                                background: '#3b82f6', color: '#fff',
                                minWidth: '32px', width: '32px', height: '32px',
                                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Landmark size={20} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#fff', margin: 0, lineHeight: '1.2' }}>
                                Oportunidades em Renda Fixa
                            </h3>
                        </div>
                    </div>

                    <div className="rf-items-grid" style={{ padding: '24px' }}>
                        {fixedOpportunities.length === 0 ? (
                            <div className="rf-empty" style={{ marginTop: '0' }}>
                                <AlertCircle size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#3b82f6' }} />
                                <p style={{ color: '#3b82f6' }}>Nenhuma oportunidade encontrada.</p>
                            </div>
                        ) : (
                            fixedOpportunities.map((item, idx) => {
                                const rawRate = item.taxa_compra || "0,00";
                                const titleUpper = item.titulo.toUpperCase();
                                const catUpper = (item.category || "").toUpperCase();
                                const isSelic = titleUpper.includes("SELIC");
                                const isIPCA = titleUpper.includes("IPCA") || titleUpper.includes("RENDA+");

                                let displayRate = rawRate;
                                let periodLabel = "ao Ano";

                                // Ensure % symbol if missing
                                if (!displayRate.includes('%')) displayRate += '%';

                                // Logic per type
                                if (isSelic) {
                                    // Calculate Total: Fixed + Selic Index
                                    try {
                                        const fixedPartStr = rawRate.replace(/[^\d,.]/g, "").replace(",", ".");
                                        const fixedPart = parseFloat(fixedPartStr) || 0;

                                        const selicIndexStr = indices.selic ? indices.selic.replace(/[^\d,.]/g, "").replace(",", ".") : "0";
                                        const selicIndex = parseFloat(selicIndexStr) || 0;

                                        if (selicIndex > 0) {
                                            const total = fixedPart + selicIndex;
                                            displayRate = `${total.toFixed(2).replace('.', ',')}%`;
                                        }
                                    } catch (e) {
                                        console.error("Error calculating Selic total", e);
                                    }

                                    periodLabel = "ao Ano";
                                } else if (isIPCA) {
                                    displayRate = `IPCA + ${displayRate}`;
                                }

                                // Determine Style (Icon + Color)
                                let StyleIcon = Landmark;
                                // Minimalist Gray for all types (User requested to remove colors)
                                let styleColor = '#94a3b8';

                                if (catUpper.includes("RESERVA") || titleUpper.includes("SELIC")) {
                                    StyleIcon = AlertTriangle;
                                } else if (catUpper.includes("PROTEÇÃO") || titleUpper.includes("IPCA")) {
                                    StyleIcon = Shield;
                                } else if (catUpper.includes("LONGO") || titleUpper.includes("EDUCA") || titleUpper.includes("RENDA+")) {
                                    StyleIcon = Clock;
                                } else if (catUpper.includes("PRÉ") || titleUpper.includes("PREFIXADO")) {
                                    StyleIcon = Lock;
                                }

                                return (
                                    <div key={idx} className="rf-card glass-card" style={{
                                        borderLeft: `4px solid ${styleColor}`,
                                        padding: '12px', cursor: 'default'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                                {/* Category with Icon */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                    <StyleIcon size={12} color={styleColor} />
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        textTransform: 'uppercase',
                                                        color: styleColor,
                                                        letterSpacing: '0.5px',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {item.type_display || item.category}
                                                    </span>
                                                </div>

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
                                            <span>Venc: {formatDate(item.vencimento)}</span>
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
                        display: 'flex',
                        alignItems: window.innerWidth >= 768 ? 'center' : 'flex-end',
                        justifyContent: 'center',
                        padding: window.innerWidth >= 768 ? '40px' : '0'
                    }} onClick={() => setSelectedOpportunity(null)}>

                        {/* Main Modal Container matching .options-modal */}
                        <div style={{
                            width: window.innerWidth >= 768 ? '90%' : '100%',
                            maxWidth: window.innerWidth >= 768 ? '900px' : '100%',
                            height: window.innerWidth >= 768 ? '80%' : '90%',
                            maxHeight: window.innerWidth >= 768 ? '700px' : '100%',
                            backgroundColor: '#0f172a',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: window.innerWidth >= 768 ? '24px' : '24px 24px 0 0',
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
                                    onClick={() => setSelectedOpportunity(null)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: 500
                                    }}
                                >
                                    Fechar
                                    <CloseIcon size={16} />
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
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedOpportunity.options.calls && selectedOpportunity.options.calls
                                            .filter(opt => {
                                                const type = selectedOpportunity.opportunityType;
                                                // Date Helper
                                                const now = new Date(); now.setHours(0, 0, 0, 0);
                                                const [y, m, d] = opt.expiration.split('-').map(Number);
                                                const date = new Date(y, m - 1, d);

                                                if (type === 'expensive') {
                                                    // Sell Call: <= 2 months
                                                    const max = new Date(now); max.setMonth(max.getMonth() + 2); max.setHours(23, 59, 59, 999);
                                                    return date <= max;
                                                } else {
                                                    // Cheap -> Buy Call: > 3 months
                                                    const min = new Date(now); min.setMonth(min.getMonth() + 3);
                                                    return date > min;
                                                }
                                            })
                                            .length > 0 ? (
                                            selectedOpportunity.options.calls
                                                .filter(opt => {
                                                    const type = selectedOpportunity.opportunityType;
                                                    const now = new Date(); now.setHours(0, 0, 0, 0);
                                                    const [y, m, d] = opt.expiration.split('-').map(Number);
                                                    const date = new Date(y, m - 1, d);

                                                    if (type === 'expensive') {
                                                        const max = new Date(now); max.setMonth(max.getMonth() + 2); max.setHours(23, 59, 59, 999);
                                                        return date <= max;
                                                    } else {
                                                        const min = new Date(now); min.setMonth(min.getMonth() + 3);
                                                        return date > min;
                                                    }
                                                })
                                                .map((opt, i) => {
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
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {selectedOpportunity.options.puts && selectedOpportunity.options.puts
                                            .filter(opt => {
                                                const type = selectedOpportunity.opportunityType;
                                                // Date Helper
                                                const now = new Date(); now.setHours(0, 0, 0, 0);
                                                const [y, m, d] = opt.expiration.split('-').map(Number);
                                                const date = new Date(y, m - 1, d);

                                                if (type === 'cheap') {
                                                    // Sell Put: <= 2 months
                                                    const max = new Date(now); max.setMonth(max.getMonth() + 2); max.setHours(23, 59, 59, 999);
                                                    return date <= max;
                                                } else {
                                                    // Expensive -> Buy Put: > 3 months
                                                    const min = new Date(now); min.setMonth(min.getMonth() + 3);
                                                    return date > min;
                                                }
                                            })
                                            .length > 0 ? (
                                            selectedOpportunity.options.puts
                                                .filter(opt => {
                                                    const type = selectedOpportunity.opportunityType;
                                                    // Date Helper
                                                    const now = new Date(); now.setHours(0, 0, 0, 0);
                                                    const [y, m, d] = opt.expiration.split('-').map(Number);
                                                    const date = new Date(y, m - 1, d);

                                                    if (type === 'cheap') {
                                                        const max = new Date(now); max.setMonth(max.getMonth() + 2); max.setHours(23, 59, 59, 999);
                                                        return date <= max;
                                                    } else {
                                                        const min = new Date(now); min.setMonth(min.getMonth() + 3);
                                                        return date > min;
                                                    }
                                                })
                                                .map((opt, i) => {
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
            {/* Operation Explanation Modal */}
            {
                selectedOperation && (
                    <OperationModal
                        operation={selectedOperation}
                        onClose={() => setSelectedOperation(null)}
                    />
                )
            }

            {/* ================================================================================== */}
            {/* NEW SECTIONS: News & Calendar Highlights */}
            {/* ================================================================================== */}

            {/* Separator */}
            <div style={{ margin: '40px 0 20px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>

            {/* 1. Destaques: Notícias (2 Brasil + 2 Mundo) */}
            <div className="section-header" style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Newspaper size={20} /> Notícias (Brasil & Mundo)
                </h2>
            </div>

            <div className="dashboard-grid" style={{ gap: '12px' }}>
                {homeNews.length > 0 ? (
                    homeNews.map((item, idx) => (
                        <div key={idx} className="news-card glass-card" onClick={() => window.open(item.link, '_blank')}
                            style={{
                                cursor: 'pointer',
                                padding: '12px',
                                background: 'rgba(30, 41, 59, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                minHeight: 'auto'
                            }}>
                            <div className="news-card-header" style={{ marginBottom: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <span className="news-badge" style={{ fontSize: '0.6rem', padding: '2px 6px', background: item.category === 'MUNDO' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(74, 222, 128, 0.2)', color: item.category === 'MUNDO' ? '#38bdf8' : '#4ade80' }}>
                                        {item.category || (idx < 2 ? 'BRASIL' : 'MUNDO')}
                                    </span>
                                    <span className="news-badge" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{item.source}</span>
                                </div>
                                <span className="news-date" style={{ fontSize: '0.65rem' }}>{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                {item.image && (
                                    <img src={item.image} alt={item.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                                )}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <h3 className="news-title" style={{ fontSize: '0.9rem', lineHeight: '1.3', margin: 0, fontWeight: 600, color: '#f1f5f9', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {item.title}
                                    </h3>
                                </div>
                            </div>

                            <div className="news-footer" style={{ marginTop: '0', paddingTop: '0', borderTop: 'none', justifyContent: 'flex-end' }}>
                                <span className="news-read-more" style={{ fontSize: '0.7rem' }}>
                                    Ler mais <ChevronRight size={12} />
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-card" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        Carregando destaques...
                    </div>
                )}
            </div>

            {/* 2. Cotações Gerais */}
            {/* 2. Cotações Gerais */}
            <div className="market-overview-card glass-card" style={{ padding: '0', marginTop: '32px', overflow: 'hidden' }}>
                <div style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(90deg, #1e3a8a 0%, #0f172a 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            <TrendingUp size={18} color="#ffffff" />
                        </div>
                        <h2 style={{ fontSize: '1.1rem', color: '#f8fafc', margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
                            Cotações Mundiais
                        </h2>
                    </div>

                    {/* Period Selector */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '2px' }}>
                        {['1D', '1S', '1M'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setQtPeriod(p)}
                                style={{
                                    background: qtPeriod === p ? 'rgba(59, 130, 246, 0.8)' : 'transparent',
                                    color: qtPeriod === p ? '#fff' : '#94a3b8',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {generalQuotes.map((quote, index) => {
                            // Determine which change to show based on period
                            let displayChange = quote.change; // Default 1D
                            if (qtPeriod === '1S') displayChange = quote.change_1w || 0;
                            if (qtPeriod === '1M') displayChange = quote.change_1m || 0;

                            // Fallback if backend doesn't send new fields yet (backward compatibility)
                            if (displayChange === undefined) displayChange = quote.change;

                            const isPositive = displayChange >= 0;
                            const color = isPositive ? '#4ade80' : '#ef4444';
                            const Sign = isPositive ? '+' : '';

                            const getTheme = (name) => {
                                switch (name) {
                                    case 'IBOV': return { bg: '#1e3a8a', icon: <BarChart2 size={18} color="#ffffff" /> };
                                    case 'Dólar': return { bg: '#14532d', icon: <DollarSign size={18} color="#ffffff" /> };
                                    case 'Bitcoin': return { bg: '#78350f', icon: <Bitcoin size={18} color="#ffffff" /> };
                                    case 'Euro': return { bg: '#0c4a6e', icon: <Euro size={18} color="#ffffff" /> };
                                    case 'Libra': return { bg: '#581c87', icon: <PoundSterling size={18} color="#ffffff" /> };
                                    default: return { bg: '#334155', icon: <TrendingUp size={18} color="#ffffff" /> };
                                }
                            };

                            const theme = getTheme(quote.name);

                            return (
                                <React.Fragment key={quote.id}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '32px', height: '32px',
                                                borderRadius: '8px',
                                                background: theme.bg,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                {theme.icon}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>{quote.name}</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600, letterSpacing: '-0.5px' }}>
                                                {quote.name === 'IBOV' ? `${Math.round(quote.price).toLocaleString('pt-BR')} pts` :
                                                    quote.name === 'Bitcoin' ? `US$ ${quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
                                                        `R$ ${quote.price.toFixed(2).replace('.', ',')}`}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {isPositive ? <TrendingUp size={12} color={color} /> : <TrendingDown size={12} color={color} />}
                                                <span style={{ fontSize: '0.75rem', color: color, fontWeight: 600 }}>
                                                    {Sign}{displayChange.toFixed(2).replace('.', ',')}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {index < generalQuotes.length - 1 && (
                                        <div style={{ margin: '12px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)' }}></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {generalQuotes.length === 0 && <div style={{ color: '#64748b' }}>Carregando cotações...</div>}
                    </div>
                </div>
            </div>

            {/* 3. Destaques: Calendário (Dividends & Earnings) */}
            <div style={{ margin: '40px 0 20px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>

            <div className="section-header" style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} /> Radar da Semana
                </h2>
            </div>

            <div className="dashboard-grid">
                {/* Dividendos */}
                <div className="glass-card">
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(74, 222, 128, 0.2), transparent)',
                        borderBottom: '1px solid rgba(74, 222, 128, 0.1)'
                    }}>
                        <div className="rf-card-icon" style={{ background: '#4ade80' }}>
                            <DollarSign size={20} color="#fff" />
                        </div>
                        <h3>Próximos Dividendos</h3>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        {homeCalendar.dividends.length > 0 ? (
                            homeCalendar.dividends.map((evt, idx) => {
                                const stock = stocksMap[evt.ticker] || {};
                                return (
                                    <React.Fragment key={idx}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {stock.image_url ? <img src={stock.image_url} alt={evt.ticker} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#cbd5e1' }}>{evt.ticker[0]}</span>}
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{evt.ticker}</h3>
                                                    <span style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name || ''}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 'bold' }}>PREVISTO</span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateSimple(evt.date)}</span>
                                            </div>
                                        </div>
                                        {idx < homeCalendar.dividends.length - 1 && (
                                            <div style={{ margin: '12px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)' }}></div>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Nenhum evento previsto.</p>
                        )}
                    </div>
                </div>

                {/* Resultados */}
                <div className="glass-card">
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.2), transparent)',
                        borderBottom: '1px solid rgba(56, 189, 248, 0.1)'
                    }}>
                        <div className="rf-card-icon" style={{ background: '#38bdf8' }}>
                            <PieChart size={20} color="#fff" />
                        </div>
                        <h3>Resultados Trimestrais</h3>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        {homeCalendar.earnings.length > 0 ? (
                            homeCalendar.earnings.map((evt, idx) => {
                                const stock = stocksMap[evt.ticker] || {};
                                return (
                                    <React.Fragment key={idx}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {stock.image_url ? <img src={stock.image_url} alt={evt.ticker} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#cbd5e1' }}>{evt.ticker[0]}</span>}
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{evt.ticker}</h3>
                                                    <span style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name || ''}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 'bold' }}>RESULTADO</span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateSimple(evt.date)}</span>
                                            </div>
                                        </div>
                                        {idx < homeCalendar.earnings.length - 1 && (
                                            <div style={{ margin: '12px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)' }}></div>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Nenhum resultado previsto.</p>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Home;
