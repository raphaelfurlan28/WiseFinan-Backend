import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './News.css';

const Noticias = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
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
        <div className="rf-container">
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Newspaper size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Últimas Notícias</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {loading ? (
                    <ModernLoader text="Carregando Notícias..." />
                ) : news.length > 0 ? (
                    news.map((item, idx) => (
                        <div key={idx} className="news-card">
                            <div className="news-card-header">
                                <span className="news-badge">{item.source}</span>
                                <span className="news-date">
                                    {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : ''}
                                </span>
                            </div>

                            <a href={item.link} target="_blank" rel="noreferrer" className="news-title-link">
                                <h3 className="news-title">{item.title}</h3>
                            </a>

                            <div className="news-footer">
                                <a href={item.link} target="_blank" rel="noreferrer" className="news-read-more">
                                    Ler matéria completa <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="news-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Nenhuma notícia disponível no momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Noticias;
