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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in
                // We can construct our user object or just use firebaseUser
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                    photo: firebaseUser.photoURL,
                    accessToken: firebaseUser.accessToken
                });
            } else {
                // User is signed out
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        setAuthError(null);
        try {
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update profile with name
            if (name) {
                await updateProfile(userCredential.user, {
                    displayName: name
                });
                // Update local state immediately to reflect name
                setUser(prev => ({ ...prev, name: name }));
            }
            return true;
        } catch (error) {
            console.error("Registration Error:", error);
            handleAuthError(error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null); // Explicit clear
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

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
