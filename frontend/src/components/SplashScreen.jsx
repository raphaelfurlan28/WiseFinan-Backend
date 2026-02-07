import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Loader } from 'lucide-react';

const SplashScreen = () => {
    const { login, authError } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowLogin(true);
        }, 2200);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsSubmitting(true);
        await login(email, password);
        setIsSubmitting(false);
    };

    // Helper for input focus styles to match Profile Modal
    const handleFocus = (e) => {
        e.target.style.borderColor = '#10b981';
        e.target.style.background = 'rgba(16, 185, 129, 0.05)';
    };
    const handleBlur = (e) => {
        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
        e.target.style.background = 'rgba(15, 23, 42, 0.6)';
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Animated Background Orbs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, -30, 0],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute', top: '10%', left: '15%',
                    width: '400px', height: '400px',
                    background: '#10b981', filter: 'blur(180px)', opacity: 0.15, borderRadius: '50%'
                }}
            />
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    x: [0, -30, 0],
                    y: [0, 50, 0],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute', bottom: '15%', right: '15%',
                    width: '350px', height: '350px',
                    background: '#3b82f6', filter: 'blur(180px)', opacity: 0.15, borderRadius: '50%'
                }}
            />

            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}
                >
                    {/* Logo with Spring Animation */}
                    <motion.div
                        initial={{ rotate: -45, scale: 0.5, opacity: 0 }}
                        animate={{ rotate: 0, scale: 1, opacity: 1 }}
                        transition={{
                            type: "spring", stiffness: 260, damping: 20, delay: 0.2
                        }}
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        style={{
                            width: '80px', height: '80px',
                            borderRadius: '20px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)',
                            marginBottom: '16px',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <span style={{
                            fontFamily: 'Inter, sans-serif', fontSize: '2rem', fontWeight: '800',
                            background: 'linear-gradient(135deg, #fff 0%, #10b981 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            letterSpacing: '-2px'
                        }}>WF</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.6 }}
                        style={{ fontSize: '2rem', fontWeight: '700', color: '#e2e8f0', margin: 0 }}
                    >
                        WiseFinan
                    </motion.h1>
                </motion.div>
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: showLogin ? 1 : 0, y: showLogin ? 0 : 30 }}
                transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
                style={{
                    width: '90%', maxWidth: '380px',
                    pointerEvents: showLogin ? 'auto' : 'none',
                    zIndex: 10
                }}
            >
                <div style={{
                    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', gap: '24px',
                    position: 'relative', overflow: 'hidden'
                }}>
                    {/* Decorative Glow similar to Profile */}
                    <div style={{
                        position: 'absolute', top: -50, right: -50, width: 150, height: 150,
                        background: '#10b981', filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%'
                    }}></div>

                    <h2 style={{
                        margin: 0, fontSize: '1.5rem', color: 'white', fontWeight: '700',
                        letterSpacing: '-0.5px', textAlign: 'center', zIndex: 1, position: 'relative'
                    }}>
                        Bem-vindo de volta
                    </h2>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 1, position: 'relative' }}>

                        <div style={{ position: 'relative' }}>
                            <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                style={{
                                    width: '100%', padding: '16px 16px 16px 48px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '16px',
                                    color: '#fff', fontSize: '1rem', outline: 'none',
                                    fontWeight: '500', transition: 'all 0.2s'
                                }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                style={{
                                    width: '100%', padding: '16px 16px 16px 48px',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '16px',
                                    color: '#fff', fontSize: '1rem', outline: 'none',
                                    fontWeight: '500', transition: 'all 0.2s'
                                }}
                            />
                        </div>

                        {authError && (
                            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>
                                {authError}
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                borderRadius: '16px',
                                padding: '16px',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            {isSubmitting ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default SplashScreen;
