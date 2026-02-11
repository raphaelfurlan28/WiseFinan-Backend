import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Trash2, Bell, TrendingUp, Lightbulb, BarChart3, AlertTriangle, Plus, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import './FixedIncome.css';

const CATEGORIES = {
    operacao: { label: 'Operação', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', icon: TrendingUp },
    dica: { label: 'Dica', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', icon: Lightbulb },
    analise: { label: 'Análise', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', icon: BarChart3 },
    urgente: { label: 'Urgente', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', icon: AlertTriangle },
};

const Chat = () => {
    const { user } = useAuth();
    const { updateReadStatus, notificationPermission, requestNotificationPermission } = useNotification();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Admin form state
    const [showForm, setShowForm] = useState(false);
    const [formCategory, setFormCategory] = useState('operacao');
    const [formTitle, setFormTitle] = useState('');
    const [formBody, setFormBody] = useState('');
    const [sending, setSending] = useState(false);

    const ADMIN_EMAIL = 'raphaelfurlan28@gmail.com';
    const canSend = user?.email === ADMIN_EMAIL;

    // Real-time listener
    useEffect(() => {
        const q = query(collection(db, "chat_messages"), orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach((d) => {
                msgs.push({ id: d.id, ...d.data() });
            });
            setAlerts(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching alerts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Mark as read on mount / when alerts change
    useEffect(() => {
        updateReadStatus();
    }, [alerts, updateReadStatus]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!formTitle.trim() || !canSend) return;

        setSending(true);
        try {
            await addDoc(collection(db, "chat_messages"), {
                category: formCategory,
                title: formTitle.trim(),
                text: formBody.trim(),
                user: user.name || user.email,
                email: user.email,
                timestamp: serverTimestamp()
            });
            setFormTitle('');
            setFormBody('');
            setShowForm(false);
        } catch (err) {
            console.error("Error sending alert:", err);
            alert("Erro ao enviar alerta.");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (alertId) => {
        if (!canSend) return;
        if (!window.confirm("Apagar este alerta?")) return;

        try {
            await deleteDoc(doc(db, "chat_messages", alertId));
        } catch (err) {
            console.error("Error deleting alert:", err);
            alert("Erro ao apagar alerta.");
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'Enviando...';
        const date = timestamp.toDate();
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getCategoryInfo = (cat) => {
        return CATEGORIES[cat] || { label: 'Geral', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)', icon: MessageSquare };
    };

    return (
        <div className="rf-container" style={{ height: 'calc(100vh - 30px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bell size={20} color="#94a3b8" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Alertas de Operações</h1>
                    {canSend && (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            style={{
                                marginLeft: 'auto',
                                background: showForm ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                border: `1px solid ${showForm ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                                borderRadius: '10px',
                                padding: '8px 14px',
                                color: showForm ? '#ef4444' : '#60a5fa',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {showForm ? <X size={16} /> : <Plus size={16} />}
                            {showForm ? 'Cancelar' : 'Novo Alerta'}
                        </button>
                    )}
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', marginTop: '16px' }}></div>
            </header>

            {/* Notification Permission Banner */}
            {'Notification' in window && notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0
                }}>
                    <Bell size={20} color="#60a5fa" />
                    <span style={{ flex: 1, color: '#cbd5e1', fontSize: '0.85rem' }}>
                        Ative as notificações para receber alertas no ícone do app.
                    </span>
                    <button
                        onClick={requestNotificationPermission}
                        style={{
                            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px',
                            padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            whiteSpace: 'nowrap', flexShrink: 0
                        }}
                    >
                        Ativar
                    </button>
                </div>
            )}

            {/* Admin: New Alert Form */}
            {canSend && showForm && (
                <div style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '16px',
                    flexShrink: 0,
                    backdropFilter: 'blur(12px)'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: '#e2e8f0' }}>Criar Alerta</h3>

                    {/* Category Selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {Object.entries(CATEGORIES).map(([key, cat]) => {
                            const Icon = cat.icon;
                            const isSelected = formCategory === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setFormCategory(key)}
                                    style={{
                                        background: isSelected ? cat.bg : 'rgba(255, 255, 255, 0.04)',
                                        border: `1.5px solid ${isSelected ? cat.color : 'rgba(255, 255, 255, 0.1)'}`,
                                        borderRadius: '10px',
                                        padding: '8px 14px',
                                        color: isSelected ? cat.color : '#64748b',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.2s',
                                        transform: isSelected ? 'scale(1.03)' : 'scale(1)'
                                    }}
                                >
                                    <Icon size={14} />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Title Input */}
                    <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Título do alerta..."
                        style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            color: '#fff',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            outline: 'none',
                            marginBottom: '10px',
                            boxSizing: 'border-box'
                        }}
                    />

                    {/* Body Textarea */}
                    <textarea
                        value={formBody}
                        onChange={(e) => setFormBody(e.target.value)}
                        placeholder="Descrição (opcional)..."
                        rows={3}
                        style={{
                            width: '100%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            color: '#fff',
                            fontSize: '0.9rem',
                            outline: 'none',
                            resize: 'vertical',
                            marginBottom: '14px',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                        }}
                    />

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!formTitle.trim() || sending}
                        style={{
                            background: formTitle.trim() ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '12px 24px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: formTitle.trim() ? 'pointer' : 'default',
                            opacity: formTitle.trim() ? 1 : 0.5,
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            width: '100%',
                            justifyContent: 'center'
                        }}
                    >
                        <Send size={16} />
                        {sending ? 'Enviando...' : 'Publicar Alerta'}
                    </button>
                </div>
            )}

            {/* Feed Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingBottom: '16px'
            }}>
                {/* Empty State */}
                {alerts.length === 0 && !loading && (
                    <div style={{
                        textAlign: 'center', color: '#64748b', marginTop: '60px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '50%' }}>
                            <Bell size={28} color="#475569" />
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Nenhum alerta publicado.</span>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>Novos alertas aparecerão aqui.</span>
                    </div>
                )}

                {/* Alert Cards */}
                {alerts.map((alert) => {
                    const catInfo = getCategoryInfo(alert.category);
                    const Icon = catInfo.icon;

                    return (
                        <div
                            key={alert.id}
                            style={{
                                background: 'rgba(30, 41, 59, 0.5)',
                                border: `1px solid ${catInfo.border}`,
                                borderLeft: `4px solid ${catInfo.color}`,
                                borderRadius: '14px',
                                padding: '16px 18px',
                                position: 'relative',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                backdropFilter: 'blur(8px)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 4px 20px ${catInfo.bg}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Card Header: Tag + Delete */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: catInfo.bg,
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    border: `1px solid ${catInfo.border}`
                                }}>
                                    <Icon size={13} color={catInfo.color} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: catInfo.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {catInfo.label}
                                    </span>
                                </div>

                                {canSend && (
                                    <button
                                        onClick={() => handleDelete(alert.id)}
                                        title="Apagar alerta"
                                        style={{
                                            background: 'transparent', border: 'none', color: '#64748b',
                                            cursor: 'pointer', padding: '4px', opacity: 0.5,
                                            transition: 'all 0.2s', display: 'flex', alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ef4444'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = '#64748b'; }}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>

                            {/* Title */}
                            <h4 style={{
                                margin: '0 0 6px 0',
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: '#f1f5f9',
                                lineHeight: '1.4'
                            }}>
                                {alert.title || alert.text}
                            </h4>

                            {/* Body (only if title exists and body is different) */}
                            {alert.title && alert.text && (
                                <p style={{
                                    margin: '0 0 10px 0',
                                    fontSize: '0.88rem',
                                    color: '#94a3b8',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {alert.text}
                                </p>
                            )}

                            {/* Footer: Timestamp */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                gap: '8px', marginTop: '4px'
                            }}>
                                <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                                    {formatTime(alert.timestamp)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Chat;
