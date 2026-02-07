import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Loader, Eye, EyeOff } from 'lucide-react';

const SplashScreen = () => {
    const { login, authError } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                    width: '85%', maxWidth: '300px', // Less wide
                    pointerEvents: showLogin ? 'auto' : 'none',
                    zIndex: 10
                }}
            >
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '20px',
                    position: 'relative', width: '100%'
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Title Login positioned left */}
                        <span style={{
                            fontSize: '1rem',
                            fontWeight: '500', // Less thick
                            color: 'rgba(255,255,255,0.9)',
                            alignSelf: 'flex-start', // Left aligned
                            marginLeft: '8px',
                            marginBottom: '-8px' // Close to input
                        }}>
                            Login:
                        </span>

                        <div style={{ position: 'relative' }}>
                            <Mail size={18} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                style={{
                                    width: '100%', padding: '12px 16px 12px 48px',
                                    background: 'rgba(255, 255, 255, 0.08)', // Slightly lighter
                                    border: '1px solid rgba(255, 255, 255, 0.1)', // Thin border for definition
                                    borderRadius: '50px',
                                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                                    fontWeight: '500', transition: 'all 0.3s',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', // Drop shadow (Floating)
                                    backdropFilter: 'blur(10px)'
                                }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Lock size={18} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                style={{
                                    width: '100%', padding: '12px 48px 12px 48px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '50px',
                                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                                    fontWeight: '500', transition: 'all 0.3s',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    backdropFilter: 'blur(10px)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 1
                                }}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} color="rgba(255,255,255,0.7)" />
                                ) : (
                                    <Eye size={18} color="rgba(255,255,255,0.7)" />
                                )}
                            </button>
                        </div>

                        {authError && (
                            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '20px', color: '#fca5a5', fontSize: '0.8rem', textAlign: 'center', backdropFilter: 'blur(4px)' }}>
                                {authError}
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 5px 15px rgba(16, 185, 129, 0.3)' }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)', // Depth gradient
                                border: 'none',
                                borderRadius: '50px', // Round
                                padding: '12px',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)', // Bottom shadow only
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }}
                        >
                            {isSubmitting ? (
                                <Loader size={18} className="animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={18} />
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
