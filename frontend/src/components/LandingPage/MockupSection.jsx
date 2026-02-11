import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';

const MockupItem = ({ src, alt, size = "normal", onClick }) => (
    <motion.div
        layoutId={`card-container-${src}`}
        onClick={onClick}
        className={`mockup-card ${size}`}
        whileHover={{ y: -10 }}
    >
        <div className="clean-phone-frame">
            <motion.img
                src={src}
                alt={alt}
                layoutId={`card-image-${src}`}
                className="clean-mockup-img"
                style={{ imageRendering: 'high-quality' }}
            />
            <div className="hover-indicator">
                <ZoomIn size={24} color="white" />
            </div>
        </div>
        {alt && <h3 className="mockup-label">{alt}</h3>}
    </motion.div>
);

const MockupSection = () => {
    const [selectedSrc, setSelectedSrc] = useState(null);

    return (
        <section className="mockup-section">
            <div className="section-header">
                <h2 className="section-title">
                    <span className="gradient-text">Tudo que você precisa</span> em um só lugar
                </h2>
                <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto', fontSize: '1.125rem' }}>
                    Uma plataforma completa para seus investimentos.
                </p>
            </div>

            <div className="mockup-layout">
                {/* 1. Single Main Mockup */}
                <div className="mockup-row single">
                    <MockupItem
                        src="/mockups/img_1.png"
                        alt="Tudo que você vai encontrar no APP"
                        size="large"
                        onClick={() => setSelectedSrc("/mockups/img_1.png")}
                    />
                </div>

                {/* 2. Two Mockups (Home Opportunities) */}
                <div className="mockup-group">
                    <h3 className="group-title">Melhores <span className="gradient-text">Oportunidades</span></h3>
                    <div className="mockup-row two-cols">
                        <MockupItem
                            src="/mockups/img_3.png"
                            size="medium"
                            onClick={() => setSelectedSrc("/mockups/img_3.png")}
                        />
                        <MockupItem
                            src="/mockups/img_7.png"
                            size="medium"
                            onClick={() => setSelectedSrc("/mockups/img_7.png")}
                        />
                    </div>
                </div>

                {/* 3. Three Mockups (Detailed Analysis) */}
                <div className="mockup-group">
                    <h3 className="group-title">Portfólio com  <span className="gradient-text"> Alocações Detalhadas</span></h3>
                    <div className="mockup-row three-cols">
                        <MockupItem
                            src="/mockups/img_4.png"
                            size="small"
                            onClick={() => setSelectedSrc("/mockups/img_4.png")}
                        />
                        <MockupItem
                            src="/mockups/img_5.png"
                            size="small"
                            onClick={() => setSelectedSrc("/mockups/img_5.png")}
                        />
                        <MockupItem
                            src="/mockups/img_6.png"
                            size="small"
                            onClick={() => setSelectedSrc("/mockups/img_6.png")}
                        />
                    </div>
                </div>

                {/* 4. Single Mockups with specific labels */}
                <div className="mockup-group">
                    <h3 className="group-title">Ferramentas <span className="gradient-text">Exclusivas</span></h3>
                    <div className="mockup-row single-items">
                        <MockupItem
                            src="/mockups/img_2.png"
                            alt="Informações de Valuation e Precificação"
                            size="normal"
                            onClick={() => setSelectedSrc("/mockups/img_2.png")}
                        />
                        <MockupItem
                            src="/mockups/img_9.png"
                            alt="Calendário Econômico"
                            size="normal"
                            onClick={() => setSelectedSrc("/mockups/img_9.png")}
                        />
                        <MockupItem
                            src="/mockups/img_10.png"
                            alt="Alertas Premium"
                            size="normal"
                            onClick={() => setSelectedSrc("/mockups/img_10.png")}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {selectedSrc && (
                    <div className="lightbox-overlay" onClick={() => setSelectedSrc(null)}>
                        <motion.div
                            className="lightbox-content"
                            layoutId={`card-container-${selectedSrc}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="close-btn" onClick={() => setSelectedSrc(null)}>
                                <X size={24} />
                            </button>
                            <motion.img
                                src={selectedSrc}
                                alt="Expanded view"
                                layoutId={`card-image-${selectedSrc}`}
                                className="lightbox-img"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="mockup-glow glow-center"></div>
        </section>
    );
};

export default MockupSection;
