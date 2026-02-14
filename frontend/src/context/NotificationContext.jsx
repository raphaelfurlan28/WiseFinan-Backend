import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/firebaseConfig'; // Import Firestore
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationPermission, setNotificationPermission] = useState('default');
    const [lastReadTimestamp, setLastReadTimestamp] = useState(() => {
        const stored = localStorage.getItem('chatLastReadTimestamp');
        return stored ? new Date(stored) : new Date(0);
    });
    const [messages, setMessages] = useState([]);
    const latestUnreadCount = useRef(0);

    // Check initial notification permission
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Update the app badge
    const updateAppBadge = useCallback((count) => {
        // Check permission first
        if ('Notification' in window && Notification.permission !== 'granted') {
            return;
        }
        if ('setAppBadge' in navigator) {
            if (count > 0) {
                navigator.setAppBadge(count).catch(() => { });
            } else {
                navigator.clearAppBadge().catch(() => { });
            }
        }
    }, []);

    // Request notification permission (must be called from user interaction)
    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) return 'denied';

        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            // After granting, immediately set badge with current unread count
            if (permission === 'granted' && latestUnreadCount.current > 0) {
                if ('setAppBadge' in navigator) {
                    navigator.setAppBadge(latestUnreadCount.current).catch(() => { });
                }

                // Use ServiceWorker for Notifications (Better for Android)
                if (navigator.serviceWorker && (await navigator.serviceWorker.getRegistration())) {
                    const reg = await navigator.serviceWorker.getRegistration();
                    reg.showNotification('WiseFinan - Alertas', {
                        body: `Você tem ${latestUnreadCount.current} alerta(s) não lido(s).`,
                        icon: '/icon-v2-192.png',
                        badge: '/icon-v2-192.png',
                        vibrate: [200, 100, 200]
                    });
                } else {
                    // Fallback
                    new Notification('WiseFinan - Alertas', {
                        body: `Você tem ${latestUnreadCount.current} alerta(s) não lido(s).`,
                        icon: '/icon-v2-192.png',
                        badge: '/icon-v2-192.png'
                    });
                }
            }
            return permission;
        } catch (err) {
            console.error("Error requesting notification permission:", err);
            return 'denied';
        }
    }, []);

    // Real-time listener for messages to drive notifications
    useEffect(() => {
        const q = query(collection(db, "chat_messages"), orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach((doc) => {
                msgs.push({ id: doc.id, ...doc.data() });
            });
            setMessages(msgs);

            // Calculate unread based on TIMESTAMP
            let count = 0;
            msgs.forEach(msg => {
                if (msg.timestamp) {
                    const msgDate = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                    if (msgDate > lastReadTimestamp) {
                        count++;
                    }
                }
            });

            setUnreadCount(count);
            latestUnreadCount.current = count;
            updateAppBadge(count);

        }, (error) => {
            console.error("Error listening to chat notifications:", error);
        });

        return () => unsubscribe();
    }, [lastReadTimestamp, updateAppBadge]);

    // Called by Chat.jsx when user opens/views chat
    const updateReadStatus = () => {
        const now = new Date();
        localStorage.setItem('chatLastReadTimestamp', now.toISOString());
        setLastReadTimestamp(now);
        setUnreadCount(0);
        latestUnreadCount.current = 0;
        updateAppBadge(0);
    };

    return (
        <NotificationContext.Provider value={{
            unreadCount,
            updateReadStatus,
            messages,
            notificationPermission,
            requestNotificationPermission
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
