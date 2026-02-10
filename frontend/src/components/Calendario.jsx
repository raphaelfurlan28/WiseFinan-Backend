import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, TrendingUp, FileText, AlertCircle, X } from 'lucide-react';
import { getApiUrl } from '../services/api';
import './Calendar.css';

// Constants
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Calendario() {
    const [activeTab, setActiveTab] = useState('dividends'); // 'dividends' | 'results'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState({ dividends: [], earnings: [] });
    const [stocksMap, setStocksMap] = useState({});
    const [selectedSummaryTicker, setSelectedSummaryTicker] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null); // Restored

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const calRes = await fetch(getApiUrl('/api/calendar'));
                const calJson = await calRes.json();

                const stocksRes = await fetch(getApiUrl('/api/stocks'));
                const stocksJson = await stocksRes.json();

                const map = {};
                if (Array.isArray(stocksJson)) {
                    stocksJson.forEach(s => {
                        map[s.ticker] = { name: s.company_name, logo: s.image_url, sector: s.sector };
                    });
                }

                setEvents({
                    dividends: calJson.dividend_events || [],
                    earnings: calJson.earnings_events || []
                });
                setStocksMap(map);
            } catch (error) {
                console.error("Error fetching calendar:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Navigation
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // Calendar Logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const daysArray = [];
    // Empty slots
    for (let i = 0; i < firstDay; i++) daysArray.push(null);
    // Days
    for (let i = 1; i <= daysInMonth; i++) daysArray.push(new Date(year, month, i));

    // Get events for specific day
    const getEventsForDay = (date) => {
        if (!date) return [];
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const targetList = activeTab === 'dividends' ? events.dividends : events.earnings;

        return targetList.filter(e => e.date === dateStr);
    };

    // Modal Info
    const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

    // Summary Modal Logic
    const getSummaryDetails = () => {
        if (!selectedSummaryTicker) return [];
        return events.dividends
            .filter(e => e.ticker === selectedSummaryTicker)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    };
    const summaryDetails = getSummaryDetails();

    return (
        <div className="calendar-page app-fade-in">
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <CalIcon size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Calendário Econômico</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>
            {/* Tabs */}
            <div className="tabs-std">
                <button
                    className={`tab-btn-std ${activeTab === 'dividends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dividends')}
                >
                    <TrendingUp size={18} />
                    Dividendos
                </button>
                <button
                    className={`tab-btn-std ${activeTab === 'results' ? 'active' : ''}`}
                    onClick={() => setActiveTab('results')}
                >
                    <FileText size={18} />
                    Resultados
                </button>
            </div>

            <div className="calendar-content">
                {loading ? (
                    <div className="loader-area">
                        <div className="spinner"></div>
                        <p>Carregando previsões...</p>
                    </div>
                ) : (
                    <>
                        {/* Month Navigator */}
                        <div className="month-nav">
                            <button onClick={prevMonth}><ChevronLeft /></button>
                            <h2>{MONTHS[month]} {year}</h2>
                            <button onClick={nextMonth}><ChevronRight /></button>
                        </div>

                        {/* Grid */}
                        <div className="cal-grid">
                            {WEEKDAYS.map(d => <div key={d} className="weekday-header">{d}</div>)}

                            {daysArray.map((date, idx) => {
                                if (!date) return <div key={idx} className="day-cell empty"></div>;

                                const dayEvents = getEventsForDay(date);
                                const hasEvents = dayEvents.length > 0;
                                const isToday = date && date.getDate() === new Date().getDate() &&
                                    date.getMonth() === new Date().getMonth() &&
                                    date.getFullYear() === new Date().getFullYear();

                                return (
                                    <div
                                        key={idx}
                                        className={`day-cell ${hasEvents ? 'has-events' : ''} ${isToday ? 'today' : ''}`}
                                        onClick={() => hasEvents && setSelectedDay(date)}
                                    >
                                        <span className="day-num">{date.getDate()}</span>
                                        {isToday && <span className="today-label">Hoje</span>}
                                        {hasEvents && (
                                            <div className="event-dots">
                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                    <div key={i} className="dot" title={e.ticker}></div>
                                                ))}
                                                {dayEvents.length > 3 && <div className="dot plus">+</div>}
                                            </div>
                                        )}
                                        {hasEvents && (
                                            <div className="event-count-badge">
                                                {dayEvents.length}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Annual Summary Section */}
                {activeTab === 'dividends' && !loading && events.dividends.length > 0 && (
                    <div className="annual-summary app-fade-in" style={{ marginTop: '40px' }}>
                        <div className="summary-header">
                            <h2 style={{ fontSize: '1.0rem', color: '#94a3b8', margin: 0, marginBottom: '10px', fontWeight: 600 }}>Frequência de Pagamentos (Anual)</h2>
                        </div>

                        <div className="summary-list">
                            {Object.entries(
                                events.dividends.reduce((acc, ev) => {
                                    acc[ev.ticker] = (acc[ev.ticker] || 0) + 1;
                                    return acc;
                                }, {})
                            )
                                .sort(([, countA], [, countB]) => countB - countA)
                                .map(([ticker, count]) => {
                                    const info = stocksMap[ticker] || { name: ticker, logo: null };
                                    return (
                                        <div
                                            key={ticker}
                                            className="summary-card"
                                            onClick={() => setSelectedSummaryTicker(ticker)}
                                        >
                                            <div className="stock-basic">
                                                {info.logo ? <img src={info.logo} alt={ticker} /> : <div className="ph-logo">{ticker[0]}</div>}
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <h4>{ticker}</h4>
                                                    <span>{info.name}</span>
                                                </div>
                                            </div>
                                            <div className="payment-text">
                                                {count} {count === 1 ? 'pagt.' : 'pagts.'}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal - Day Details */}
            <AnimatePresence>
                {selectedDay && selectedEvents.length > 0 && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedDay(null)}
                    >
                        <motion.div
                            className="modal-card"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>{selectedDay.getDate()} de {MONTHS[selectedDay.getMonth()]}</h3>
                                <button onClick={() => setSelectedDay(null)}><X size={20} /></button>
                            </div>

                            <div className="modal-list">
                                {selectedEvents.map((ev, i) => {
                                    const info = stocksMap[ev.ticker] || { name: ev.ticker, logo: null };
                                    return (
                                        <div key={i} className="modal-item">
                                            <div className="stock-basic">
                                                {info.logo ? <img src={info.logo} alt={ev.ticker} /> : <div className="ph-logo">{ev.ticker[0]}</div>}
                                                <div>
                                                    <h4>{ev.ticker}</h4>
                                                    <span>{info.name}</span>
                                                </div>
                                            </div>
                                            <div className="event-tag">
                                                {activeTab === 'dividends' ? 'Provável Pagamento' : 'Divulgação Resultado'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal - Summary Details */}
            <AnimatePresence>
                {selectedSummaryTicker && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedSummaryTicker(null)}
                    >
                        <motion.div
                            className="modal-card"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Histórico/Previsão: {selectedSummaryTicker}</h3>
                                <button onClick={() => setSelectedSummaryTicker(null)}><X size={20} /></button>
                            </div>

                            <div className="modal-list" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '12px' }}>
                                    Meses prováveis de pagamento (Baseado no histórico recente):
                                </p>
                                {summaryDetails.map((ev, i) => {
                                    const d = new Date(ev.date);
                                    const displayDate = `${d.getDate()} de ${MONTHS[d.getMonth()]}`;
                                    return (
                                        <div key={i} className="modal-item" style={{ justifyContent: 'flex-start', gap: '12px' }}>
                                            <div className="dot" style={{ width: 8, height: 8 }}></div>
                                            <span style={{ fontSize: '1rem', color: '#e2e8f0' }}>{displayDate}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({ev.date.split('-')[0]})</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
