import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import ModernLoader from './ModernLoader';
import { getApiUrl } from '../services/api';
import './OptionsModule.css';
import OptionCard from './OptionCard';

export default function OptionsModule({ ticker, logoUrl, onClose }) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedExpiry, setSelectedExpiry] = useState(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        fetch(getApiUrl(`/api/stocks/${ticker}/options`))
            .then(res => res.json())
            .then(data => {
                setOptions(data);
                // Filter unique expirations (within 2 months) and sort
                const today = new Date();
                const maxDate = new Date();
                maxDate.setMonth(today.getMonth() + 2);

                // Ensure comparison at start of day
                today.setHours(0, 0, 0, 0);
                maxDate.setHours(23, 59, 59, 999);

                const expirations = [...new Set(data.map(o => o.expiration))]
                    .filter(exp => {
                        const [year, month, day] = exp.split('-').map(Number);
                        const expDate = new Date(year, month - 1, day);
                        return expDate >= today && expDate <= maxDate;
                    })
                    .sort();

                if (expirations.length > 0) setSelectedExpiry(expirations[0]);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching options:", err);
                setLoading(false);
            });
    }, [ticker]);

    // Filter options by selected expiry
    const filteredOptions = options.filter(o => o.expiration === selectedExpiry);

    // Separate Calls and Puts
    const calls = filteredOptions.filter(o => o.type === 'CALL');
    const puts = filteredOptions.filter(o => o.type === 'PUT');

    if (loading) return <ModernLoader text={`Carregando opções de ${ticker}...`} />;

    const expirations = [...new Set(options.map(o => o.expiration))].sort();

    return (
        <div className="options-modal-overlay">
            <div className="options-modal">
                <header className="options-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={ticker}
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
                                {ticker ? ticker[0] : '#'}
                            </div>
                        )}
                        <h2 style={{ margin: 0 }}>Opções de {ticker}</h2>
                    </div>
                    <button
                        onClick={onClose}
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
                        <X size={16} />
                    </button>
                </header>

                {/* LABEL ADDED HERE: Discreet "Vencimentos" */}
                <div style={{ padding: '0 20px', marginTop: '12px', marginBottom: '4px' }}>
                    <span style={{
                        fontSize: '11px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <Calendar size={12} />
                        Vencimentos
                    </span>
                </div>

                <div className="expiry-filter">
                    {/* Removed Calendar icon from here since it's in label now, or keep it? 
                        User wanted text to be explicit. Keeping button list clean. */}
                    <div className="expiry-scroll">
                        {expirations.map(exp => {
                            // Format: YYYY-MM-DD -> DD/MM/YYYY
                            const [year, month, day] = exp.split('-');
                            const formattedDate = `${day}/${month}/${year}`;

                            return (
                                <button
                                    key={exp}
                                    className={`expiry-btn ${selectedExpiry === exp ? 'active' : ''}`}
                                    onClick={() => setSelectedExpiry(exp)}
                                >
                                    {formattedDate}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="options-content">
                    <div className="options-column calls">
                        <h3>CALLs</h3>
                        <div className="cards-list">
                            {calls.length === 0 && <p className="empty-msg">Nenhuma Call disponível.</p>}
                            {calls.map((opt, idx) => (
                                <OptionCard
                                    key={idx}
                                    option={opt}
                                    type="call"
                                    showExpiration={false}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="options-column puts">
                        <h3>PUTs</h3>
                        <div className="cards-list">
                            {puts.length === 0 && <p className="empty-msg">Nenhuma Put disponível.</p>}
                            {puts.map((opt, idx) => (
                                <OptionCard
                                    key={idx}
                                    option={opt}
                                    type="put"
                                    showExpiration={false}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
