import React, { useState } from 'react';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PricingSection from './PricingSection';
import Footer from './Footer';
import MockupSection from './MockupSection';
import SubscriptionModal from './SubscriptionModal';
import './LandingPage.css';

const LandingPage = ({ onLoginClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setIsSubscriptionModalOpen(true);
    };

    return (
        <div className="landing-container">
            {/* Navigation Bar */}
            <nav className="landing-nav">
                <div className="nav-content">
                    <div className="nav-logo">
                        <img src="/logo-app.svg" alt="WiseFinan" className="logo-icon-img" />
                        <span>WiseFinan</span>
                    </div>

                    <div className="hidden md:flex nav-links">
                        <a href="#features" className="nav-link">Recursos</a>
                        <a href="#pricing" className="nav-link">Planos</a>
                        <button onClick={onLoginClick} className="nav-btn-login">
                            Login
                        </button>
                        <button onClick={onLoginClick} className="nav-btn-cta">
                            Começar Agora
                        </button>
                    </div>
                    {/* Mobile Button placeholder if needed */}
                    <div className="mobile-actions">
                        <button onClick={onLoginClick} className="nav-btn-cta">
                            Entrar
                        </button>
                    </div>
                </div>
            </nav>

            <HeroSection onLoginClick={onLoginClick} />
            <MockupSection />
            <FeaturesSection />
            <PricingSection onLoginClick={onLoginClick} onSelectPlan={handleSelectPlan} />
            <Footer />

            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={() => setIsSubscriptionModalOpen(false)}
                selectedPlan={selectedPlan}
            />
        </div>
    );
};

export default LandingPage;
