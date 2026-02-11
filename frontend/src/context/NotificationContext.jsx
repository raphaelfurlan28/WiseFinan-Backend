import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebaseConfig'; // Import Firestore
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    // Track the timestamp of when the user last opened the chat
    const [lastReadTimestamp, setLastReadTimestamp] = useState(() => {
        const stored = localStorage.getItem('chatLastReadTimestamp');
        // Default to very old date if not set (Epoch)
        return stored ? new Date(stored) : new Date(0);
    });
    const [messages, setMessages] = useState([]);

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
            // Count messages where timestamp > lastReadTimestamp
            let count = 0;
            msgs.forEach(msg => {
                // msg.timestamp is Firestore Timestamp (seconds, nanoseconds)
                if (msg.timestamp) {
                    // Handle potential Date/Timestamp variance
                    const msgDate = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
                    if (msgDate > lastReadTimestamp) {
                        count++;
                    }
                }
            });


            setUnreadCount(count);

            // Update App Badge
            if ('setAppBadge' in navigator) {
                if (count > 0) {
                    navigator.setAppBadge(count).catch((error) => {
                        // Fail silently, not critical
                    });
                } else {
                    navigator.clearAppBadge().catch(() => { });
                }
            }

        }, (error) => {
            console.error("Error listening to chat notifications:", error);
        });

        return () => unsubscribe();
    }, [lastReadTimestamp]);

    // Called by Chat.jsx when user opens/views chat
    // No arguments needed now, we just use current time
    const updateReadStatus = () => {
        const now = new Date();
        localStorage.setItem('chatLastReadTimestamp', now.toISOString());
        setLastReadTimestamp(now);
        setUnreadCount(0);

        if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch(() => { });
        }
    };

    return (
        <NotificationContext.Provider value={{ unreadCount, updateReadStatus, messages }}>
            {children}
        </NotificationContext.Provider>
    );
};
