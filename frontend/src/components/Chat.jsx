import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Trash2, Bell, TrendingUp, Lightbulb, BarChart3, AlertTriangle, Plus, X, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { db, storage } from '../services/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = {
    operacao: {
        label: 'Operação',
        color: '#22c55e',
        icon: TrendingUp,
        headerGradient: 'linear-gradient(90deg, rgba(34, 197, 94, 0.4), transparent)',
        iconBoxBg: 'linear-gradient(135deg, #22c55e, #16a34a)'
    },
    dica: {
        label: 'Dica',
        color: '#3b82f6',
        icon: Lightbulb,
        headerGradient: 'linear-gradient(90deg, rgba(59, 130, 246, 0.4), transparent)',
        iconBoxBg: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    },
    analise: {
        label: 'Análise',
        color: '#f59e0b',
        icon: BarChart3,
        headerGradient: 'linear-gradient(90deg, rgba(245, 158, 11, 0.4), transparent)',
        iconBoxBg: 'linear-gradient(135deg, #f59e0b, #d97706)'
    },
    urgente: {
        label: 'Urgente',
        color: '#ef4444',
        icon: AlertTriangle,
        headerGradient: 'linear-gradient(90deg, rgba(239, 68, 68, 0.4), transparent)',
        iconBoxBg: 'linear-gradient(135deg, #ef4444, #dc2626)'
    },
};

