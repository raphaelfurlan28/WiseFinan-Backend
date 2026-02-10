import React from 'react';
import { Instagram, MessageCircle } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <img src="/logo-app.svg" alt="WiseFinan" style={{ width: '32px', height: '32px' }} />
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>WiseFinan</span>
                    </div>
                    <p className="footer-text">
                        Sua plataforma completa para inteligência financeira. Tome decisões melhores, maximize seus lucros e proteja seu patrimônio.
                    </p>
                    <div className="social-links">
                        <a href="https://www.instagram.com/rapha.furlan/" target="_blank" rel="noopener noreferrer" className="social-link">
                            <Instagram size={20} />
                        </a>
                        <a href="https://wa.me/5519996463115" target="_blank" rel="noopener noreferrer" className="social-link">
                            <MessageCircle size={20} />
                        </a>
                    </div>
                </div>

                <div className="footer-col">
                    <h4>Produto</h4>
                    <ul className="footer-links">
                        <li><a href="#">Recursos</a></li>
                        <li><a href="#">Preços</a></li>
                        <li><a href="#">API</a></li>
                        <li><a href="#">Roadmap</a></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Legal</h4>
                    <ul className="footer-links">
                        <li><a href="#">Termos de Uso</a></li>
                        <li><a href="#">Privacidade</a></li>
                        <li><a href="#">Cookies</a></li>
                        <li><a href="#">Contato</a></li>
                    </ul>
                </div>
            </div>

            <div className="footer-bottom">
                <p className="copyright">
                    &copy; 2026 WiseFinan. Todos os direitos reservados.
                </p>
                <p className="disclaimer">
                    Investimentos envolvem riscos.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
