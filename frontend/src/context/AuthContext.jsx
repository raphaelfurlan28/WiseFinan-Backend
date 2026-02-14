import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    reauthenticateWithCredential,
    EmailAuthProvider,
    updatePassword
} from "firebase/auth";
import { auth } from '../services/firebaseConfig';
import { getApiUrl } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Inactivity timeout: 15 minutes in ms
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// Generate or retrieve a persistent device identifier
const getDeviceId = () => {
    let deviceId = localStorage.getItem('wisefinan_device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID ? crypto.randomUUID() :
            'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        localStorage.setItem('wisefinan_device_id', deviceId);
        console.log('[Auth] New device_id generated:', deviceId.slice(-8));
    }
    return deviceId;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // Ref to track if the current auth event came from an explicit login/register
    const justLoggedInRef = useRef(false);
    // Ref to track last user activity timestamp
    const lastActivityRef = useRef(Date.now());

    const handleAuthError = (error) => {
        let msg = "Ocorreu um erro.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            msg = "Email ou senha incorretos.";
        } else if (error.code === 'auth/email-already-in-use') {
            msg = "Este email já está em uso.";
        } else if (error.code === 'auth/weak-password') {
            msg = "A senha deve ter pelo menos 6 caracteres.";
        } else if (error.code === 'auth/invalid-email') {
            msg = "Email inválido.";
        } else {
            msg = error.message;
        }
        setAuthError(msg);
    };

    // Update last activity on any user interaction
    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    // Register activity listeners
    useEffect(() => {
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(evt => window.addEventListener(evt, resetActivity, { passive: true }));
        return () => {
            events.forEach(evt => window.removeEventListener(evt, resetActivity));
        };
    }, [resetActivity]);

    useEffect(() => {
        let heartbeatInterval;

        const validateWithRetry = async (currentUser, tokenObj, retries = 3) => {
            try {
                const localToken = localStorage.getItem('session_token');
                const token = tokenObj || localToken;

                if (!token) return { valid: false, reason: 'no_token_locally' };

                const response = await fetch(getApiUrl('/api/auth/validate-session'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentUser.email, token: token, device_id: getDeviceId() })
                });
                return await response.json();
            } catch (err) {
                console.error("[Auth] Validation error:", err);
                if (retries > 0) {
                    console.log(`[Auth] Retrying validation... (${retries} left)`);
                    await new Promise(r => setTimeout(r, 1000));
                    return validateWithRetry(currentUser, tokenObj, retries - 1);
                }
                // Network error — don't logout immediately
                return { valid: true, warning: 'network_error_assumed_valid' };
            }
        };

        const registerNewSession = async (email) => {
            try {
                const response = await fetch(getApiUrl('/api/auth/register-session'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, device_id: getDeviceId() })
                });
                const data = await response.json();

                if (data.error === 'device_not_authorized') {
                    alert('Este dispositivo não está autorizado para esta conta. Contacte o administrador.');
                    await logout(true);
                    return null;
                }

                const token = data.token;
                localStorage.setItem('session_token', token);
                console.log('[Auth] New session registered:', token.slice(-8));
                return token;
            } catch (err) {
                console.error('[Auth] Failed to register session:', err);
                return null;
            }
        };

        const manageSession = async (currentUser) => {
            if (!currentUser) return;

            let token = localStorage.getItem('session_token');

            try {
                if (justLoggedInRef.current) {
                    // Explicit login — always force a new session (invalidates other devices)
                    justLoggedInRef.current = false;
                    console.log("[Auth] Explicit login detected, forcing new session...");
                    token = await registerNewSession(currentUser.email);
                    if (!token) return;
                } else if (token) {
                    // Page reload — validate existing token
                    console.log("[Auth] Page reload, validating existing token...");
                    const validation = await validateWithRetry(currentUser, token);

                    if (!validation.valid) {
                        console.warn("[Auth] Token invalid on load:", validation.reason);
                        if (validation.reason === 'token_mismatch' || validation.reason === 'no_session' || validation.reason === 'inactivity_timeout' || validation.reason === 'device_not_authorized') {
                            const msg = validation.reason === 'inactivity_timeout'
                                ? "Sessão expirada por inatividade. Faça login novamente."
                                : validation.reason === 'device_not_authorized'
                                    ? "Este dispositivo não está autorizado para esta conta."
                                    : "Sessão encerrada. Sua conta foi conectada em outro dispositivo.";
                            alert(msg);
                            await logout(true);
                            return;
                        }
                    } else {
                        console.log("[Auth] Session valid on reload.");
                    }
                } else {
                    // No token at all (e.g. first visit, cleared storage) — register new
                    console.log("[Auth] No token found, registering new session...");
                    token = await registerNewSession(currentUser.email);
                    if (!token) return;
                }

                // Reset activity timestamp on session start
                lastActivityRef.current = Date.now();

                // Start Heartbeat
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                const currentSessionToken = token;

                heartbeatInterval = setInterval(async () => {
                    if (!currentUser || !currentSessionToken) return;

                    // Client-side inactivity check
                    const idleTime = Date.now() - lastActivityRef.current;
                    /* 
                    // REMOVED AUTO-LOGOUT PER USER REQUEST
                    if (idleTime > INACTIVITY_TIMEOUT_MS) {
                        console.warn(`[Auth] Client idle for ${Math.round(idleTime / 1000)}s, forcing logout.`);
                        clearInterval(heartbeatInterval);
                        alert("Sessão expirada por inatividade. Faça login novamente.");
                        await logout(true);
                        return;
                    } 
                    */

                    // Server-side validation (also updates last_activity if user is active)
                    const validation = await validateWithRetry(currentUser, currentSessionToken, 2);

                    if (!validation.valid) {
                        console.warn("[Auth] Heartbeat failed:", validation.reason);
                        if (validation.reason === 'token_mismatch' || validation.reason === 'no_session' || validation.reason === 'inactivity_timeout' || validation.reason === 'device_not_authorized') {
                            clearInterval(heartbeatInterval);
                            const msg = validation.reason === 'inactivity_timeout'
                                ? "Sessão expirada por inatividade. Faça login novamente."
                                : validation.reason === 'device_not_authorized'
                                    ? "Este dispositivo não está autorizado para esta conta."
                                    : "Sessão encerrada. Sua conta foi conectada em outro dispositivo.";
                            alert(msg);
                            await logout(true);
                        }
                    }
                }, 10000); // 10s heartbeat

            } catch (error) {
                console.error("[Auth] Session management error:", error);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const u = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                    photo: firebaseUser.photoURL,
                    accessToken: firebaseUser.accessToken
                };
                setUser(u);
                manageSession(u);
            } else {
                setUser(null);
                localStorage.removeItem('session_token');
            }
            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, []);

    const login = async (email, password) => {
        setAuthError(null);
        try {
            // Clear old token and flag that this is an explicit login
            localStorage.removeItem('session_token');
            justLoggedInRef.current = true;
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("Login Error:", error);
            justLoggedInRef.current = false;
            handleAuthError(error);
            return false;
        }
    };

    const register = async (email, password, name) => {
        setAuthError(null);
        try {
            localStorage.removeItem('session_token');
            justLoggedInRef.current = true;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) {
                await updateProfile(userCredential.user, { displayName: name });
                setUser(prev => ({ ...prev, name: name }));
            }
            return true;
        } catch (error) {
            console.error("Registration Error:", error);
            justLoggedInRef.current = false;
            handleAuthError(error);
            return false;
        }
    };

    const logout = async (forced = false) => {
        try {
            await signOut(auth);
            setUser(null);
            localStorage.removeItem('session_token');
            if (forced) {
                window.location.href = "/";
            }
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const updateUserProfile = async (newName, newPhoto) => {
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, {
                displayName: newName,
                photoURL: newPhoto
            });

            try {
                await fetch(getApiUrl('/api/user/update'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email, name: newName, photo: newPhoto })
                });
            } catch (err) {
                console.warn("Backend sync failed, but Firebase updated.", err);
            }

            setUser(prev => ({
                ...prev,
                name: newName,
                photo: newPhoto
            }));
            return true;
        } catch (error) {
            console.error("Update Error:", error);
            return false;
        }
    };

    const updateUserPassword = async (currentPassword, newPassword) => {
        if (!auth.currentUser) return { success: false, error: 'Usuário não autenticado.' };
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
            return { success: true };
        } catch (error) {
            console.error("Password Update Error:", error);
            handleAuthError(error);
            return { success: false, error: authError || "Erro ao atualizar senha." };
        }
    };

    const verifyPassword = async (password) => {
        if (!auth.currentUser) return false;
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
            await reauthenticateWithCredential(auth.currentUser, credential);
            return true;
        } catch (error) {
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, loading, authError, login, register, logout, updateUserProfile,
            updateUserPassword, verifyPassword
        }}>
            {children}
        </AuthContext.Provider>
    );
};
