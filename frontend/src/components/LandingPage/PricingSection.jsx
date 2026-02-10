import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const plans = [
    {
        name: "Mensal",
        price: "49,90",
        period: "/mês",
        description: "Para quem quer flexibilidade total",
        features: [
            "Acesso a todas as ferramentas",
            "Análises de Valuation",
            "Oportunidades Mapeadas",
            "Divisão do Portfólio",
            "Estratégias de Opções",
            "Simulador de Investimentos",
            "Chat de Operações Realizadas",
            "Suporte 24h / 7d"
        ],
        cta: "Escolher Mensal",
        popular: false
    },
    {
        name: "Semestral",
        price: "39,90",
        period: "/mês",
        totalLabel: "Total de R$ 239,40",
        description: "Economize 20% assinando por 6 meses",
        features: [
            "Acesso a todas as ferramentas",
            "Análises de Valuation",
            "Oportunidades Mapeadas",
            "Divisão do Portfólio",
            "Estratégias de Opções",
            "Simulador de Investimentos",
            "Chat de Operações Realizadas",
            "Acesso ao Grupo VIP do Whatsapp",
            "Acesso as Lives Semanais",
            "Suporte 24h / 7d"
        ],
        cta: "Escolher Semestral",
        popular: true
    },
    {
        name: "Anual",
        price: "34,90",
        period: "/mês",
        totalLabel: "Total de R$ 418,80",
        description: "Melhor valor: economize 30% no ano",
        features: [
            "Acesso a todas as ferramentas",
            "Análises de Valuation",
            "Oportunidades Mapeadas",
            "Divisão do Portfólio",
            "Estratégias de Opções",
            "Simulador de Investimentos",
            "Chat de Operações Realizadas",
            "Acesso ao Grupo VIP do Whatsapp",
            "Acesso as Lives Semanais",
            "Acesso a Mentoria",
            "Suporte 24h / 7d"
        ],
        cta: "Escolher Anual",
        popular: false
    }
];

const PricingSection = ({ onLoginClick, onSelectPlan }) => {
    return (
        <section id="pricing" className="pricing-section">
            <div className="section-header">
                <h2 className="section-title">
                    Escolha o plano ideal para <span className="gradient-text">seu perfil</span>
                </h2>
                <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto', fontSize: '1.125rem' }}>
                    Comece gratuitamente e faça o upgrade quando sentir que é o momento de acelerar seus resultados.
                </p>
            </div>

            <div className="pricing-grid">
                {plans.map((plan, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className={`pricing-card ${plan.popular ? 'popular' : ''}`}
                    >
                        {plan.popular && (
                            <span className="popular-badge">Mais Popular</span>
                        )}
                        <h3 className="plan-name">{plan.name}</h3>
                        <div className="plan-price-container">
                            <div className="plan-price">
                                <span style={{ fontSize: '1.5rem', verticalAlign: 'top' }}>R$</span>
                                {plan.price}
                                <span className="plan-period">{plan.period}</span>
                            </div>
                            {plan.totalLabel && (
                                <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem', fontWeight: '500' }}>
                                    {plan.totalLabel}
                                </div>
                            )}
                        </div>

                        <p className="plan-desc">{plan.description}</p>

                        <ul className="feature-list">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="feature-item">
                                    <Check className="check-icon" size={18} />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => onSelectPlan ? onSelectPlan(plan) : onLoginClick()}
                            className={`btn-plan ${plan.popular ? 'primary' : 'outline'}`}
                        >
                            {plan.cta}
                        </button>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default PricingSection;
