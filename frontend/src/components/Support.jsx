import React from 'react';
import { HelpCircle, MessageCircle, Instagram, ExternalLink } from 'lucide-react';
import './FixedIncome.css'; // Reusing glass card styles

const Support = () => {
    return (
        <div className="rf-container">
            {/* Header */}
            <header className="rf-header" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <HelpCircle size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Suporte</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '600px', margin: '0 0' }}>

                {/* Contact Card */}
                <div className="rf-card glass-card" style={{ padding: '0px' }}>
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                        borderRadius: '16px 16px 0 0',
                        padding: '12px 16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <HelpCircle size={18} color="#000000" />
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Canais de Atendimento</h3>
                    </div>

                    <div className="rf-card-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <p style={{ color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                            Precisa de ajuda ou encontrou algum problema? Entre em contato diretamente através dos canais abaixo.
                        </p>

                        {/* WhatsApp */}
                        <a
                            href="https://wa.me/5519996463115"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                        >
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '16px',
                                padding: '16px',
                                borderRadius: '12px',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ background: '#22c55e', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                                    <MessageCircle size={24} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>WhatsApp</div>
                                    <div style={{ color: '#86efac', fontSize: '0.9rem' }}>(19) 99646-3115</div>
                                </div>
                                <ExternalLink size={20} color="rgba(255,255,255,0.5)" />
                            </div>
                        </a>

                        {/* Separator */}
                        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>

                        {/* Instagram */}
                        <a
                            href="https://instagram.com/rapha.furlan"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                        >
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '16px',
                                padding: '16px',
                                borderRadius: '12px',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ background: '#a855f7', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                                    <Instagram size={24} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>Instagram</div>
                                    <div style={{ color: '#d8b4fe', fontSize: '0.9rem' }}>@rapha.furlan</div>
                                </div>
                                <ExternalLink size={20} color="rgba(255,255,255,0.5)" />
                            </div>
                        </a>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default Support;
