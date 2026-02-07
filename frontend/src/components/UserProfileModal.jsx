import React, { useState } from 'react';
import { X, Save, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import ModernLoader from './ModernLoader';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, updateUserProfile, logout } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [imgError, setImgError] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Ensure we preserve the existing photo
        const success = await updateUserProfile(name, user?.photo);
        setLoading(false);
        if (success) onClose();
    };

    const handleLogout = () => {
        logout();
        onClose(); // Close modal (though app will redirect to Splash)
    };

    return (
        <>
            {/* Modal Overlay - just blur, no color */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(15px)'
            }} onClick={onClose}>

                {loading && <ModernLoader text="Atualizando Perfil..." />}

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '90%', maxWidth: '340px',
                        display: 'flex', flexDirection: 'column', gap: '32px',
                        position: 'relative'
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', fontWeight: '500', letterSpacing: '-0.5px' }}>Meu Perfil</h3>
                    </div>

                    {/* Avatar - Floating */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '96px', height: '96px', borderRadius: '50%',
                            background: '#1e293b', overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            border: '4px solid rgba(255,255,255,0.1)'
                        }}>
                            {user?.photo && !imgError ? (
                                <img
                                    src={user.photo}
                                    alt="Profile"
                                    referrerPolicy="no-referrer"
                                    onError={() => setImgError(true)}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <User size={48} color="#64748b" />
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Name Input - Floating Glass */}
                        <div style={{ position: 'relative' }}>
                            <label style={{
                                display: 'block', color: '#94a3b8',
                                fontSize: '0.8rem', fontWeight: '500', marginBottom: '8px', marginLeft: '16px'
                            }}>
                                Nome de Exibição:
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '50px',
                                    padding: '16px 24px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    fontWeight: '500',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.12)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                                }}
                            />
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white', border: 'none',
                                    padding: '16px', borderRadius: '50px',
                                    fontWeight: '600', fontSize: '1rem', cursor: 'pointer',
                                    width: '100%',
                                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
                                }}
                            >
                                Salvar Alterações
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={handleLogout}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: '#cbd5e1',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    padding: '16px', borderRadius: '50px',
                                    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                Sair da Conta
                            </motion.button>
                        </div>
                    </form>

                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: -40, right: 0,
                            background: 'transparent',
                            border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#cbd5e1',
                            fontSize: '0.8rem', fontWeight: '300',
                            padding: '0'
                        }}
                    >
                        Fechar
                    </button>
                </motion.div>
            </div>
        </>
    );
};

export default UserProfileModal;
