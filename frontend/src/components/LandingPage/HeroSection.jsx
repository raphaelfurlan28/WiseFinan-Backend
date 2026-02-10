import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Zap, Calculator } from 'lucide-react';

const HeroSection = ({ onLoginClick }) => {
    return (
        <div className="hero-section">
            <div className="hero-bg-glow"></div>
            <div className="hero-bg-glow-2"></div>

            <div className="hero-content">
                <div className="text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="hero-badge">
                            <span className="pulsing-dot"></span>
                            A plataforma definitiva para investidores
                        </div>
                        <h1 className="hero-title">
                            Domine seus investimentos com <span className="gradient-text">Inteligência</span>
                        </h1>
                        <p className="hero-subtitle">
                            WiseFinan oferece ferramentas avançadas de análise, rastreamento em tempo real e insights impulsionados por Estatísticas para maximizar seus retornos.
                        </p>
                        <div className="hero-buttons">
                            <button
                                onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
                                className="btn-primary"
                            >
                                Escolha seu Plano
                                <ArrowRight size={20} />
                            </button>
                            <button onClick={onLoginClick} className="btn-secondary">
                                Já tenho conta
                            </button>
                        </div>
                    </motion.div>

                    {/* Floating Stats/Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="ui-preview"
                    >
                        {/* Fake UI Header */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', opacity: 0.5 }}></div>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308', opacity: 0.5 }}></div>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', opacity: 0.5 }}></div>
                        </div>

                        <div className="ui-grid">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="ui-card"
                            >
                                <div className="ui-card-header">
                                    <div className="icon-box icon-green">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="ui-card-label">Rentabilidade</span>
                                </div>
                                <div className="ui-card-value">Acima de 2% Mensal</div>
                                <div className="ui-card-subtext">
                                    Utilizando estratégias de Venda Coberta com Opções para gerar renda passiva consistente.
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill fill-green"></div>
                                </div>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="ui-card"
                            >
                                <div className="ui-card-header">
                                    <div className="icon-box icon-blue">
                                        <Zap size={20} />
                                    </div>
                                    <span className="ui-card-label">Alta Performance</span>
                                </div>
                                <div className="ui-card-value">Compra de Ações</div>
                                <div className="ui-card-subtext">
                                    Identificamos oportunidades de custo baixo (Buy & Hold) com alto potencial de valorização.
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill fill-blue"></div>
                                </div>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="ui-card"
                            >
                                <div className="ui-card-header">
                                    <div className="icon-box icon-purple">
                                        <Shield size={20} />
                                    </div>
                                    <span className="ui-card-label">Proteção</span>
                                </div>
                                <div className="ui-card-value">Renda Fixa & Equity</div>
                                <div className="ui-card-subtext">
                                    Equilíbrio estratégico entre Tesouro Direto, CDBs e seguros de carteira com derivativos.
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill fill-purple"></div>
                                </div>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="ui-card"
                            >
                                <div className="ui-card-header">
                                    <div className="icon-box icon-yellow">
                                        <Calculator size={20} />
                                    </div>
                                    <span className="ui-card-label">Calculadoras</span>
                                </div>
                                <div className="ui-card-value">Inteligência de Dados</div>
                                <div className="ui-card-subtext">
                                    Simule retornos reais descontando inflação e taxas, com precisão estatística avançada.
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill fill-yellow"></div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