const Chat = () => {
    const { user } = useAuth();
    const { updateReadStatus, notificationPermission, requestNotificationPermission } = useNotification();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [formCategory, setFormCategory] = useState('operacao');
    const [formTitle, setFormTitle] = useState('');
    const [formBody, setFormBody] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef(null);

    const ADMIN_EMAIL = 'raphaelfurlan28@gmail.com';
    const canSend = user?.email === ADMIN_EMAIL;

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

    useEffect(() => {
        updateReadStatus();
    }, [alerts, updateReadStatus]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeSelectedImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!formTitle.trim() || !canSend) return;

        setSending(true);
        try {
            let imageUrl = null;
            let imagePath = null;

            if (selectedImage) {
                const path = `alerts/${Date.now()}_${selectedImage.name}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, selectedImage);
                imageUrl = await getDownloadURL(storageRef);
                imagePath = path;
            }

            await addDoc(collection(db, "chat_messages"), {
                category: formCategory,
                title: formTitle.trim(),
                text: formBody.trim(),
                imageUrl,
                imagePath,
                user: user.display_name || user.email,
                email: user.email,
                timestamp: serverTimestamp()
            });

            setFormTitle('');
            setFormBody('');
            removeSelectedImage();
            setShowForm(false);
        } catch (err) {
            console.error("Error sending alert:", err);
            alert("Erro ao enviar alerta. Tente novamente.");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (alert) => {
        if (!canSend) return;
        if (!window.confirm("Apagar este alerta?")) return;

        try {
            // Delete image from storage if exists
            if (alert.imagePath) {
                const imageRef = ref(storage, alert.imagePath);
                await deleteObject(imageRef).catch(err => {
                    console.error("Error deleting image from storage:", err);
                });
            }

            // Delete document from firestore
            await deleteDoc(doc(db, "chat_messages", alert.id));
        } catch (err) {
            console.error("Error deleting alert:", err);
            alert("Erro ao excluir alerta.");
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '...';
        const date = timestamp.toDate();
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getCategoryInfo = (cat) => {
        return CATEGORIES[cat] || {
            label: 'Geral',
            icon: MessageSquare,
            headerGradient: 'linear-gradient(90deg, rgba(148, 163, 184, 0.4), transparent)',
            iconBoxBg: 'linear-gradient(135deg, #94a3b8, #64748b)'
        };
    };

    const renderMessageWithBold = (text) => {
        if (!text) return null;
        // Split by **text** markers
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} style={{ color: '#fff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="rf-container" style={{ minHeight: '100%', paddingBottom: '30px' }}>
            {/* ... Header and other code remains unchanged ... */}
            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <Bell size={20} color="#94a3b8" />
                        <h1 style={{
                            margin: 0,
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #fff, #cbd5e1)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            whiteSpace: 'nowrap'
                        }}>
                            Alertas Premium
                        </h1>
                    </div>

                    {canSend && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowForm(!showForm)}
                            style={{
                                background: showForm ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #4ade80, #22c55e)',
                                border: showForm ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                                borderRadius: '8px',
                                padding: '6px 6px',
                                color: '#fff',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: showForm ? 'none' : '0 4px 10px rgba(37, 99, 235, 0.2)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                            }}
                        >
                            {showForm ? <X size={14} /> : <Plus size={14} />}
                            {showForm ? 'Fechar' : 'Novo Alerta'}
                        </motion.button>
                    )}
                </div>

                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: '16px' }}>
                    Insights e Operações em tempo real
                </span>

                <div style={{
                    width: '100%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                    margin: '16px 0'
                }} />
            </header>

            {'Notification' in window && notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px'
                    }}
                >
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                        <Bell size={20} color="#60a5fa" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>Ative as Notificações</p>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Não perca nenhuma oportunidade do mercado.</p>
                    </div>
                    <button
                        onClick={requestNotificationPermission}
                        style={{
                            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px',
                            padding: '8px 18px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)'
                        }}
                    >
                        Ativar
                    </button>
                </motion.div>
            )}

            <AnimatePresence>
                {canSend && showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '20px',
                            padding: '24px',
                            marginBottom: '24px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                        }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '4px', height: '16px', background: '#3b82f6', borderRadius: '2px' }} />
                                Configurar Novo Alerta
                            </h3>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                {Object.entries(CATEGORIES).map(([key, cat]) => {
                                    const Icon = cat.icon;
                                    const isSelected = formCategory === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setFormCategory(key)}
                                            style={{
                                                background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                border: `1.5px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)'}`,
                                                borderRadius: '12px',
                                                padding: '10px 16px',
                                                color: isSelected ? '#fff' : '#94a3b8',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <Icon size={16} color={isSelected ? '#3b82f6' : '#94a3b8'} />
                                            {cat.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <input
                                type="text"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value.toUpperCase())}
                                placeholder="Título do alerta"
                                style={{
                                    width: '100%',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    padding: '14px 18px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    fontWeight: 600,
                                    outline: 'none',
                                    marginBottom: '12px',
                                    boxSizing: 'border-box',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em'
                                }}
                            />

                            <textarea
                                value={formBody}
                                onChange={(e) => setFormBody(e.target.value)}
                                placeholder="Escreva os detalhes... Use **texto** para negrito."
                                rows={4}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0, 0, 0, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    padding: '14px 18px',
                                    color: '#f1f5f9',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    resize: 'none',
                                    marginBottom: '20px',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                    lineHeight: '1.6'
                                }}
                            />

                            {imagePreview && (
                                <div style={{ position: 'relative', marginBottom: '20px', width: 'fit-content' }}>
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                    />
                                    <button
                                        onClick={removeSelectedImage}
                                        style={{
                                            position: 'absolute', top: '-10px', right: '-10px',
                                            background: '#ef4444', color: '#fff', border: 'none',
                                            borderRadius: '50%', width: '24px', height: '24px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        padding: '10px 16px',
                                        color: '#cbd5e1',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <Plus size={16} />
                                    {selectedImage ? 'Trocar Imagem' : 'Anexar Imagem'}
                                </button>
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={!formTitle.trim() || sending}
                                style={{
                                    background: formTitle.trim() ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: formTitle.trim() ? 'pointer' : 'default',
                                    width: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <Send size={18} />
                                {sending ? 'Publicando...' : 'Publicar Agora'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {alerts.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
                        <div style={{ background: 'rgba(30, 41, 59, 0.3)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <Bell size={32} opacity={0.3} />
                        </div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', color: '#94a3b8' }}>Nenhum sinal no momento</p>
                        <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>Os alertas aparecerão assim que detectarmos uma oportunidade.</p>
                    </div>
                )}

                {alerts.map((alert, index) => {
                    const catInfo = getCategoryInfo(alert.category);
                    const Icon = catInfo.icon;

                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{
                                background: 'rgba(30, 41, 59, 0.5)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                            }}
                        >
                            <div style={{
                                background: catInfo.headerGradient,
                                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                padding: '16px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: catInfo.iconBoxBg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                        flexShrink: 0 // Prevent icon shrinking
                                    }}>
                                        <Icon size={18} color="#fff" />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            lineHeight: 1,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {catInfo.label}
                                        </span>
                                        <h4 style={{
                                            margin: 0,
                                            fontSize: '0.9rem',
                                            fontWeight: 800,
                                            color: '#fff',
                                            letterSpacing: '-0.01em',
                                            lineHeight: 1.2,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {alert.title || alert.text}
                                        </h4>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '16px' }}>
                                    <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                        {formatTime(alert.timestamp)}
                                    </span>
                                    {canSend && (
                                        <button
                                            onClick={() => handleDelete(alert)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '6px',
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {alert.title && alert.text && (
                                <div style={{ padding: '18px 20px' }}>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '0.92rem',
                                        color: '#cbd5e1',
                                        lineHeight: '1.7',
                                        whiteSpace: 'pre-wrap',
                                        fontWeight: 500
                                    }}>
                                        {renderMessageWithBold(alert.text)}
                                    </p>

                                    {alert.imageUrl && (
                                        <div style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <img
                                                src={alert.imageUrl}
                                                alt="Alert"
                                                style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer' }}
                                                onClick={() => window.open(alert.imageUrl, '_blank')}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default Chat;
