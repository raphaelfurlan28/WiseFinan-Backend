import React, { useState } from 'react';
import { X, Save, Loader, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

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
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)'
        }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                style={{
                    width: '90%', maxWidth: '380px',
                    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', gap: '24px',
                    position: 'relative', overflow: 'hidden'
                }}
            >
                {/* Decorative background glow */}
                <div style={{
                    position: 'absolute', top: -50, right: -50, width: 150, height: 150,
                    background: '#10b981', filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%'
                }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, position: 'relative' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'white', fontWeight: '700', letterSpacing: '-0.5px' }}>Perfil</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Gerencie suas informações</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            padding: '8px',
                            zIndex: 50,
                            position: 'relative',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#fff'}
                        onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                    >
                        Fechar
                    </button>
                </div>

                {/* Avatar Section */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 1 }}>
                    <div style={{
                        position: 'relative',
                        padding: '4px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                        borderRadius: '50%',
                    }}>
                        <div style={{
                            width: '96px', height: '96px', borderRadius: '50%',
                            background: '#1e293b', overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 0 4px rgba(15, 23, 42, 1)'
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
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 1 }}>
                    {/* Name Input */}
                    <div>
                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>Nome de Exibição</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    fontWeight: '500'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#10b981';
                                    e.target.style.background = 'rgba(16, 185, 129, 0.05)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                                    e.target.style.background = 'rgba(15, 23, 42, 0.6)';
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Save Button */}
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white', border: 'none', padding: '16px', borderRadius: '16px',
                                fontWeight: '600', fontSize: '1rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                opacity: loading ? 0.7 : 1, width: '100%',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                        >
                            {loading ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                            Salvar Alterações
                        </motion.button>

                        {/* Logout Button */}
                        <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(30, 41, 59, 1)', borderColor: 'rgba(255,255,255,0.2)' }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={handleLogout}
                            style={{
                                background: 'rgba(30, 41, 59, 0.6)',
                                color: '#cbd5e1',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '16px', borderRadius: '16px',
                                fontWeight: '600', fontSize: '1rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                width: '100%', transition: 'all 0.2s'
                            }}
                        >
                            <LogOut size={20} />
                            Sair da Conta
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default UserProfileModal;
