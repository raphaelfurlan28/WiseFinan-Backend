import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, Sliders, Calendar, TrendingUp, TrendingDown, RefreshCw, ChevronLeft, Filter } from 'lucide-react';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './OptionsModule.css';

// Helper functions for BS calculations in the frontend
const parsePrice = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0.0;
    let clean = val.replace('R$', '').replace(' ', '').replace('%', '').trim();
    if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
        clean = clean.replace(',', '.');
    }
    return parseFloat(clean) || 0.0;
};

const smartFloat = (val) => {
    return parsePrice(val);
};

const formatCostPrice = (val) => {
    if (!val) return '-';
    const num = parsePrice(val);
    if (num === 0.0) return '-';
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
};

// Cumulative normal distribution function (approximation)
const cnd = (x) => {
    const a1 = 0.31938153, a2 = -0.356563782, a3 = 1.781477937, a4 = -1.821255978, a5 = 1.330274429;
    const L = Math.abs(x);
    const K = 1.0 / (1.0 + 0.2316419 * L);
    let w = 1.0 - 1.0 / Math.sqrt(2.0 * Math.PI) * Math.exp(-L * L / 2.0) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
    if (x < 0) {
        w = 1.0 - w;
    }
    return w;
};

// Black-Scholes Price
const blackScholesPrice = (S, K, T, r, sigma, type) => {
    if (T <= 0) return Math.max(0, type === 'call' ? S - K : K - S);
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2.0) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    if (type === 'call') {
        return S * cnd(d1) - K * Math.exp(-r * T) * cnd(d2);
    } else {
        return K * Math.exp(-r * T) * cnd(-d2) - S * cnd(-d1);
    }
};

// Delta
const calculateDelta = (S, K, T, r, sigma, type) => {
    if (T <= 0) return 0;
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2.0) * T) / (sigma * Math.sqrt(T));
    if (type === 'call') {
        return cnd(d1);
    } else {
        return cnd(d1) - 1.0;
    }
};

// Expiration parse helper
const parseExpirationDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d);
    } else if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(y, m - 1, d);
    }
    return new Date(0);
};

