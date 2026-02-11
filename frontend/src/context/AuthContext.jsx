import React, { createContext, useState, useContext, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";
import { auth } from '../services/firebaseConfig';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

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

    useEffect(() => {
        let heartbeatInterval;

        const manageSession = async (currentUser) => {
            if (!currentUser) return;

            // 1. Check for existing local token
            let token = localStorage.getItem('session_token');
            console.log("[Auth] Checking session. Existing token:", token);

            try {
                if (token) {
                    // Validate existing token (Page Reload scenario)
                    const response = await axios.post('/api/auth/validate-session', {
                        email: currentUser.email,
                        token: token
                    });

                    if (!response.data.valid) {
                        console.warn("[Auth] Token invalid on load. logging out.");
                        // If the server says it's invalid, it IS invalid.
                        await logout(true);
                        return;
                    } else {
                        console.log("[Auth] Token valid on load.");
                    }
                } else {
                    // No token (New Login scenario)
                    console.log("[Auth] No token, registering new session...");
                    const response = await axios.post('/api/auth/register-session', {
                        email: currentUser.email
                    });
                    token = response.data.token;
                    localStorage.setItem('session_token', token);
                    console.log("[Auth] New session registered:", token);
                }

                // 2. Start Heartbeat ONLY if we have a valid token
                if (heartbeatInterval) clearInterval(heartbeatInterval);

                heartbeatInterval = setInterval(async () => {
                    const currentToken = localStorage.getItem('session_token');
                    // Use the 'token' variable from closure as fallback or currentToken
                    const tokenToSend = currentToken || token;

                    if (currentUser && tokenToSend) {
                        try {
                            // console.log("[Auth] Sending heartbeat..."); 
                            const res = await axios.post('/api/auth/validate-session', {
                                email: currentUser.email,
                                token: tokenToSend
                            });

                            if (!res.data.valid) {
                                console.warn("[Auth] Heartbeat failed. Session invalid.");
                                clearInterval(heartbeatInterval);
                                alert("Sessão encerrada. Sua conta foi conectada em outro dispositivo.");
                                await logout(true);
                            }
                        } catch (err) {
                            console.error("[Auth] Heartbeat error:", err);
                        }
                    }
                }, 30000); // 30 seconds

            } catch (error) {
                console.error("[Auth] Session management error:", error);
                // If we can't register/validate, maybe we should logout? 
                // For now, let's just log it to avoid locking user out due to network glitch
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
                localStorage.removeItem('session_token'); // Clear on firebase auto-logout
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
            // Clear any old token to force new session registration
            localStorage.removeItem('session_token');
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("Login Error:", error);
            handleAuthError(error);
            return false;
        }
    };

    const register = async (email, password, name) => {
        setAuthError(null);
        try {
            localStorage.removeItem('session_token');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (name) {
                await updateProfile(userCredential.user, { displayName: name });
                setUser(prev => ({ ...prev, name: name }));
            }
            return true;
        } catch (error) {
            console.error("Registration Error:", error);
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
                window.location.href = "/"; // Redirect if forced
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

            // Sync with backend if needed (optional based on user request "link com firebase", usually firebase is enough)
            // But if we want to keep the "Sheet" updated as a backup:
            try {
                await axios.post('/api/user/update', {
                    email: user.email,
                    name: newName,
                    photo: newPhoto
                });
            } catch (err) {
                console.warn("Backend sync failed, but Firebase updated.", err);
            }

            // Update local state
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

    return (
        <AuthContext.Provider value={{ user, loading, authError, login, register, logout, updateUserProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
