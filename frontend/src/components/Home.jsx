import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import ModernLoader from './ModernLoader';
import '../components/FixedIncome.css';
import './OptionsModule.css';
import './Home.css';
import './Dashboard.css'; // Import Dashboard Styles
import './News.css';
import '../styles/main.css';
import { TrendingUp, TrendingDown, Landmark, ChevronRight, DollarSign, Calendar, AlertCircle, X as CloseIcon, Sparkles, PieChart, Crosshair, Shield, Lock, Clock, AlertTriangle, Newspaper, BookOpen, BarChart2, Bitcoin, Euro, PoundSterling, Filter, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { getApiUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StockTicker from './StockTicker';
import StockDetail from './StockDetail';
import OptionCard from './OptionCard';
import OperationChart from './OperationChart';



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

const Home = ({ onNavigate, onStockClick }) => {
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
    const [segMetric, setSegMetric] = useState('cagr_luc');
    const [segOrder, setSegOrder] = useState('top'); // top or bottom
    const [segmentedStocks, setSegmentedStocks] = useState([]);

    // ── Hero Parallax Effect ──
    const heroRef = useRef(null);

    useEffect(() => {
        const container = heroRef.current?.closest('.rf-container');
        if (!container) return;

        let ticking = false;
        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const scrollY = container.scrollTop || window.scrollY;
                const fadeDistance = 200;
                const progress = Math.min(scrollY / fadeDistance, 1);

                if (heroRef.current) {
                    heroRef.current.style.setProperty('--hero-opacity', String(1 - progress));
                    heroRef.current.style.setProperty('--hero-translate', `${-progress * 30}px`);
                }
                ticking = false;
            });
        };

        // Try container scroll first, fall back to window
        const scrollTarget = container.scrollHeight > container.clientHeight ? container : window;
        scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollTarget.removeEventListener('scroll', handleScroll);
    }, []);

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

                // Stocks Map
                const resStocks = await fetch(getApiUrl('/api/stocks'));
                const jsonStocks = await resStocks.json();
                const map = {};
                if (Array.isArray(jsonStocks)) {
                    jsonStocks.forEach(s => map[s.ticker] = s);
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

    // Effect to update Movers based purely on daily variation
    useEffect(() => {
        const stocksList = Object.values(stocksMap);
        if (stocksList.length === 0) return;

        const getVal = (v) => {
            if (v === undefined || v === null) return 0;
            let num = 0;
            if (typeof v === 'number') {
                num = v;
            } else if (typeof v === 'string') {
                let clean = v.replace('%', '').replace(',', '.').replace('R$', '').trim();
                num = parseFloat(clean);
            }
            return isNaN(num) ? 0 : num;
        };

        const field = 'change_day'; // Force purely daily variation

        const sorted = [...stocksList]
            .filter(s => {
                const val = getVal(s[field]);
                return val !== 0;
            })
            .sort((a, b) => getVal(b[field]) - getVal(a[field]));

        setTopGainers(sorted.slice(0, 3));
        setTopLosers(sorted.slice(-3).reverse());
    }, [stocksMap]);

    // Effect for Segmentation Filter
    useEffect(() => {
        const stocksList = Object.values(stocksMap);
        if (stocksList.length === 0) return;

        const getVal = (v) => {
            if (v === undefined || v === null) return 0;
            let num = 0;
            if (typeof v === 'number') {
                num = v;
            } else if (typeof v === 'string') {
                let clean = v.replace('%', '').replace(',', '.').replace('R$', '').trim();
                num = parseFloat(clean);
            }
            return isNaN(num) ? 0 : num;
        };

        const sorted = [...stocksList]
            .filter(s => {
                const val = getVal(s[segMetric]);
                return val !== 0;
            })
            .sort((a, b) => {
                const valA = getVal(a[segMetric]);
                const valB = getVal(b[segMetric]);
                return segOrder === 'top' ? valB - valA : valA - valB;
            });

        setSegmentedStocks(sorted.slice(0, 5));
    }, [segMetric, segOrder, stocksMap]);

    // Helper for Calendar Dates
    const formatDateSimple = (dateStr) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}`;
    };

    const getMetricLabel = (m) => {
        switch (m) {
            case 'cagr_luc': return 'Crescimento/Lucro';
            case 'cagr_pat': return 'Crescimento/Patrimônio';
            case 'cagr_roe': return 'Crescimento/ROE';
            case 'div_ebit': return 'Dív. Líq. / EBIT';
            case 'div_pl': return 'Dív. Líq. / PL';
            default: return '';
        }
    };

    const formatSegValue = (v, m) => {
        if (v === undefined || v === null || v === "") return '-';
        let num = 0;
        if (typeof v === 'number') {
            num = v;
        } else if (typeof v === 'string') {
            let clean = v.replace('%', '').replace(',', '.').replace('R$', '').trim();
            num = parseFloat(clean);
        }

        if (isNaN(num)) return '-';

        let formatted = num.toFixed(2).replace('.', ',');
        if (m.startsWith('cagr')) return `${formatted}%`;
        return formatted;
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
                            </div>
                        </div>

                        {/* Chart Component showing exact Stock price, Strike, and Breakeven regions */}
                        <OperationChart operation={operation} />

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
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</div>
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
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</div>
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
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>3</div>
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
                </motion.div >
            </div >
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
        if (val >= -15) color = '#4ade80';
        else if (val > -50) color = '#facc15';

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

            {/* ═══ HERO SECTION ═══ */}
            <div className="home-hero" ref={heroRef}>
                <div className="home-hero-content">
                    <h1 className="home-hero-title">
                        <span className="greeting">Olá </span>
                        <span className="name">Investidor</span>
                    </h1>
                    <p className="home-hero-subtitle">Seja bem vindo!</p>
                </div>
            </div>

            {/* Renda Variável Header */}
            <div className="home-section-header" style={{ marginTop: '16px' }}>
                <TrendingUp size={22} color="var(--home-text-secondary)" />
                <h2>Renda Variável</h2>
            </div>

            {/* Dashboard Grid for Two Columns on Desktop */}
            <div className="dashboard-grid">
                {/* 1. Oportunidade em Ativos Descontados */}
                <div style={{ marginTop: '8px' }}>
                    <div className="home-card" style={{ height: '100%' }}>
                        <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(74, 222, 128, var(--home-header-alpha)), transparent)' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                <div className="home-icon-box" style={{ background: '#4ade80', color: '#000' }}>
                                    <TrendingUp size={18} />
                                </div>
                                <h3>Oportunidade em Ativos Descontados</h3>
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

                                        // Filter Logic matching Modal (Cheap)
                                        const now = new Date(); now.setHours(0, 0, 0, 0);

                                        // Puts (Venda Coberta): <= 2 Months
                                        const maxDate = new Date(now); maxDate.setMonth(maxDate.getMonth() + 2); maxDate.setHours(23, 59, 59, 999);
                                        const validPuts = (item.options?.puts || []).filter(opt => {
                                            const [y, m, d] = opt.expiration.split('-').map(Number);
                                            const date = new Date(y, m - 1, d);
                                            return date <= maxDate;
                                        });

                                        // Calls (Compra a Seco): > 3 Months
                                        const minDate = new Date(now); minDate.setMonth(minDate.getMonth() + 3);
                                        const validCalls = (item.options?.calls || []).filter(opt => {
                                            const [y, m, d] = opt.expiration.split('-').map(Number);
                                            const date = new Date(y, m - 1, d);
                                            return date > minDate;
                                        });

                                        const putsCount = validPuts.length;
                                        const callsCount = validCalls.length;

                                        if (putsCount === 0 && callsCount === 0) return null; // Hide if no valid opts

                                        return (
                                            <div
                                                key={idx}
                                                className="home-opportunity-card cheap"
                                                onClick={() => setSelectedOpportunity({ ...item, opportunityType: 'cheap' })}
                                            >
                                                <div className="home-opportunity-header">
                                                    <div className="stock-left">
                                                        <div className="home-avatar">
                                                            {stock.image_url ? (
                                                                <img src={stock.image_url} alt={stock.ticker} />
                                                            ) : (
                                                                <span className="fallback">{stock.ticker?.slice(0, 2)}</span>
                                                            )}
                                                        </div>
                                                        <div className="home-stock-info">
                                                            <span className="ticker">{stock.ticker}</span>
                                                            <span className="company">{stock.company_name}</span>
                                                        </div>
                                                    </div>

                                                    <div className="stock-right">
                                                        <span className="home-value">{stock.price || '---'}</span>
                                                        {stock.falta_pct && <VolatilityCircle value={stock.falta_pct} />}
                                                    </div>
                                                </div>

                                                <div className="home-opportunity-body">
                                                    {putsCount > 0 && (
                                                        <div>
                                                            <span className="home-opportunity-label">Renda Extra</span>
                                                            <div className="home-pill put" style={{ marginTop: '3px' }}>
                                                                <span className="count">{putsCount} PUTS</span>
                                                                <span className="desc">- Para Venda Coberta</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {callsCount > 0 && (
                                                        <div>
                                                            <span className="home-opportunity-label">Alavancagem de Capital</span>
                                                            <div className="home-pill call" style={{ marginTop: '3px' }}>
                                                                <span className="count">{callsCount} CALLS</span>
                                                                <span className="desc">- Para Compra a Seco</span>
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
                    <div className="home-card" style={{ height: '100%' }}>
                        <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(239, 68, 68, var(--home-header-alpha)), transparent)' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                                <div className="home-icon-box" style={{ background: '#ef4444', color: '#fff' }}>
                                    <TrendingUp size={18} style={{ transform: 'rotate(180deg)' }} />
                                </div>
                                <h3>Oportunidade em Ativos Caros <span className="subtitle">- em carteira</span></h3>
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

                                        // Filter Logic matching Modal (Expensive)
                                        const now = new Date(); now.setHours(0, 0, 0, 0);

                                        // Calls (Lançamento Coberto): <= 2 Months
                                        const maxDate = new Date(now); maxDate.setMonth(maxDate.getMonth() + 2); maxDate.setHours(23, 59, 59, 999);
                                        const validCalls = (item.options?.calls || []).filter(opt => {
                                            const [y, m, d] = opt.expiration.split('-').map(Number);
                                            const date = new Date(y, m - 1, d);
                                            return date <= maxDate;
                                        });

                                        // Puts (Compra a Seco): > 3 Months
                                        const minDate = new Date(now); minDate.setMonth(minDate.getMonth() + 3);
                                        const validPuts = (item.options?.puts || []).filter(opt => {
                                            const [y, m, d] = opt.expiration.split('-').map(Number);
                                            const date = new Date(y, m - 1, d);
                                            return date > minDate;
                                        });

                                        const callsCount = validCalls.length;
                                        const putsCount = validPuts.length;

                                        if (callsCount === 0 && putsCount === 0) return null;

                                        return (
                                            <div
                                                key={idx}
                                                className="home-opportunity-card expensive"
                                                onClick={() => setSelectedOpportunity({ ...item, opportunityType: 'expensive' })}
                                            >
                                                <div className="home-opportunity-header">
                                                    <div className="stock-left">
                                                        <div className="home-avatar">
                                                            {stock.image_url ? (
                                                                <img src={stock.image_url} alt={stock.ticker} />
                                                            ) : (
                                                                <span className="fallback">{stock.ticker?.slice(0, 2)}</span>
                                                            )}
                                                        </div>
                                                        <div className="home-stock-info">
                                                            <span className="ticker">{stock.ticker}</span>
                                                            <span className="company">{stock.company_name}</span>
                                                        </div>
                                                    </div>

                                                    <div className="stock-right">
                                                        <span className="home-value">{stock.price || '---'}</span>
                                                        {stock.falta_pct && <VolatilityCircle value={stock.falta_pct} />}
                                                    </div>
                                                </div>

                                                <div className="home-opportunity-body">
                                                    {callsCount > 0 && (
                                                        <div>
                                                            <span className="home-opportunity-label">Renda Extra</span>
                                                            <div className="home-pill call" style={{ marginTop: '3px' }}>
                                                                <span className="count">{callsCount} CALLS</span>
                                                                <span className="desc">- Para Lançamento Coberto</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {putsCount > 0 && (
                                                        <div>
                                                            <span className="home-opportunity-label">Alavancagem de Capital</span>
                                                            <div className="home-pill put" style={{ marginTop: '3px' }}>
                                                                <span className="count">{putsCount} PUTS</span>
                                                                <span className="desc">- Para Compra a Seco</span>
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


            {/* Resumo das Ações: Maiores Altas e Baixas */}
            <div className="home-separator"></div>

            <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '8px', paddingRight: '12px' }}>
                <div className="home-section-header" style={{ padding: 0, marginBottom: 0 }}>
                    <TrendingUp size={22} color="var(--home-text-secondary)" />
                    <h2>Resumo das Ações</h2>
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginTop: '0' }}>
                {/* Maiores Altas */}
                <div className="home-card">
                    <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(74, 222, 128, var(--home-header-alpha)), transparent)' }}>
                        <div className="home-icon-box" style={{ background: '#4ade80', color: '#000' }}>
                            <TrendingUp size={16} />
                        </div>
                        <h3>Maiores Altas</h3>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        {topGainers.length > 0 ? (
                            topGainers.map((stock, idx) => (
                                <React.Fragment key={idx}>
                                    <div
                                        onClick={() => onStockClick(stock)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            cursor: 'pointer', padding: '6px 8px', borderRadius: '8px',
                                            transition: 'background 0.2s',
                                            backgroundColor: 'transparent'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {stock.image_url ? (
                                                <img
                                                    src={stock.image_url}
                                                    alt={stock.ticker}
                                                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
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
                                                <h3 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{stock.ticker}</h3>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1', display: 'block', marginTop: '2px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.company_name}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ fontSize: '0.55rem', color: 'rgb(170, 170, 170)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                Var. dia
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontWeight: 'bold', fontSize: '0.9rem' }}>
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
                <div className="home-card">
                    <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(248, 113, 113, var(--home-header-alpha)), transparent)' }}>
                        <div className="home-icon-box" style={{ background: '#f87171', color: '#fff' }}>
                            <TrendingDown size={16} />
                        </div>
                        <h3>Maiores Baixas</h3>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        {topLosers.length > 0 ? (
                            topLosers.map((stock, idx) => (
                                <React.Fragment key={idx}>
                                    <div
                                        onClick={() => onStockClick(stock)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            cursor: 'pointer', padding: '6px 8px', borderRadius: '8px',
                                            transition: 'background 0.2s',
                                            backgroundColor: 'transparent'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {stock.image_url ? (
                                                <img
                                                    src={stock.image_url}
                                                    alt={stock.ticker}
                                                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
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
                                                <h3 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{stock.ticker}</h3>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1', display: 'block', marginTop: '2px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.company_name}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ fontSize: '0.55rem', color: 'rgb(170, 170, 170)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                Var. dia
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontWeight: 'bold', fontSize: '0.9rem' }}>
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

            {/* Segmentation Filter Section - Refactored into a single card */}
            <div style={{ marginTop: '32px' }}>
                <div className="home-card" style={{ padding: '0' }}>
                    <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(148, 163, 184, var(--home-header-alpha)), transparent)' }}>
                        <div className="home-icon-box" style={{ background: '#94a3b8', color: '#fff' }}>
                            <Filter size={16} />
                        </div>
                        <h3>Filtro de Eficiência</h3>
                    </div>

                    <div className="home-card-body">
                        <div className="home-period-selector" style={{ flexWrap: 'wrap', marginBottom: '12px', gap: '2px' }}>
                            {['cagr_luc', 'cagr_pat', 'cagr_roe', 'div_ebit', 'div_pl'].map(m => (
                                <button
                                    key={m}
                                    className={`home-period-btn ${segMetric === m ? 'active' : ''}`}
                                    onClick={() => setSegMetric(m)}
                                    style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem' }}
                                >
                                    {getMetricLabel(m)}
                                </button>
                            ))}
                        </div>

                        {/* Sorting Arrows Header - Above the list */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 8px 4px 0', gap: '8px', alignItems: 'center' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSegOrder('top'); }}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', color: segOrder === 'top' ? '#4ade80' : '#475569',
                                    transition: 'all 0.2s', padding: '4px'
                                }}
                                title="Ver 5 Maiores"
                            >
                                <ChevronUp size={16} strokeWidth={segOrder === 'top' ? 3 : 2} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSegOrder('bottom'); }}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', color: segOrder === 'bottom' ? '#f87171' : '#475569',
                                    transition: 'all 0.2s', padding: '4px'
                                }}
                                title="Ver 5 Menores"
                            >
                                <ChevronDown size={16} strokeWidth={segOrder === 'bottom' ? 3 : 2} />
                            </button>
                        </div>

                        {segmentedStocks.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {segmentedStocks.map((stock, idx) => {
                                    const val = stock[segMetric];
                                    const formatted = formatSegValue(val, segMetric);

                                    return (
                                        <React.Fragment key={stock.ticker}>
                                            <div
                                                onClick={() => onStockClick(stock)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    cursor: 'pointer', padding: '8px 12px', borderRadius: '12px',
                                                    transition: 'background 0.2s',
                                                    backgroundColor: 'transparent'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {stock.image_url ? (
                                                            <img src={stock.image_url} alt={stock.ticker} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>{stock.ticker?.[0]}</span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.95rem', fontWeight: "bold", color: '#f1f5f9' }}>{stock.ticker}</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {stock.company_name}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                        <span style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: 700,
                                                            color: (() => {
                                                                const n = typeof val === 'number' ? val : parseFloat(val?.toString().replace(',', '.') || '0');
                                                                if (segMetric.startsWith('cagr')) {
                                                                    return n > 0 ? '#4ade80' : n < 0 ? '#f87171' : '#f1f5f9';
                                                                }
                                                                if (segMetric === 'div_ebit' || segMetric === 'div_pl') {
                                                                    return n > 2.5 ? '#f87171' : '#f1f5f9';
                                                                }
                                                                return '#f1f5f9';
                                                            })()
                                                        }}>
                                                            {formatted}
                                                        </span>
                                                        {(segMetric === 'div_ebit' || segMetric === 'div_pl') && (() => {
                                                            const n = typeof val === 'number' ? val : parseFloat(val?.toString().replace(',', '.') || '0');
                                                            return n > 2.5;
                                                        })() && (
                                                                <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 500, marginTop: '-3px', textTransform: 'uppercase' }}>Risco Elevado</span>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                            {idx < segmentedStocks.length - 1 && (
                                                <div style={{ margin: '4px 12px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)' }}></div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                <Filter size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                <p>Nenhum dado disponível para os critérios selecionados.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="home-separator"></div>

            <div className="home-section-header">
                <Landmark size={22} color="var(--home-text-secondary)" />
                <h2>Renda Fixa</h2>
            </div>

            {/* Oportunidades em Renda Fixa Card */}
            <div style={{ marginTop: '0' }}>
                <div className="home-card">
                    <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(59, 130, 246, var(--home-header-alpha)), transparent)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                            <div className="home-icon-box" style={{ background: '#3b82f6', color: '#fff' }}>
                                <Landmark size={18} />
                            </div>
                            <h3>Oportunidades em Renda Fixa</h3>
                        </div>
                    </div>


                    <div className="home-rf-grid" style={{ padding: '16px' }}>
                        {fixedOpportunities.length === 0 ? (
                            <div className="rf-empty" style={{ marginTop: '0', gridColumn: '1 / -1' }}>
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
                                    <div key={idx} className="home-rf-card">
                                        <div className="home-rf-top">
                                            <div className="home-rf-category">
                                                <StyleIcon size={13} color={styleColor} />
                                                <span className="home-rf-category-label">
                                                    {item.type_display || item.category}
                                                </span>
                                            </div>
                                            <div className="home-rf-rate-block">
                                                <span className="home-rf-rate">{displayRate}</span>
                                                <span className="home-rf-period">{periodLabel}</span>
                                            </div>
                                        </div>

                                        <h4 className="home-rf-title" title={item.titulo}>
                                            {item.titulo}
                                        </h4>

                                        <div className="home-rf-footer">
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
                <div className="home-card">
                    <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(168, 85, 247, var(--home-header-alpha)), transparent)' }}>
                        <div className="home-icon-box" style={{ background: '#a855f7', color: '#fff' }}>
                            <Landmark size={18} />
                        </div>
                        <h3>Garantia para opções</h3>
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
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80' }}>
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
                                        textAlign: 'center', padding: '12px 12px 10px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0,
                                        background: 'transparent', color: '#38bdf8', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                        position: 'relative'
                                    }}>
                                        <TrendingUp size={14} />
                                        CALLS
                                        <span style={{ position: 'absolute', bottom: '-1px', left: '20%', right: '20%', height: '2px', borderRadius: '2px', background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)' }}></span>
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

                                                    return (
                                                        <OptionCard
                                                            key={i}
                                                            option={{
                                                                ...opt,
                                                                dist_val: dist,
                                                                premium: opt.cost_display || opt.yield_display || '-',
                                                                onAction: () => setSelectedOperation({
                                                                    option: opt,
                                                                    type: 'call',
                                                                    stock: selectedOpportunity.stock,
                                                                    strategy: selectedOpportunity.opportunityType === 'cheap' ? 'compra_call' : 'venda_call'
                                                                })
                                                            }}
                                                            type="call"
                                                            showExpiration={true}
                                                        />
                                                    );
                                                })
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: '40px', fontStyle: 'italic', opacity: 0.6 }}>
                                                Nenhuma Call disponível.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: PUTS */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Header matching .options-column.puts h3 */}
                                    <h3 style={{
                                        textAlign: 'center', padding: '12px 12px 10px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0,
                                        background: 'transparent', color: '#ef4444', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                        position: 'relative'
                                    }}>
                                        <TrendingDown size={14} />
                                        PUTS
                                        <span style={{ position: 'absolute', bottom: '-1px', left: '20%', right: '20%', height: '2px', borderRadius: '2px', background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }}></span>
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

                                                    return (
                                                        <OptionCard
                                                            key={i}
                                                            option={{
                                                                ...opt,
                                                                dist_val: dist,
                                                                premium: opt.cost_display || opt.yield_display || '-',
                                                                onAction: () => setSelectedOperation({
                                                                    option: opt,
                                                                    type: 'put',
                                                                    stock: selectedOpportunity.stock,
                                                                    strategy: selectedOpportunity.opportunityType === 'cheap' ? 'venda_put' : 'compra_put'
                                                                })
                                                            }}
                                                            type="put"
                                                            showExpiration={true}
                                                        />
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
            <div className="home-separator" style={{ margin: '36px 0 16px 0' }}></div>

            <div className="home-section-header" style={{ marginBottom: '16px' }}>
                <Newspaper size={20} color="var(--home-text-secondary)" />
                <h2>Notícias (Brasil & Mundo)</h2>
            </div>

            <div className="dashboard-grid" style={{ gap: '12px' }}>
                {homeNews.length > 0 ? (
                    homeNews.map((item, idx) => (
                        <div key={idx} className="home-news-card" onClick={() => window.open(item.link, '_blank')}>
                            <div className="home-news-meta">
                                <div className="home-news-badges">
                                    <span className={`home-news-badge ${item.category === 'MUNDO' ? 'world' : 'brazil'}`}>
                                        {item.category || (idx < 2 ? 'BRASIL' : 'MUNDO')}
                                    </span>
                                    <span className="home-news-badge source">{item.source}</span>
                                </div>
                                <span className="home-news-date">
                                    {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}
                                </span>
                            </div>

                            <div className="home-news-content">
                                {item.image && (
                                    <img className="home-news-image" src={item.image} alt={item.title} />
                                )}
                                <h3 className="home-news-title">{item.title}</h3>
                            </div>

                            <div className="home-news-footer">
                                <span className="home-read-more">
                                    Ler mais <ChevronRight size={12} />
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="home-card" style={{ padding: '20px', textAlign: 'center', color: 'var(--home-text-tertiary)' }}>
                        Carregando destaques...
                    </div>
                )}
            </div>

            {/* 2. Cotações Gerais */}
            {/* 2. Cotações Gerais */}
            <div className="home-card" style={{ marginTop: '32px' }}>
                <div className="home-cotacoes-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="home-icon-box" style={{ background: '#3b82f6', color: '#fff' }}>
                            <TrendingUp size={16} />
                        </div>
                        <h2 style={{ fontSize: '1.05rem', color: 'var(--home-text-primary)', margin: 0, fontWeight: 700, letterSpacing: '-0.3px' }}>
                            Cotações Mundiais
                        </h2>
                    </div>

                    <div className="home-period-selector">
                        {['1D', '1S', '1M'].map((p) => (
                            <button
                                key={p}
                                className={`home-period-btn ${qtPeriod === p ? 'active' : ''}`}
                                onClick={() => setQtPeriod(p)}
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
            <div className="home-separator" style={{ margin: '36px 0 16px 0' }}></div>

            <div className="home-section-header" style={{ marginBottom: '16px' }}>
                <Calendar size={20} color="var(--home-text-secondary)" />
                <h2>Radar da Semana</h2>
            </div>

            <div className="dashboard-grid">
                {/* Dividendos */}
                <div className="home-card">
                    <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(74, 222, 128, var(--home-header-alpha)), transparent)' }}>
                        <div className="home-icon-box" style={{ background: '#4ade80', color: '#fff' }}>
                            <DollarSign size={16} />
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
                                                    <h3 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{evt.ticker}</h3>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name || ''}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 500 }}>Previsto</span>
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
                <div className="home-card">
                    <div className="home-card-header" style={{ background: 'linear-gradient(90deg, rgba(56, 189, 248, var(--home-header-alpha)), transparent)' }}>
                        <div className="home-icon-box" style={{ background: '#38bdf8', color: '#fff' }}>
                            <PieChart size={16} />
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
                                                    <h3 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0', lineHeight: '1', fontWeight: 'bold' }}>{evt.ticker}</h3>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1', display: 'block', marginTop: '2px' }}>{stock.company_name || ''}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 500 }}>Resultado</span>
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

export default Home