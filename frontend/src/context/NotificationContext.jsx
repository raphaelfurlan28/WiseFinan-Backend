import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebaseConfig'; // Import Firestore
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationPermission, setNotificationPermission] = useState('default');
    // Track the timestamp of when the user last opened the chat
    const [lastReadTimestamp, setLastReadTimestamp] = useState(() => {
        const stored = localStorage.getItem('chatLastReadTimestamp');
        // Default to very old date if not set (Epoch)
        return stored ? new Date(stored) : new Date(0);
    });
    const [messages, setMessages] = useState([]);

    // Check initial notification permission
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Request notification permission (must be called from user interaction)
    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) return 'denied';

        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            return permission;
        } catch (err) {
            console.error("Error requesting notification permission:", err);
            return 'denied';
        }
    }, []);

    // Update the app badge
    const updateAppBadge = useCallback((count) => {
        if ('setAppBadge' in navigator) {
            if (count > 0) {
                navigator.setAppBadge(count).catch(() => { });
            } else {
                navigator.clearAppBadge().catch(() => { });
            }
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
