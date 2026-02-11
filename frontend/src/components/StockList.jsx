import React, { useState, useEffect } from 'react';
import {
  Search, ChevronRight, TrendingUp, TrendingDown,
  Landmark, Zap, ShoppingBag, Factory, Pickaxe, HeartPulse, Cpu, Building, Briefcase, Leaf
} from 'lucide-react';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './StockList.css';

export default function StockList({ onSelectStock }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDividends, setSortByDividends] = useState(false);

  useEffect(() => {
    fetch(getApiUrl('/api/stocks'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStocks(data);
        } else {
          console.error("API did not return an array:", data);
          setStocks([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching stocks:", err);
        setLoading(false);
      });
  }, []);

  const filteredStocks = Array.isArray(stocks) ? stocks.filter(stock =>
    (stock.ticker || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stock.company_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  // Helper to map sector to icon
  const getSectorIcon = (sectorName) => {
    const s = (sectorName || "").toLowerCase();
    if (s.includes("financeiro") || s.includes("banco") || s.includes("segur")) return <Landmark size={20} color="#38bdf8" />;
    if (s.includes("energia") || s.includes("utilidade")) return <Zap size={20} color="#eab308" />;
    if (s.includes("consumo") || s.includes("varejo")) return <ShoppingBag size={20} color="#f472b6" />;
    if (s.includes("imobiliário") || s.includes("construção")) return <Building size={20} color="#a855f7" />;
    if (s.includes("indústri") || s.includes("bens")) return <Factory size={20} color="#94a3b8" />;
    if (s.includes("materiais") || s.includes("minera")) return <Pickaxe size={20} color="#fb923c" />;
    if (s.includes("saúde")) return <HeartPulse size={20} color="#ef4444" />;
    if (s.includes("tecno")) return <Cpu size={20} color="#22d3ee" />;
    if (s.includes("agro")) return <Leaf size={20} color="#4ade80" />;
    return <Briefcase size={20} color="#ccc" />;
  };

  // Helper to get stats per sector
  const getSectorStats = (sectorName) => {
    const items = filteredStocks.filter(s => (s.sector || 'Outros') === sectorName);
    const count = items.length;

    // Sort items by opportunity (falta_val) to show best icons first
    const sortedItems = [...items].sort((a, b) => (b.falta_val || -Infinity) - (a.falta_val || -Infinity));

    const icons = sortedItems.slice(0, 5).map(s => s.image_url);

    // Calculate Score: Max opportunity in sector
    const maxFalta = Math.max(...items.map(s => s.falta_val !== undefined ? s.falta_val : -Infinity));

    return { count, icons, maxFalta };
  };

  // Grouping Logic
  const uniqueSectors = filteredStocks.length > 0
    ? [...new Set(filteredStocks.map(s => s.sector || 'Outros'))]
    : [];

  // Sort sectors by their "Best Opportunity"
  const sectors = uniqueSectors.sort((a, b) => {
    const scoreA = getSectorStats(a).maxFalta;
    const scoreB = getSectorStats(b).maxFalta;
    return scoreB - scoreA;
  });

  const [activeSector, setActiveSector] = useState(null);

  if (loading) return <ModernLoader text="Carregando Renda Variável..." />;

  return (
    <div className="stock-list-container">
      <header className="header" style={{ display: 'block', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          {activeSector && (
            <button
              onClick={() => setActiveSector(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#94a3b8" />
              <h1 style={{
                fontSize: '1.25rem',
                margin: 0,
                lineHeight: 1,
                fontWeight: 600,
                background: 'linear-gradient(90deg, #fff, #cbd5e1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Renda Variável</h1>
            </div>
            {activeSector && <span style={{ fontSize: '14px', color: '#64748b', display: 'block', marginTop: '4px' }}>{activeSector}</span>}
          </div>
        </div>

        <div style={{ margin: '16px 0', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(30, 41, 59, 0.4)',
          borderRadius: '24px',
          padding: '6px 12px',
          border: 'none',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
          flex: 1
        }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar ativo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '0.9rem',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>

        {/* Dividend Filter Button - New Row, Right Aligned */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            onClick={() => setSortByDividends(!sortByDividends)}
            style={{
              background: sortByDividends ? '#4ade80' : 'rgba(30, 41, 59, 0.4)',
              color: sortByDividends ? '#1e293b' : '#94a3b8',
              border: '0px solid rgba(255,255,255,0.05)',
              borderRadius: '24px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <span>Dividendos</span>
            {sortByDividends && <span style={{ fontSize: '10px' }}>▼</span>}
          </button>
        </div>
      </header>

      <div className="stock-list">

        {/* SECTOR VIEW */}
        {!activeSector && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
            {sectors.map(sector => {
              const { count, icons } = getSectorStats(sector);
              if (count === 0) return null;
              return (
                <div
                  key={sector}
                  className="stock-card glass-card"
                  style={{ cursor: 'pointer', padding: '0px' }} // Padding handled by internal divs now
                  onClick={() => setActiveSector(sector)}
                >
                  {/* Header with Gradient */}
                  <div className="stock-card-header" style={{ marginBottom: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Sector Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'rgba(255,255,255,0.05)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)' }}>
                        {getSectorIcon(sector)}
                      </div>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{sector}</h3>
                    </div>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.70rem', color: '#ccc' }}>
                      {count} Empresas
                    </span>
                  </div>

                  {/* Content (Icons) */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {icons.map((url, i) => (
                        <div key={i} className="stock-icon" style={{ width: 36, height: 36, fontSize: '10px' }}>
                          {url ? <img src={url} alt="" /> : <span>#</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeSector && filteredStocks
          .filter(s => (s.sector || 'Outros') === activeSector)
          .sort((a, b) => {
            if (sortByDividends) {
              // Sort by Dividends (Highest to Lowest)
              // Try identifying the dividend field. Usually 'dy' or 'dividend_yield' or 'proventos'
              // If user has a 'Dividendo' column in sheet, it might come as 'dividend' or 'dy'.
              // I'll parse both as float just in case.
              const valA = parseFloat((a.dy || a.dividend || 0).toString().replace(',', '.'));
              const valB = parseFloat((b.dy || b.dividend || 0).toString().replace(',', '.'));
              return valB - valA;
            }
            // Keep existing sort by 'falta' magnitude
            const valA = a.falta_val !== undefined ? a.falta_val : -Infinity;
            const valB = b.falta_val !== undefined ? b.falta_val : -Infinity;
            return valB - valA;
          })
          .map((stock, index) => {
            const change = parseFloat(stock.change_day?.replace(',', '.') || 0);
            const isPositive = change > 0;
            const isNegative = change < 0;
            const isZero = change === 0;

            // Logic for Color: >0 Green, <0 Red, 0 White
            let varColor = '#fff';
            if (isPositive) varColor = '#4ade80';
            if (isNegative) varColor = '#ef4444';

            const faltaVal = stock.falta_val || 0;
            const isCheap = faltaVal >= 0;

            let barWidth = 0;
            let barGradient = '#4ade80';
            let barGlow = 'none';

            if (isCheap) {
              barWidth = 100;
              barGradient = 'linear-gradient(90deg, #4ade80, #22c55e)';
              barGlow = '0 0 10px rgba(74, 222, 128, 0.4)';
            } else {
              const distance = Math.abs(faltaVal);
              barWidth = Math.max(0, 100 - distance);

              if (distance <= 15) {
                barGradient = 'linear-gradient(90deg, #4ade80, #22c55e)';
                barGlow = '0 0 10px rgba(74, 222, 128, 0.4)';
              } else if (distance <= 30) {
                barGradient = 'linear-gradient(90deg, #facc15, #eab308)';
                barGlow = '0 0 10px rgba(250, 204, 21, 0.3)';
              } else {
                barGradient = 'linear-gradient(90deg, #f87171, #ef4444)';
                barGlow = '0 0 10px rgba(239, 68, 68, 0.4)';
              }
            }

            return (
              <div key={index} className="stock-card glass-card" onClick={() => onSelectStock(stock)}>
                <div className="stock-card-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="stock-icon">
                      {stock.image_url ? (
                        <img src={stock.image_url} alt={stock.ticker} />
                      ) : (
                        <div className="placeholder-icon">{stock.ticker[0]}</div>
                      )}
                    </div>
                    <div className="stock-info">
                      <h3>{stock.ticker}</h3>
                      <p>{stock.company_name}</p>
                    </div>
                  </div>
                </div>

                <div className="stock-card-content">
                  <div className="card-main-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', marginBottom: '2px' }}>Preço Atual</span>
                      <span className="price" style={{ fontSize: '1rem' }}>R$ {stock.price}</span>
                    </div>

                    {/* Variation on the Right */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.65rem', color: '#888', marginBottom: '2px' }}>Var. Dia</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isPositive && <TrendingUp size={16} color={varColor} />}
                        {isNegative && <TrendingDown size={16} color={varColor} />}
                        {isZero && <div style={{ width: 16, height: 2, background: '#fff' }}></div>} {/* Dash for zero */}
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: varColor
                        }}>
                          {isPositive ? '+' : ''}{(parseFloat((stock.change_day || "0").toString().replace(',', '.')) * 100).toFixed(2).replace('.', ',')}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="stock-progress-row">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${barWidth}%`,
                          background: barGradient,
                          boxShadow: barGlow
                        }}
                      ></div>
                    </div>
                    <span className="progress-label" style={{ color: !isCheap && Math.abs(faltaVal) > 30 ? '#f87171' : (!isCheap && Math.abs(faltaVal) > 15 ? '#facc15' : '#4ade80') }}>
                      Falta: {stock.falta_pct}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
