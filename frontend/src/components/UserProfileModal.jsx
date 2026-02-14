import React, { useState } from 'react';
import { X, Save, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import ModernLoader from './ModernLoader';

const UserProfileModal = ({ isOpen, onClose }) => {
    const { user, updateUserProfile, logout, updateUserPassword, verifyPassword } = useAuth();

    // View State: 'profile' or 'password'
    const [view, setView] = useState('profile');

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passValid, setPassValid] = useState(null); // null, true, false

    if (!isOpen) return null;

    const handleSubmitProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await updateUserProfile(name, user?.photo);
        setLoading(false);
        if (success) onClose();
    };

    const handleVerifyPassword = async () => {
        if (!currentPassword) {
            setPassValid(null);
            return;
        }
        const isValid = await verifyPassword(currentPassword);
        setPassValid(isValid);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (!passValid) return;
        if (newPassword !== confirmPassword) {
            alert("As novas senhas não coincidem.");
            return;
        }
        if (newPassword.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setLoading(true);
        const result = await updateUserPassword(currentPassword, newPassword);
        setLoading(false);

        if (result.success) {
            alert("Senha alterada com sucesso!");
            onClose();
            setView('profile');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPassValid(null);
        } else {
            alert(result.error);
        }
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    const resetState = () => {
        setView('profile');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPassValid(null);
        onClose();
    };

    return (
        <>
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(15px)'
            }} onClick={resetState}>

                {loading && <ModernLoader text={view === 'profile' ? "Atualizando Perfil..." : "Alterando Senha..."} />}

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '90%', maxWidth: '340px',
                        display: 'flex', flexDirection: 'column', gap: '24px',
                        position: 'relative'
                    }}
                >
                    {/* Header */}
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white', fontWeight: '500', letterSpacing: '-0.5px' }}>
                            {view === 'profile' ? "Meu Perfil" : "Alterar Senha"}
                        </h3>
                    </div>

                    {view === 'profile' ? (
                        <>
                            {/* Avatar */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div style={{
                                    width: '96px', height: '96px', borderRadius: '50%',
                                    background: '#1e293b', overflow: 'hidden',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                    border: '4px solid rgba(255,255,255,0.1)'
                                }}>
                                    {user?.photo && !imgError ? (
                                        <img src={user.photo} alt="Profile" referrerPolicy="no-referrer" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={48} color="#64748b" />
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleSubmitProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500', marginBottom: '8px', marginLeft: '16px' }}>
                                        Nome de Exibição:
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        style={{
                                            width: '100%', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '50px', padding: '16px 24px', color: 'white', fontSize: '1rem', outline: 'none', fontWeight: '500'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '16px', borderRadius: '50px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)' }}>
                                        Salvar Alterações
                                    </motion.button>

                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setView('password')}
                                        style={{ background: 'white', color: '#059669', border: 'none', padding: '16px', borderRadius: '50px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', width: '100%', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)' }}>
                                        Alterar Senha
                                    </motion.button>

                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={handleLogout}
                                        style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '50px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', width: '100%' }}>
                                        Sair da Conta
                                    </motion.button>
                                </div>
                            </form>
                        </>
                    ) : (
                        // PASSWORD VIEW
                        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Current Password */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500', marginBottom: '8px', marginLeft: '16px' }}>
                                    Senha Atual:
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        onBlur={handleVerifyPassword}
                                        style={{
                                            width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                                            border: `1px solid ${passValid === true ? '#4ade80' : passValid === false ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                                            borderRadius: '50px', padding: '16px 24px', color: 'white', fontSize: '1rem', outline: 'none', fontWeight: '500'
                                        }}
                                    />
                                    {passValid !== null && (
                                        <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', color: passValid ? '#4ade80' : '#ef4444' }}>
                                            {passValid ? '●' : '●'} {/* Using dot as asterisk placeholder, color indicates status */}
                                        </div>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.7rem', color: passValid === true ? '#4ade80' : passValid === false ? '#ef4444' : 'transparent', marginLeft: '16px', marginTop: '4px', display: 'block' }}>
                                    {passValid === true ? "Senha correta" : passValid === false ? "Senha incorreta" : ""}
                                </span>
                            </div>

                            {/* New Password */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500', marginBottom: '8px', marginLeft: '16px' }}>
                                    Nova Senha:
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{
                                        width: '100%', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '50px', padding: '16px 24px', color: 'white', fontSize: '1rem', outline: 'none', fontWeight: '500'
                                    }}
                                />
                            </div>

                            {/* Confirm Password */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500', marginBottom: '8px', marginLeft: '16px' }}>
                                    Confirmar Nova Senha:
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{
                                        width: '100%', background: 'rgba(255, 255, 255, 0.08)',
                                        border: `1px solid ${confirmPassword && newPassword !== confirmPassword ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                                        borderRadius: '50px', padding: '16px 24px', color: 'white', fontSize: '1rem', outline: 'none', fontWeight: '500'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading || !passValid || !newPassword || newPassword !== confirmPassword}
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none',
                                        padding: '16px', borderRadius: '50px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', width: '100%',
                                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)', opacity: (loading || !passValid || !newPassword || newPassword !== confirmPassword) ? 0.5 : 1
                                    }}>
                                    Atualizar Senha
                                </motion.button>

                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => setView('profile')}
                                    style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '16px', borderRadius: '50px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', width: '100%' }}>
                                    Cancelar
                                </motion.button>
                            </div>
                        </form>
                    )}

                    <button onClick={resetState} style={{ position: 'absolute', top: -40, right: 0, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '300', padding: '0' }}>
                        Fechar
                    </button>
                </motion.div>
            </div>
        </>
    );
};

export default UserProfileModal;
