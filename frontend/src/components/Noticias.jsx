import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './FixedIncome.css'; // Reuse glass styles

const Noticias = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch News only (ignoring indicators as requested)
                const resDash = await fetch(getApiUrl('/api/news/dashboard'));
                const dataDash = await resDash.json();
                if (dataDash && Array.isArray(dataDash.news)) {
                    setNews(dataDash.news);
                } else {
                    setNews([]);
                }
            } catch (err) {
                console.error("Error fetching news data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="rf-container"> {/* Reusing Fixed Income container style */}
            {/* Header - Styled like Fixed Income/StockList */}
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Newspaper size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Últimas Notícias</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>

            {/* News Feed - Full Width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                    <ModernLoader text="Carregando Notícias..." />
                ) : news.length > 0 ? (
                    news.map((item, idx) => (
                        <div key={idx} style={{
                            padding: '24px',
                            background: 'rgba(30, 41, 59, 0.4)', // Slightly darker/stronger bg for individual cards
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            transition: 'transform 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                            className="news-card-hover glass-card" // Added glass-card for blur
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {/* Source - Green */}
                                <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {item.source}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                                    {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}
                                </span>
                            </div>

                            <a href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                <h3 style={{ fontSize: '1.2rem', color: '#f1f5f9', margin: '4px 0 8px 0', lineHeight: '1.4', fontWeight: '600' }}>
                                    {item.title}
                                </h3>
                            </a>

                            {/* Link - Darker Grey/Discrete as requested */}
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
                                <a href={item.link} target="_blank" rel="noreferrer" style={{
                                    fontSize: '0.85rem',
                                    color: '#64748b', // Discrete Grey
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none',
                                    transition: 'color 0.2s'
                                }}
                                    onMouseEnter={(e) => e.target.style.color = '#94a3b8'}
                                    onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                >
                                    Ler matéria completa <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: '#94a3b8' }}>Não foi possível carregar as notícias.</p>
                )}
            </div>

            {/* Mobile CSS Adjustment */}
            <style>{`
                .news-card-hover:hover {
                    background: rgba(255,255,255,0.06) !important;
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default Noticias;
