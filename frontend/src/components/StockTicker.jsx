import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../services/api';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StockTicker = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const res = await fetch(getApiUrl('/api/stocks'));
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Filter valid stocks with price and sort/filter as needed
                    const validStocks = data.filter(s => s.ticker && s.price);
                    setStocks(validStocks);
                }
            } catch (error) {
                console.error("Error fetching ticker stocks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStocks();
    }, []);

    if (loading || stocks.length === 0) return null;

    // Helper to format currency
    const formatCurrency = (val) => {
        if (!val) return "R$ 0,00";
        if (typeof val === 'number') return `R$ ${val.toFixed(2).replace('.', ',')}`;
        let num = typeof val === 'string' ? parseFloat(val.replace('R$', '').replace('.', '').replace(',', '.')) : val;
        if (isNaN(num)) return val;
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    };

    // Helper to format change
    const formatChange = (val) => {
        let numVal = 0;
        let textVal = "0,00%";

        if (typeof val === 'number') {
            numVal = val;
            textVal = `${(val * 100).toFixed(2).replace('.', ',')}%`;
        } else if (typeof val === 'string') {
            let clean = val.replace('%', '').replace(',', '.');
            numVal = parseFloat(clean);
            // If the value was a raw decimal string (e.g. "0.015"), multiply by 100
            if (!val.includes('%') && Math.abs(numVal) < 1) {
                numVal = numVal * 100;
            }
            textVal = `${numVal.toFixed(2).replace('.', ',')}%`;
        }

        if (numVal > 0) return { text: textVal, color: "#4ade80", icon: <TrendingUp size={10} /> };
        if (numVal < 0) return { text: textVal, color: "#f87171", icon: <TrendingDown size={10} /> };
        return { text: textVal, color: "#94a3b8", icon: <Minus size={10} /> };
    };

    return (
        <div className="ticker-container" style={{
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
            marginTop: '-12px',
            marginBottom: '8px',
            display: 'flex',
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
        }}>
            <div className="ticker-track" style={{ display: 'flex' }}>
                {/* Original Set */}
                {stocks.map((stock, idx) => (
                    <StockItem key={`s1-${idx}`} stock={stock} formatCurrency={formatCurrency} formatChange={formatChange} />
                ))}
                {/* Duplicate Set for Loop */}
                {stocks.map((stock, idx) => (
                    <StockItem key={`s2-${idx}`} stock={stock} formatCurrency={formatCurrency} formatChange={formatChange} />
                ))}
            </div>
        </div>
    );
};

const StockItem = ({ stock, formatCurrency, formatChange }) => {
    const change = formatChange(stock.change_day);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px', // Reduced gap
            marginRight: '24px', // Reduced spacing
            padding: '4px 0',
            flexShrink: 0
        }}>
            {/* Left: Image (Reduced Size) */}
            <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {stock.image_url ? (
                    <img
                        src={stock.image_url}
                        alt={stock.ticker}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = stock.ticker.slice(0, 2); }}
                    />
                ) : (
                    <span style={{ fontSize: '0.5rem', color: '#fff' }}>{stock.ticker.slice(0, 2)}</span>
                )}
            </div>

            {/* Right: Info (Reduced Fonts) */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#fff' }}>{stock.ticker}</span>
                    <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{formatCurrency(stock.price)}</span>
                </div>
                {/* Variation below */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ color: change.color, display: 'flex' }}>{change.icon}</span>
                    <span style={{ fontSize: '0.65rem', color: change.color, fontWeight: '500' }}>
                        {change.text}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default StockTicker;
