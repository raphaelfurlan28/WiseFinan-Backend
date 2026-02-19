import React, { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import OptionCard from './OptionCard';
import './OptionsModule.css'; // Reusing styles

export default function PozinhoModule({ onClose }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicker, setSelectedTicker] = useState(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        fetch(getApiUrl(`/api/strategies/pozinho`))
            .then(res => res.json())
            .then(json => {
                setData(json);
                if (json.length > 0) {
                    setSelectedTicker(json[0].stock.ticker);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching pozinho options:", err);
                setLoading(false);
            });
    }, []);

    // Get selected group
    const selectedGroup = data.find(g => g.stock.ticker === selectedTicker);
    const options = selectedGroup ? selectedGroup.options : [];

    // Separate Calls and Puts
    const calls = options.filter(o => o.type && o.type.toUpperCase().includes('CALL'));
    const puts = options.filter(o => o.type && o.type.toUpperCase().includes('PUT'));

    if (loading) return <ModernLoader text="Buscando oportunidades de Pózinho..." />;

    return (
        <div className="options-modal-overlay">
            <div className="options-modal" style={{ borderTop: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <header className="options-header" style={{ position: 'relative', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(239, 68, 68, 0.4)'
                        }}>
                            <Sparkles size={20} color="#ef4444" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Oportunidades Pózinho
                            </h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Opções de centavos com alto potencial de explosão</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            zIndex: 10
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Company Filter */}
                <div className="expiry-filter" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginRight: '8px' }}>Ativos Disponíveis:</span>
                    <div className="expiry-scroll">
                        {data.map(group => (
                            <button
                                key={group.stock.ticker}
                                className={`expiry-btn ${selectedTicker === group.stock.ticker ? 'active' : ''}`}
                                onClick={() => setSelectedTicker(group.stock.ticker)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {group.stock.image_url ? (
                                    <img src={group.stock.image_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                        {group.stock.ticker.substring(0, 1)}
                                    </div>
                                )}
                                {group.stock.ticker}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="options-content">
                    {/* Calls */}
                    <div className="options-column calls">
                        <h3>
                            <TrendingUp size={14} style={{ marginRight: '6px' }} />
                            CALLs
                        </h3>
                        <div className="cards-list">
                            {calls.length === 0 && (
                                <div className="empty-msg">
                                    <p>Nenhuma Call para {selectedTicker}</p>
                                </div>
                            )}
                            {calls.map((opt, idx) => (
                                <OptionCard key={idx} option={opt} type="call" />
                            ))}
                        </div>
                    </div>

                    {/* Puts */}
                    <div className="options-column puts">
                        <h3>
                            <TrendingUp size={14} style={{ marginRight: '6px', transform: 'scaleY(-1)' }} />
                            PUTs
                        </h3>
                        <div className="cards-list">
                            {puts.length === 0 && (
                                <div className="empty-msg">
                                    <p>Nenhuma Put para {selectedTicker}</p>
                                </div>
                            )}
                            {puts.map((opt, idx) => (
                                <OptionCard key={idx} option={opt} type="put" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Disclaimer Footer */}
                <div style={{
                    padding: '8px 24px',
                    background: 'rgba(0,0,0,0.3)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertTriangle size={14} color="#facc15" />
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        Atenção: Opções "pózinho" possuem altíssimo risco. Você pode perder 100% do capital investido. Probabilidades baseadas em Black-Scholes.
                    </span>
                </div>
            </div>
        </div>
    );
}
