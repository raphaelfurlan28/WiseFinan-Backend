import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, User, Mail, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { getApiUrl } from '../../services/api';

const SubscriptionModal = ({ isOpen, onClose, selectedPlan }) => {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        whatsapp: ''
    });
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setError('');
            // Optional: reset form or keep it. Let's keep it unless plan changed significantly.
        }
    }, [isOpen]);

    const isFormValid = formData.nome && formData.email && formData.whatsapp;

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
        } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
        } else if (value.length > 0) {
            value = value.replace(/^(\d*)/, '($1');
        }

        setFormData({ ...formData, whatsapp: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setStatus('loading');
        try {
            const response = await fetch(getApiUrl('/api/subscription/request'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    plano: selectedPlan?.name || 'Não selecionado'
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
            } else {
                setError(data.error || 'Ocorreu um erro ao enviar sua solicitação.');
                setStatus('error');
            }
        } catch (err) {
            console.error('Subscription request connection error:', err);
            setError('Falha na conexão com o servidor.');
            setStatus('error');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="modal-overlay">
                <motion.div
                    className="modal-container"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                >
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>

                    {status === 'success' ? (
                        <div className="modal-success">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12 }}
                            >
                                <CheckCircle size={80} color="#4ade80" />
                            </motion.div>
                            <h2>Solicitação Enviada!</h2>
                            <p>
                                Sua solicitação foi enviada com sucesso para nossa equipe.
                            </p>
                            <p className="success-footer">
                                Em breve a equipe de Suporte da WiseFinan entrará em contato para formalizar o pagamento e liberação do acesso ao APP.
                            </p>
                            <button className="btn-primary centered-text" style={{ width: '100%', marginTop: '2rem' }} onClick={onClose}>
                                Voltar para a Home
                            </button>
                        </div>
                    ) : (
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>Assinar WiseFinan</h2>
                                <div className="selected-plan-badge">
                                    Plano Selecionado: <strong>{selectedPlan?.name}</strong>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="subscription-form">
                                <div className="form-group">
                                    <label><User size={16} /> Nome Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Seu nome"
                                        value={formData.nome}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label><Mail size={16} /> E-mail</label>
                                    <input
                                        type="email"
                                        placeholder="exemplo@email.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label><Phone size={16} /> WhatsApp</label>
                                    <input
                                        type="tel"
                                        placeholder="(DD) 99999-9999"
                                        value={formData.whatsapp}
                                        onChange={handlePhoneChange}
                                        maxLength={15}
                                        required
                                    />
                                </div>

                                {status === 'error' && (
                                    <div className="form-error">
                                        {error}
                                    </div>
                                )}

                                <button
                                    className={`btn-primary centered-text ${!isFormValid || status === 'loading' ? 'disabled' : ''}`}
                                    disabled={!isFormValid || status === 'loading'}
                                    type="submit"
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            Solicitar Assinatura
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>

                                <p className="form-disclaimer">
                                    Ao clicar em solicitar, nossa equipe receberá seus dados e entrará em contato via WhatsApp para finalizar sua assinatura.
                                </p>
                            </form>
                        </div>
                    )}
                </motion.div>
            </div>

            <style jsx>{`
                .btn-primary.centered-text {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    gap: 8px; /* For icon spacing */
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1.5rem;
                }

                .modal-container {
                    background: rgba(30, 41, 59, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1.5rem;
                    width: 100%;
                    max-width: 500px;
                    position: relative;
                    padding: 2.5rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .modal-close {
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: color 0.2s;
                    z-index: 10;
                }

                .modal-close:hover {
                    color: white;
                }

                .modal-header {
                    margin-bottom: 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.75rem;
                }

                .modal-header h2 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    margin: 0;
                    background: linear-gradient(to right, #4ade80, #34d399, #22d3ee);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    line-height: 1.2;
                }

                .selected-plan-badge {
                    display: inline-block;
                    padding: 0.4rem 1.2rem;
                    background: transparent;
                    border: 2px solid rgba(74, 222, 128, 0.6);
                    border-radius: 9999px;
                    color: #4ade80;
                    font-size: 0.75rem;
                    font-weight: 600;
                    box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
                    text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
                    margin-top: 0.25rem;
                }

                @media (max-width: 480px) {
                    .modal-header {
                        align-items: center;
                        text-align: center;
                        margin-bottom: 2.5rem;
                    }
                    .modal-container {
                        padding: 3rem 1.5rem 2rem;
                    }
                    .modal-header h2 {
                        font-size: 1.5rem;
                    }
                    .selected-plan-badge {
                        padding: 0.3rem 1rem;
                        font-size: 0.7rem;
                    }
                }

                .subscription-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: #94a3b8;
                    font-weight: 500;
                }

                .form-group input {
                    background: rgba(15, 23, 42, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 0.75rem;
                    padding: 0.75rem 1rem;
                    color: white;
                    font-size: 1rem;
                    transition: all 0.2s;
                }

                .form-group input:focus {
                    outline: none;
                    border-color: #4ade80;
                    background: rgba(15, 23, 42, 0.8);
                    box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
                }

                .form-error {
                    color: #ef4444;
                    font-size: 0.875rem;
                    text-align: center;
                }

                .btn-primary.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none !important;
                    box-shadow: none !important;
                }

                .form-disclaimer {
                    font-size: 0.75rem;
                    color: #64748b;
                    text-align: center;
                    line-height: 1.5;
                }

                .modal-success {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .modal-success h2 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: white;
                    margin-top: 1rem;
                }

                .modal-success p {
                    color: #94a3b8;
                    font-size: 0.9375rem;
                    line-height: 1.6;
                }

                .success-footer {
                    background: rgba(74, 222, 128, 0.05);
                    border: 1px solid rgba(74, 222, 128, 0.1);
                    padding: 1rem;
                    border-radius: 0.75rem;
                    color: #4ade80 !important;
                    font-weight: 500;
                }

                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </AnimatePresence>
    );
};

export default SubscriptionModal;
