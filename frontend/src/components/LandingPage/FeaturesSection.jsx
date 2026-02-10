import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, PieChart, Activity, Globe, Smartphone, Lock } from 'lucide-react';

const features = [
    {
        icon: <LineChart size={24} />,
        title: "Análise Técnica Avançada",
        description: "Cálculos de Precificação de Ativos, Filtro de Opções para operações estruturadas, utilizando Fundamentos e Estatística."
    },
    {
        icon: <Activity size={24} />,
        title: "Sinais em Tempo Real",
        description: "Receba alertas instantâneos sobre movimentações de mercado e oportunidades."
    },
    {
        icon: <PieChart size={24} />,
        title: "Gestão de Portfólio",
        description: "Visualize a melhor alocação do seu capital de acordo com seu perfil de investidor."
    },
    {
        icon: <Smartphone size={24} />,
        title: "Mobile First",
        description: "Acesse as melhores Oportunidades de qualquer lugar com nossa interface otimizada para mobile."
    },
    {
        icon: <Globe size={24} />,
        title: "Notícias do Mundo dos Investimentos",
        description: "Acompanhe ativos do mundo todo, de ações a criptomoedas e commodities."
    },
    {
        icon: <Lock size={24} />,
        title: "Segurança de Ponta",
        description: "Oportunidades e Filtros pensado para Investidores que priorizam a segurança."
    }
];

const FeaturesSection = () => {
    return (
        <section id="features" className="features-section">
            <div className="section-header">
                <h2 className="section-title">
                    Tudo que você precisa para <span className="gradient-text">prosperar</span>
                </h2>
                <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto', fontSize: '1.125rem' }}>
                    Ferramentas construídas para investidores que exigem o melhor em tecnologia e dados.
                </p>
            </div>

            <div className="features-grid">
                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="feature-card"
                    >
                        <div className="feature-icon">
                            {feature.icon}
                        </div>
                        <h3 className="feature-title">
                            {feature.title}
                        </h3>
                        <p className="feature-text">
                            {feature.description}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default FeaturesSection;
