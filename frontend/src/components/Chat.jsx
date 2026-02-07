import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Trash2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import './FixedIncome.css'; // Reusing common styles

const Chat = () => {
    const { updateReadStatus } = useNotification();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Hardcoded user for now (matches App.jsx)
    const currentUser = "Raphael Furlan";

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/chat');
            if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json)) {
                    setMessages(json);
                }
            }
        } catch (err) {
            console.error("Error fetching chat:", err);
        } finally {
            setLoading(false);
        }
    };

    // Poll for messages
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 2000); // 2 seconds
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom on new messages & Mark as Read
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        if (messages.length > 0) {
            updateReadStatus(messages.length);
        }
    }, [messages, updateReadStatus]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const text = inputText;
        setInputText(''); // Optimistic clear

        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: currentUser,
                    text: text
                })
            });
            fetchMessages(); // Refresh immediately
        } catch (err) {
            console.error("Error sending message:", err);
            setInputText(text); // Restore on error
        }
    };

    const handleDelete = async (msgId) => {
        if (!window.confirm("Apagar mensagem?")) return;

        try {
            await fetch(`/api/chat?id=${msgId}`, { method: 'DELETE' });
            fetchMessages(); // Refresh
        } catch (err) {
            console.error("Error deleting message:", err);
        }
    };

    return (
        <div className="rf-container" style={{ height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <MessageSquare size={28} color="#fff" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#fff' }}>Chat Global</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0), transparent)', marginTop: '16px' }}></div>
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
                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), transparent)',
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
                </div>

                {/* Messages List */}
                <div style={{
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
                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Seja o primeiro a enviar!</span>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isMe = msg.user === currentUser;
                        return (
                            <div key={idx} className="message-group" style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMe ? 'flex-end' : 'flex-start',
                                position: 'relative'
                            }}>
                                {/* Name header removed as it is now in footer */}

                                {/* Bubble Container */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                    {/* Bubble */}
                                    <div style={{
                                        background: isMe ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255, 255, 255, 0.1)',
                                        color: isMe ? '#fff' : '#e2e8f0',
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        borderBottomRightRadius: isMe ? '4px' : '16px',
                                        borderBottomLeftRadius: !isMe ? '4px' : '16px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        lineHeight: '1.5',
                                        fontSize: '0.95rem',
                                        border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                        position: 'relative'
                                    }}>
                                        {msg.text}
                                    </div>

                                    {/* Delete Button (Only for me) */}
                                    {isMe && (
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
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px', opacity: 0.8, marginRight: isMe ? '4px' : 0, marginLeft: !isMe ? '4px' : 0 }}>
                                    {msg.user} • {msg.time_display}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
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
            </div>
        </div>
    );
};

export default Chat;