// Business days calculation
const getBusinessDays = (startDate, endDate) => {
    let count = 0;
    let curDate = new Date(startDate.getTime());
    curDate.setHours(0, 0, 0, 0);
    const end = new Date(endDate.getTime());
    end.setHours(0, 0, 0, 0);
    
    while (curDate <= end) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

// Frontend Greeks enrichment
const enrichOptionWithGreeks = (opt, stock) => {
    if (!stock) return opt;
    
    try {
        const S = parsePrice(stock.price);
        const K = smartFloat(opt.strike);
        
        // Volatility
        let volVal = 0.40;
        if (stock.vol_ano) {
            const volClean = stock.vol_ano.replace('%', '').replace(',', '.').trim();
            volVal = parseFloat(volClean) / 100.0;
            if (isNaN(volVal) || volVal <= 0) volVal = 0.40;
        }
        
        const today = new Date();
        const expDate = parseExpirationDate(opt.expiration);
        const bdays = getBusinessDays(today, expDate);
        
        if (bdays > 0 && S > 0 && K > 0) {
            const T = bdays / 252.0;
            const r = 0.1075; // Default Selic risk free rate
            const type = opt.type.toLowerCase(); // 'call' or 'put'
            
            const delta = calculateDelta(S, K, T, r, volVal, type);
            const bsPrice = blackScholesPrice(S, K, T, r, volVal, type);
            const probSuccess = Math.abs(delta);
            
            const marketPrice = opt.price_val || parsePrice(opt.price);
            let edgePct = 0.0;
            if (bsPrice > 0) {
                edgePct = ((marketPrice - bsPrice) / bsPrice) * 100;
            }
            
            return {
                ...opt,
                delta_val: delta.toFixed(3),
                bs_price_val: `R$ ${bsPrice.toFixed(2).replace('.', ',')}`,
                prob_success: `${(probSuccess * 100).toFixed(1)}%`,
                edge_formatted: `${edgePct.toFixed(1)}%`
            };
        }
    } catch (e) {
        console.error("Error calculating Greeks in frontend:", e);
    }
    return opt;
};

export default function OptionsScreener({ onStockClick }) {
    const [allOptionsLoaded, setAllOptionsLoaded] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [stocksMap, setStocksMap] = useState({});
    const [loadingData, setLoadingData] = useState(true);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // Filters (Backed by sessionStorage to persist state on navigation)
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('screener_searchQuery') || '');
    const [selectedType, setSelectedType] = useState(() => sessionStorage.getItem('screener_selectedType') || 'ALL');
    const [minPremium, setMinPremium] = useState(() => parseFloat(sessionStorage.getItem('screener_minPremium')) || 0);
    const [minExpiration, setMinExpiration] = useState(() => sessionStorage.getItem('screener_minExpiration') || 'ALL');
    const [maxExpiration, setMaxExpiration] = useState(() => sessionStorage.getItem('screener_maxExpiration') || 'ALL');
    const [hasSearched, setHasSearched] = useState(() => sessionStorage.getItem('screener_hasSearched') === 'true');

    // Cost valuation filters
    const [selectedCostRef, setSelectedCostRef] = useState(() => sessionStorage.getItem('screener_selectedCostRef') || 'ALL'); // ALL, CUSTO_BAIXO, CUSTO_ALTO
    const [costDistance, setCostDistance] = useState(() => parseFloat(sessionStorage.getItem('screener_costDistance')) || 10); // in percent (default 10)
    const [sortBy, setSortBy] = useState(() => sessionStorage.getItem('screener_sortBy') || 'PREMIUM_DESC'); // PREMIUM_DESC, PREMIUM_ASC, TICKER_STRIKE
    const [strikeRelation, setStrikeRelation] = useState(() => sessionStorage.getItem('screener_strikeRelation') || 'ALL'); // ALL, UNDER, OVER

    // Applied Filters (Used for display)
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [currentPage, setCurrentPage] = useState(() => parseInt(sessionStorage.getItem('screener_currentPage')) || 1);

    // Save states to sessionStorage when they change
    useEffect(() => {
        sessionStorage.setItem('screener_searchQuery', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        sessionStorage.setItem('screener_selectedType', selectedType);
    }, [selectedType]);

    useEffect(() => {
        sessionStorage.setItem('screener_minPremium', minPremium.toString());
    }, [minPremium]);

    useEffect(() => {
        sessionStorage.setItem('screener_minExpiration', minExpiration);
    }, [minExpiration]);

    useEffect(() => {
        sessionStorage.setItem('screener_maxExpiration', maxExpiration);
    }, [maxExpiration]);

    useEffect(() => {
        sessionStorage.setItem('screener_currentPage', currentPage.toString());
    }, [currentPage]);

    useEffect(() => {
        sessionStorage.setItem('screener_hasSearched', hasSearched.toString());
    }, [hasSearched]);

    useEffect(() => {
        sessionStorage.setItem('screener_selectedCostRef', selectedCostRef);
    }, [selectedCostRef]);

    useEffect(() => {
        sessionStorage.setItem('screener_costDistance', costDistance.toString());
    }, [costDistance]);

    useEffect(() => {
        sessionStorage.setItem('screener_sortBy', sortBy);
    }, [sortBy]);

    useEffect(() => {
        sessionStorage.setItem('screener_strikeRelation', strikeRelation);
    }, [strikeRelation]);

    // Fetch initial list of options and stocks in background on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch stocks map
                const stocksRes = await fetch(getApiUrl('/api/stocks'));
                const stocksData = await stocksRes.json();
                setStocks(stocksData);
                
                const map = {};
                if (Array.isArray(stocksData)) {
                    stocksData.forEach(s => map[s.ticker] = s);
                }
                setStocksMap(map);

                // Fetch options (fast from Flask cache)
                const optionsRes = await fetch(getApiUrl('/api/options'));
                const optionsData = await optionsRes.json();
                setAllOptionsLoaded(optionsData);
            } catch (error) {
                console.error("Error loading data for options screener:", error);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, []);

    // Auto-apply filters on mount if user had already searched
    useEffect(() => {
        if (allOptionsLoaded.length > 0 && hasSearched) {
            const filtered = allOptionsLoaded.filter(option => {
                const codeMatch = option.ticker?.toLowerCase().includes(searchQuery.toLowerCase());
                const stockMatch = option.underlying?.toLowerCase().includes(searchQuery.toLowerCase());
                if (searchQuery && !codeMatch && !stockMatch) return false;

                if (selectedType !== 'ALL' && option.type !== selectedType) return false;

                const premiumPercent = (option.premium_val || 0) * 100;
                if (premiumPercent < minPremium) return false;

                if (minExpiration !== 'ALL') {
                    const optionDate = parseExpirationDate(option.expiration);
                    const minDate = parseExpirationDate(minExpiration);
                    if (optionDate < minDate) return false;
                }
                if (maxExpiration !== 'ALL') {
                    const optionDate = parseExpirationDate(option.expiration);
                    const maxDate = parseExpirationDate(maxExpiration);
                    if (optionDate > maxDate) return false;
                }
                // Strike relation to current stock price filter
                if (strikeRelation !== 'ALL') {
                    const stock = stocksMap[option.underlying];
                    if (!stock) return false;
                    const S = parsePrice(stock.price);
                    const K = smartFloat(option.strike);
                    if (S > 0 && K > 0) {
                        if (strikeRelation === 'UNDER') {
                            if (S >= K) return false;
                        } else if (strikeRelation === 'OVER') {
                            if (S <= K) return false;
                        }
                    } else {
                        return false;
                    }
                }

                // Cost reference filter
                if (selectedCostRef !== 'ALL') {
                    const stock = stocksMap[option.underlying];
                    if (!stock) return false;
                    const C = parsePrice(selectedCostRef === 'CUSTO_BAIXO' ? stock.min_val : stock.max_val);
                    const K = smartFloat(option.strike);
                    if (C > 0 && K > 0) {
                        const X = costDistance / 100.0;
                        if (selectedCostRef === 'CUSTO_BAIXO') {
                            // Strike must be <= Custo Baixo * (1 + X)
                            if (K > C * (1 + X)) return false;
                        } else if (selectedCostRef === 'CUSTO_ALTO') {
                            // Strike must be >= Custo Alto * (1 - X)
                            if (K < C * (1 - X)) return false;
                        }
                    } else {
                        return false;
                    }
                }

                return true;
            });

            filtered.sort((a, b) => {
                if (sortBy === 'PREMIUM_DESC') {
                    return (b.premium_val || 0) - (a.premium_val || 0);
                } else if (sortBy === 'PREMIUM_ASC') {
                    return (a.premium_val || 0) - (b.premium_val || 0);
                } else {
                    const comp = (a.underlying || '').localeCompare(b.underlying || '');
                    if (comp !== 0) return comp;
                    const strikeA = parseFloat(a.strike?.replace(',', '.')) || 0;
                    const strikeB = parseFloat(b.strike?.replace(',', '.')) || 0;
                    return strikeA - strikeB;
                }
            });

            setFilteredOptions(filtered);
        }
    }, [allOptionsLoaded]);

    // Expiration date display formatting
    const formatExpirationDisplay = (dateStr) => {
        if (!dateStr) return '-';
        if (dateStr.includes('-')) {
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        }
        return dateStr;
    };

    // Get unique expiration dates sorted chronologically (using loaded options list)
    const uniqueExpirations = useMemo(() => {
        return [...new Set(allOptionsLoaded.map(o => formatExpirationDisplay(o.expiration)))]
            .filter(Boolean)
            .sort((a, b) => parseExpirationDate(a) - parseExpirationDate(b));
    }, [allOptionsLoaded]);

    // Handle trigger of options filtering
    const handleSearchClick = () => {
        setLoadingSearch(true);
        
        // Simulating immediate delay for render smoothness
        setTimeout(() => {
            const filtered = allOptionsLoaded.filter(option => {
                // Search filter (Option code or stock ticker)
                const codeMatch = option.ticker?.toLowerCase().includes(searchQuery.toLowerCase());
                const stockMatch = option.underlying?.toLowerCase().includes(searchQuery.toLowerCase());
                if (searchQuery && !codeMatch && !stockMatch) return false;

                // Type filter (CALL/PUT)
                if (selectedType !== 'ALL' && option.type !== selectedType) return false;

                // Premium minimum filter
                const premiumPercent = (option.premium_val || 0) * 100;
                if (premiumPercent < minPremium) return false;

                // Expiration date filter
                if (minExpiration !== 'ALL') {
                    const optionDate = parseExpirationDate(option.expiration);
                    const minDate = parseExpirationDate(minExpiration);
                    if (optionDate < minDate) return false;
                }
                if (maxExpiration !== 'ALL') {
                    const optionDate = parseExpirationDate(option.expiration);
                    const maxDate = parseExpirationDate(maxExpiration);
                    if (optionDate > maxDate) return false;
                }

                // Strike relation to current stock price filter
                if (strikeRelation !== 'ALL') {
                    const stock = stocksMap[option.underlying];
                    if (!stock) return false;
                    const S = parsePrice(stock.price);
                    const K = smartFloat(option.strike);
                    if (S > 0 && K > 0) {
                        if (strikeRelation === 'UNDER') {
                            if (S >= K) return false;
                        } else if (strikeRelation === 'OVER') {
                            if (S <= K) return false;
                        }
                    } else {
                        return false;
                    }
                }

                // Cost reference filter
                if (selectedCostRef !== 'ALL') {
                    const stock = stocksMap[option.underlying];
                    if (!stock) return false;
                    const C = parsePrice(selectedCostRef === 'CUSTO_BAIXO' ? stock.min_val : stock.max_val);
                    const K = smartFloat(option.strike);
                    if (C > 0 && K > 0) {
                        const X = costDistance / 100.0;
                        if (selectedCostRef === 'CUSTO_BAIXO') {
                            // Strike must be <= Custo Baixo * (1 + X)
                            if (K > C * (1 + X)) return false;
                        } else if (selectedCostRef === 'CUSTO_ALTO') {
                            // Strike must be >= Custo Alto * (1 - X)
                            if (K < C * (1 - X)) return false;
                        }
                    } else {
                        return false;
                    }
                }

                return true;
            });

            filtered.sort((a, b) => {
                if (sortBy === 'PREMIUM_DESC') {
                    return (b.premium_val || 0) - (a.premium_val || 0);
                } else if (sortBy === 'PREMIUM_ASC') {
                    return (a.premium_val || 0) - (b.premium_val || 0);
                } else {
                    const comp = (a.underlying || '').localeCompare(b.underlying || '');
                    if (comp !== 0) return comp;
                    const strikeA = parseFloat(a.strike?.replace(',', '.')) || 0;
                    const strikeB = parseFloat(b.strike?.replace(',', '.')) || 0;
                    return strikeA - strikeB;
                }
            });

            setFilteredOptions(filtered);
            setHasSearched(true);
            setLoadingSearch(false);
            setCurrentPage(1);
        }, 100);
    };

    // Separate Calls and Puts from filtered result
    const calls = useMemo(() => filteredOptions.filter(o => o.type === 'CALL'), [filteredOptions]);
    const puts = useMemo(() => filteredOptions.filter(o => o.type === 'PUT'), [filteredOptions]);

    // Pagination calculations (5 options per page per column)
    const totalPages = Math.max(
        selectedType === 'PUT' ? 0 : Math.ceil(calls.length / 5),
        selectedType === 'CALL' ? 0 : Math.ceil(puts.length / 5),
        1
    );

    const paginatedCalls = useMemo(() => {
        return calls.slice((currentPage - 1) * 5, currentPage * 5);
    }, [calls, currentPage]);

    const paginatedPuts = useMemo(() => {
        return puts.slice((currentPage - 1) * 5, currentPage * 5);
    }, [puts, currentPage]);

    // On-the-fly Greeks calculation for only the active paginated items
    const enrichedCalls = useMemo(() => {
        return paginatedCalls.map(opt => enrichOptionWithGreeks(opt, stocksMap[opt.underlying]));
    }, [paginatedCalls, stocksMap]);

    const enrichedPuts = useMemo(() => {
        return paginatedPuts.map(opt => enrichOptionWithGreeks(opt, stocksMap[opt.underlying]));
    }, [paginatedPuts, stocksMap]);

    if (loadingData) {
        return <ModernLoader text="Carregando dados das opções..." />;
    }

    return (
        <div style={{ padding: '24px 8px 40px 8px', maxWidth: '1400px', margin: '0 auto' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .screener-header {
                    margin-bottom: 24px;
                }
                .screener-title {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #f8fafc;
                    letter-spacing: -0.75px;
                    margin-bottom: 6px;
                }
                .screener-subtitle {
                    color: #94a3b8;
                    font-size: 0.95rem;
                }
                .filter-card {
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
                }
                .filter-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 20px;
                    align-items: flex-end;
                }
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .filter-label {
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .search-wrapper {
                    position: relative;
                }
                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #64748b;
                }
                .search-input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    padding: 10px 10px 10px 38px;
                    color: #f8fafc;
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .search-input:focus {
                    border-color: #38bdf8;
                    background: rgba(255, 255, 255, 0.07);
                    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15);
                }
                .screener-select {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 10px;
                    padding: 10px;
                    color: #f8fafc;
                    font-size: 0.9rem;
                    outline: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 14px;
                    padding-right: 32px;
                }
                .screener-select:focus {
                    border-color: #38bdf8;
                    background-color: rgba(255, 255, 255, 0.07);
                }
                .screener-select option {
                    background-color: #0f172a;
                    color: #f8fafc;
                }
                .range-slider-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .range-slider {
                    flex: 1;
                    height: 6px;
                    -webkit-appearance: none;
                    appearance: none;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                }
                .range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: #10b981;
                    cursor: pointer;
                    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
                    transition: transform 0.1s;
                }
                .range-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                .range-value {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #10b981;
                    min-width: 42px;
                    text-align: right;
                }
                .action-button-group {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 10px;
                }
                .btn-search {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: #ffffff;
                    border: none;
                    border-radius: 10px;
                    padding: 10px 24px;
                    font-size: 0.95rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-search:hover {
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }
                .btn-search:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                .results-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding: 0 4px;
                }
                .results-count {
                    font-size: 0.85rem;
                    color: #94a3b8;
                }
                .screener-columns-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    width: 100%;
                }
                @media (max-width: 768px) {
                    .screener-columns-grid {
                        grid-template-columns: 1fr;
                        gap: 32px;
                    }
                }
                .screener-column-box {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .screener-column-title {
                    font-size: 1rem;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.05);
                }
                .title-calls {
                    color: #38bdf8;
                    border-color: rgba(56, 189, 248, 0.2);
                }
                .title-puts {
                    color: #f87171;
                    border-color: rgba(239, 68, 68, 0.2);
                }
                .card-custom-logo {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .card-custom-logo img {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    object-fit: cover;
                    background: rgba(255,255,255,0.05);
                }
                .logo-placeholder {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 700;
                    color: #cbd5e1;
                }
                .card-underlying-ticker {
                    font-size: 0.9rem;
                    font-weight: 800;
                    color: #f8fafc;
                }
                .card-option-badge {
                    margin-left: auto;
                    background: rgba(255, 255, 255, 0.06);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-size: 0.72rem;
                    font-family: monospace;
                    font-weight: 700;
                    color: #cbd5e1;
                }
                .pagination-bar {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 16px;
                    margin-top: 32px;
                    padding-top: 16px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .btn-pagination {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 8px;
                    color: #cbd5e1;
                    padding: 8px 16px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .btn-pagination:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.1);
                    color: #f8fafc;
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .btn-pagination:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .page-label {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    font-weight: 500;
                }
                .empty-card-message {
                    background: rgba(255, 255, 255, 0.01);
                    border: 1px dashed rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 32px 16px;
                    text-align: center;
                    color: #475569;
                    font-size: 0.8rem;
                    font-style: italic;
                }
                .screener-card-click-wrapper {
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    width: 100%;
                    max-width: 320px;
                    margin: 0 auto;
                }
                .screener-card-click-wrapper:hover {
                    transform: translateY(-2px);
                }
            ` }} />

            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Filter size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Filtro Geral de Opções</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>

            {/* Filters Dashboard */}
            <div className="filter-card">
                <div className="filter-grid">
                    {/* Search Field */}
                    <div className="filter-group">
                        <span className="filter-label">Pesquisa</span>
                        <div className="search-wrapper">
                            <Search className="search-icon" size={16} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Ticker da opção ou ativo objeto..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Option Type Filter */}
                    <div className="filter-group">
                        <span className="filter-label">Tipo</span>
                        <select
                            className="screener-select"
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                        >
                            <option value="ALL">CALLs & PUTs (Todas)</option>
                            <option value="CALL">Somente CALL</option>
                            <option value="PUT">Somente PUT</option>
                        </select>
                    </div>

                    {/* Expiration Range Filters */}
                    <div className="filter-group">
                        <span className="filter-label">Vencimento de</span>
                        <select
                            className="screener-select"
                            value={minExpiration}
                            onChange={(e) => setMinExpiration(e.target.value)}
                        >
                            <option value="ALL">Qualquer Data</option>
                            {uniqueExpirations.map(exp => (
                                <option key={exp} value={exp}>{exp}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <span className="filter-label">Vencimento até</span>
                        <select
                            className="screener-select"
                            value={maxExpiration}
                            onChange={(e) => setMaxExpiration(e.target.value)}
                        >
                            <option value="ALL">Qualquer Data</option>
                            {uniqueExpirations.map(exp => (
                                <option key={exp} value={exp}>{exp}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Order Filter */}
                    <div className="filter-group">
                        <span className="filter-label">Ordenar por</span>
                        <select
                            className="screener-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="PREMIUM_DESC">Maior Prêmio (%)</option>
                            <option value="PREMIUM_ASC">Menor Prêmio (%)</option>
                            <option value="TICKER_STRIKE">Ticker / Strike (Padrão)</option>
                        </select>
                    </div>

                    {/* Strike Relation to Price Filter */}
                    <div className="filter-group">
                        <span className="filter-label">Preço Atual vs Strike</span>
                        <select
                            className="screener-select"
                            value={strikeRelation}
                            onChange={(e) => setStrikeRelation(e.target.value)}
                        >
                            <option value="ALL">Qualquer Relação</option>
                            <option value="UNDER">Preço Atual Abaixo do Strike (S &lt; K)</option>
                            <option value="OVER">Preço Atual Acima do Strike (S &gt; K)</option>
                        </select>
                    </div>

                    {/* Premium Minimum Slider */}
                    <div className="filter-group">
                        <span className="filter-label">Prêmio Mínimo</span>
                        <div className="range-slider-container">
                            <input
                                type="range"
                                className="range-slider"
                                min="0"
                                max="20"
                                step="0.5"
                                value={minPremium}
                                onChange={(e) => setMinPremium(parseFloat(e.target.value))}
                                style={{
                                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${minPremium * 5}%, rgba(255, 255, 255, 0.1) ${minPremium * 5}%, rgba(255, 255, 255, 0.1) 100%)`
                                }}
                            />
                            <span className="range-value">{minPremium.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Cost Reference Filter */}
                    <div className="filter-group">
                        <span className="filter-label">Referência de Custo</span>
                        <select
                            className="screener-select"
                            value={selectedCostRef}
                            onChange={(e) => setSelectedCostRef(e.target.value)}
                        >
                            <option value="ALL">Sem Filtro de Custo</option>
                            <option value="CUSTO_BAIXO">Custo Baixo (Min Val)</option>
                            <option value="CUSTO_ALTO">Custo Alto (Max Val)</option>
                        </select>
                    </div>

                    {/* Cost Distance Slider */}
                    <div className="filter-group" style={{ opacity: selectedCostRef === 'ALL' ? 0.5 : 1 }}>
                        <span className="filter-label">
                            {selectedCostRef === 'CUSTO_BAIXO'
                                ? `Strike até ${costDistance}% acima`
                                : selectedCostRef === 'CUSTO_ALTO'
                                ? `Strike até ${costDistance}% abaixo`
                                : 'Margem de Custo (X%)'}
                        </span>
                        <div className="range-slider-container">
                            <input
                                type="range"
                                className="range-slider"
                                min="0"
                                max="30"
                                step="1"
                                value={costDistance}
                                onChange={(e) => setCostDistance(parseFloat(e.target.value))}
                                disabled={selectedCostRef === 'ALL'}
                                style={{
                                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${costDistance * 3.333}%, rgba(255, 255, 255, 0.1) ${costDistance * 3.333}%, rgba(255, 255, 255, 0.1) 100%)`
                                }}
                            />
                            <span className="range-value">{costDistance.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>

                <div className="action-button-group">
                    <button
                        className="btn-search"
                        onClick={handleSearchClick}
                        disabled={loadingSearch}
                    >
                        {loadingSearch ? (
                            <>
                                <RefreshCw className="spinner" style={{ animation: 'spin 1s linear infinite' }} size={16} />
                                Filtrando...
                            </>
                        ) : (
                            <>
                                <Sliders size={16} />
                                Buscar Opções
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Initial / Empty State */}
            {!hasSearched ? (
                <div style={{
                    padding: '80px 20px',
                    background: 'rgba(15, 23, 42, 0.25)',
                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
                        Pronto para Buscar
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px auto' }}>
                        Selecione os parâmetros de busca acima e clique no botão <strong>Buscar Opções</strong> para exibir os resultados sob demanda.
                    </div>
                    <button className="btn-search" style={{ margin: '0 auto' }} onClick={handleSearchClick}>
                        <Sliders size={16} />
                        Buscar Opções
                    </button>
                </div>
            ) : (
                <>
                    {/* Results Meta */}
                    <div className="results-meta">
                        <span className="results-count">
                            Encontradas <strong>{filteredOptions.length}</strong> opções no total.
                            {selectedType !== 'ALL' && ` (${selectedType === 'CALL' ? calls.length : puts.length} exibidas)`}
                        </span>
                        
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedType('ALL');
                                setMinPremium(0);
                                setMinExpiration('ALL');
                                setMaxExpiration('ALL');
                                setFilteredOptions([]);
                                setHasSearched(false);
                                setCurrentPage(1);
                                setSortBy('PREMIUM_DESC');
                                setStrikeRelation('ALL');

                                // Clear session storage values
                                sessionStorage.removeItem('screener_searchQuery');
                                sessionStorage.removeItem('screener_selectedType');
                                sessionStorage.removeItem('screener_minPremium');
                                sessionStorage.removeItem('screener_minExpiration');
                                sessionStorage.removeItem('screener_maxExpiration');
                                sessionStorage.removeItem('screener_currentPage');
                                sessionStorage.removeItem('screener_hasSearched');
                                sessionStorage.removeItem('screener_sortBy');
                                sessionStorage.removeItem('screener_strikeRelation');
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#10b981',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Limpar Filtros
                        </button>
                    </div>

                    {/* Columns Grid */}
                    <div className="screener-columns-grid">
                        
                        {/* CALLs Column */}
                        {selectedType !== 'PUT' && (
                            <div className="screener-column-box">
                                <h3 className="screener-column-title title-calls">
                                    <TrendingUp size={16} />
                                    CALLs ({calls.length})
                                </h3>
                                
                                {enrichedCalls.length === 0 ? (
                                    <div className="empty-card-message">Nenhuma CALL correspondente.</div>
                                ) : (
                                    enrichedCalls.map((opt, index) => {
                                        const stock = stocksMap[opt.underlying];
                                        const distVal = opt.dist_val !== undefined ? opt.dist_val : 0;
                                        const isDistPositive = distVal >= 0;
                                        const formattedDist = opt.distance || `${(distVal * 100).toFixed(2)}%`;

                                        return (
                                            <div 
                                                key={opt.ticker + index}
                                                className="screener-card-click-wrapper"
                                                onClick={() => onStockClick(stock || { ticker: opt.underlying })}
                                                title={`Ver detalhes de ${opt.underlying}`}
                                            >
                                                <div className="option-card call" style={{ height: 'auto', minHeight: 'auto', display: 'flex', flexDirection: 'column' }}>
                                                    {/* Custom Asset Logo Fallback row */}
                                                    <div className="card-custom-logo">
                                                        {stock?.image_url ? (
                                                            <img src={stock.image_url} alt={opt.underlying} />
                                                        ) : (
                                                            <div className="logo-placeholder">{opt.underlying?.[0]}</div>
                                                        )}
                                                        <span className="card-underlying-ticker">
                                                            {opt.underlying}
                                                            {stock?.price && (
                                                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, marginLeft: '4px' }}>
                                                                    - {formatCostPrice(stock.price)}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="card-option-badge">{opt.ticker}</span>
                                                    </div>

                                                    <div className="card-header">
                                                        <div className="strike-container">
                                                            <span className="strike-label">Strike</span>
                                                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
                                                                R$ {opt.strike}
                                                            </span>
                                                            <div style={{
                                                                fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                                                                padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px',
                                                                background: 'rgba(0, 0, 0, 0.2)', color: isDistPositive ? '#4ade80' : '#f87171',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {isDistPositive ? '▲' : '▼'} {formattedDist}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="separator-line" style={{ margin: '10px 0' }}></div>

                                                    <div className="card-body" style={{ flex: 1 }}>
                                                        <div className="row">
                                                            <span>Preço:</span>
                                                            <strong>R$ {opt.price || '0,00'}</strong>
                                                        </div>
                                                        {opt.premium && (
                                                            <div className="row">
                                                                <span>Prêmio:</span>
                                                                <strong className="premium">{opt.premium}</strong>
                                                            </div>
                                                        )}

                                                        <div className="row secondary" style={{ fontSize: '0.72rem' }}>
                                                            <span>Vol: {opt.volume || '-'}</span>
                                                            <span>Neg: {opt.trades || '-'}</span>
                                                        </div>

                                                        <div className="row secondary" style={{ marginTop: '4px', fontSize: '0.72rem' }}>
                                                            <span>Venc:</span>
                                                            <span style={{ color: '#cbd5e1' }}>{formatExpirationDisplay(opt.expiration)}</span>
                                                        </div>

                                                        <div className="row secondary" style={{ marginTop: '4px', fontSize: '0.72rem' }}>
                                                            <span>Custos B./A.:</span>
                                                            <span style={{ color: '#cbd5e1' }}>
                                                                {formatCostPrice(stock?.min_val)} / {formatCostPrice(stock?.max_val)}
                                                            </span>
                                                        </div>

                                                        {/* Greeks section populated on the fly */}
                                                        {opt.delta_val && (
                                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.73rem' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prob. Sucesso</span>
                                                                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>{opt.prob_success}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delta</span>
                                                                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>{opt.delta_val}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>P. Justo (BS)</span>
                                                                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>{opt.bs_price_val}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edge Teórico</span>
                                                                        <span style={{
                                                                            color: opt.edge_formatted?.startsWith('-') ? '#f87171' : '#4ade80',
                                                                            fontWeight: 'bold'
                                                                        }}>
                                                                            {opt.edge_formatted}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* PUTs Column */}
                        {selectedType !== 'CALL' && (
                            <div className="screener-column-box">
                                <h3 className="screener-column-title title-puts">
                                    <TrendingDown size={16} />
                                    PUTs ({puts.length})
                                </h3>
                                
                                {enrichedPuts.length === 0 ? (
                                    <div className="empty-card-message">Nenhuma PUT correspondente.</div>
                                ) : (
                                    enrichedPuts.map((opt, index) => {
                                        const stock = stocksMap[opt.underlying];
                                        const distVal = opt.dist_val !== undefined ? opt.dist_val : 0;
                                        const isDistPositive = distVal >= 0;
                                        const formattedDist = opt.distance || `${(distVal * 100).toFixed(2)}%`;

                                        return (
                                            <div 
                                                key={opt.ticker + index}
                                                className="screener-card-click-wrapper"
                                                onClick={() => onStockClick(stock || { ticker: opt.underlying })}
                                                title={`Ver detalhes de ${opt.underlying}`}
                                            >
                                                <div className="option-card put" style={{ height: 'auto', minHeight: 'auto', display: 'flex', flexDirection: 'column' }}>
                                                    {/* Custom Asset Logo Fallback row */}
                                                    <div className="card-custom-logo">
                                                        {stock?.image_url ? (
                                                            <img src={stock.image_url} alt={opt.underlying} />
                                                        ) : (
                                                            <div className="logo-placeholder">{opt.underlying?.[0]}</div>
                                                        )}
                                                        <span className="card-underlying-ticker">
                                                            {opt.underlying}
                                                            {stock?.price && (
                                                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, marginLeft: '4px' }}>
                                                                    - {formatCostPrice(stock.price)}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="card-option-badge">{opt.ticker}</span>
                                                    </div>

                                                    <div className="card-header">
                                                        <div className="strike-container">
                                                            <span className="strike-label">Strike</span>
                                                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
                                                                R$ {opt.strike}
                                                            </span>
                                                            <div style={{
                                                                fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                                                                padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px',
                                                                background: 'rgba(0, 0, 0, 0.2)', color: isDistPositive ? '#4ade80' : '#f87171',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {isDistPositive ? '▲' : '▼'} {formattedDist}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="separator-line" style={{ margin: '10px 0' }}></div>

                                                    <div className="card-body" style={{ flex: 1 }}>
                                                        <div className="row">
                                                            <span>Preço:</span>
                                                            <strong>R$ {opt.price || '0,00'}</strong>
                                                        </div>
                                                        {opt.premium && (
                                                            <div className="row">
                                                                <span>Prêmio:</span>
                                                                <strong className="premium">{opt.premium}</strong>
                                                            </div>
                                                        )}

                                                        <div className="row secondary" style={{ fontSize: '0.72rem' }}>
                                                            <span>Vol: {opt.volume || '-'}</span>
                                                            <span>Neg: {opt.trades || '-'}</span>
                                                        </div>

                                                        <div className="row secondary" style={{ marginTop: '4px', fontSize: '0.72rem' }}>
                                                            <span>Venc:</span>
                                                            <span style={{ color: '#cbd5e1' }}>{formatExpirationDisplay(opt.expiration)}</span>
                                                        </div>

                                                        <div className="row secondary" style={{ marginTop: '4px', fontSize: '0.72rem' }}>
                                                            <span>Custos B./A.:</span>
                                                            <span style={{ color: '#cbd5e1' }}>
                                                                {formatCostPrice(stock?.min_val)} / {formatCostPrice(stock?.max_val)}
                                                            </span>
                                                        </div>

                                                        {/* Greeks section populated on the fly */}
                                                        {opt.delta_val && (
                                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.73rem' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prob. Sucesso</span>
                                                                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>{opt.prob_success}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delta</span>
                                                                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>{opt.delta_val}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>P. Justo (BS)</span>
                                                                        <span style={{ color: '#94a3b8', fontWeight: 500 }}>{opt.bs_price_val}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edge Teórico</span>
                                                                        <span style={{
                                                                            color: opt.edge_formatted?.startsWith('-') ? '#f87171' : '#4ade80',
                                                                            fontWeight: 'bold'
                                                                        }}>
                                                                            {opt.edge_formatted}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="pagination-bar">
                            <button
                                className="btn-pagination"
                                onClick={() => {
                                    setCurrentPage(prev => Math.max(prev - 1, 1));
                                    window.scrollTo({ top: 150, behavior: 'smooth' });
                                }}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} />
                                Anterior
                            </button>
                            <span className="page-label">
                                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                            </span>
                            <button
                                className="btn-pagination"
                                onClick={() => {
                                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                    window.scrollTo({ top: 150, behavior: 'smooth' });
                                }}
                                disabled={currentPage === totalPages}
                            >
                                Próxima
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
