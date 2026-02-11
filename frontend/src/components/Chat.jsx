import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import './FixedIncome.css';

const Chat = () => {
    const { user } = useAuth();
    const { updateReadStatus } = useNotification();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);

    // Scroll Refs
    const messagesEndRef = useRef(null);
    const scrollViewportRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const prevMessagesLength = useRef(0);

    // Admin email allowed to send messages
    const ADMIN_EMAIL = 'raphaelfurlan28@gmail.com';
    const canSend = user?.email === ADMIN_EMAIL;

    // Real-time listener for messages
    useEffect(() => {
        const q = query(collection(db, "chat_messages"), orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() });
            });
            setMessages(msgs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chat:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 1. Handle User Scroll - Detect if user is reading history
    const handleScroll = () => {
        if (scrollViewportRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
            // Consider "at bottom" if within 50px of end
            const atBottom = scrollHeight - scrollTop - clientHeight < 50;
            setIsAtBottom(atBottom);
        }
    };

    // 2. Scroll Helper
    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
        setIsAtBottom(true);
    };

    // 3. Initial Scroll (Only once on load)
    useEffect(() => {
        if (!loading && messages.length > 0) {
            scrollToBottom(false); // Instant scroll
            prevMessagesLength.current = messages.length;
        }
    }, [loading]);

    // 4. Auto-scroll Logic (Only when NEW messages arrive)
    useEffect(() => {
        // Did we get a NEW message?
        const addedMessage = messages.length > prevMessagesLength.current;
        prevMessagesLength.current = messages.length;

        if (addedMessage) {
            const lastMsg = messages[messages.length - 1];
            // Scroll ONLY if:
            // a) User was already at the bottom (sticky behavior)
            // b) OR the user sent the message (force scroll for my own messages)
            if (isAtBottom || (lastMsg && (lastMsg.email === user?.email || lastMsg.email === ADMIN_EMAIL))) {
                setTimeout(() => {
                    scrollToBottom();
                }, 100);
            }
        }

        // Always update read status when messages change
        updateReadStatus();
    }, [messages, updateReadStatus, user?.email]);
    // Removed isAtBottom from dependency array to prevent scroll loop when scrolling up!

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !canSend) return;

        const text = inputText;
        setInputText(''); // Optimistic clear

        try {
            await addDoc(collection(db, "chat_messages"), {
                text: text,
                user: user.name || user.email,
                email: user.email, // Store email for ownership check
                timestamp: serverTimestamp()
            });
            // Force scroll immediately on send for better UX
            scrollToBottom();
        } catch (err) {
            console.error("Error sending message:", err);
            setInputText(text); // Restore on error
            alert("Erro ao enviar mensagem.");
        }
    };

    const handleDelete = async (msgId) => {
        // Allow delete if admin
        if (!canSend) return;

        if (!window.confirm("Apagar mensagem?")) return;

        try {
            await deleteDoc(doc(db, "chat_messages", msgId));
        } catch (err) {
            console.error("Error deleting message:", err);
            alert("Erro ao apagar mensagem.");
        }
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return 'Enviando...';
        // Firestore timestamp to Date
        const date = timestamp.toDate();
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="rf-container" style={{ height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        padding: '0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <MessageSquare size={20} color="#94a3b8" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Alertas de Operações</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)', marginTop: '16px' }}></div>
            </header>

            {/* Chat Area */}
            <div className="glass-card" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                marginBottom: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(30, 41, 59, 0.4)'
            }}>
                {/* Standard Gradient Header */}
                <div className="rf-card-header" style={{
                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.35), transparent)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                    <div style={{
                        background: '#3b82f6',
                        color: '#fff',
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <MessageSquare size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Mensagens</h3>
                    {!canSend && (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>
                            Apenas o administrador pode enviar mensagens.
                        </span>
                    )}
                </div>

                {/* Messages List */}
                <div
                    ref={scrollViewportRef}
                    onScroll={handleScroll}
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                    {messages.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '50%' }}>
                                <MessageSquare size={24} color="#64748b" />
                            </div>
                            <span style={{ fontSize: '0.9rem' }}>Nenhuma mensagem ainda.</span>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isMe = msg.email === user?.email;
                        const isAdminMsg = msg.email === ADMIN_EMAIL;

                        return (
                            <div key={msg.id} className="message-group" style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                    {/* Bubble */}
                                    <div style={{
                                        background: isAdminMsg
                                            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' // Admin (Blue)
                                            : 'rgba(255, 255, 255, 0.1)', // Others (Gray - though likely none as only admin sends)
                                        color: '#fff',
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        borderBottomRightRadius: isMe ? '4px' : '16px',
                                        borderBottomLeftRadius: !isMe ? '4px' : '16px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        lineHeight: '1.5',
                                        fontSize: '0.95rem',
                                        border: isAdminMsg ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                        position: 'relative',
                                        minWidth: '120px'
                                    }}>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                                        <div style={{
                                            fontSize: '0.65rem',
                                            color: 'rgba(255,255,255,0.7)',
                                            marginTop: '6px',
                                            textAlign: 'right',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span>{msg.user}</span>
                                            <span>{formatTime(msg.timestamp)}</span>
                                        </div>
                                    </div>

                                    {/* Delete Button (Only for Admin) */}
                                    {canSend && (
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="delete-btn"
                                            title="Apagar mensagem"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                opacity: 0.5,
                                                transition: 'opacity 0.2s',
                                                display: 'flex', alignItems: 'center'
                                            }}
                                            onMouseEnter={(e) => e.target.style.opacity = 1}
                                            onMouseLeave={(e) => e.target.style.opacity = 0.5}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (Only for Admin) */}
                {canSend ? (
                    <form onSubmit={handleSend} style={{
                        padding: '16px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        gap: '12px'
                    }}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                        <button type="submit" disabled={!inputText.trim()} style={{
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '12px',
                            width: '48px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: inputText.trim() ? 'pointer' : 'default',
                            opacity: inputText.trim() ? 1 : 0.5,
                            transition: 'opacity 0.2s'
                        }}>
                            <Send size={20} color="#fff" />
                        </button>
                    </form>
                ) : (
                    <div style={{
                        padding: '16px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.9rem'
                    }}>
                        <AlertCircle size={16} style={{ display: 'inline', marginBottom: '-3px', marginRight: '6px' }} />
                        Apenas o administrador pode enviar mensagens.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chat;
