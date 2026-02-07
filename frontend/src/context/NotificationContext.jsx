import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastReadTime, setLastReadTime] = useState(localStorage.getItem('chatLastReadTime') || new Date().toISOString());
    const [messages, setMessages] = useState([]);

    // Poll for messages independently to drive notifications
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await fetch('/api/chat');
                if (res.ok) {
                    const json = await res.json();
                    if (Array.isArray(json)) {
                        setMessages(json);

                        // Calculate unread
                        // Assuming messages have a 'timestamp' or we just count new ones since last open
                        // For simplicity in this demo, let's assume any message NOT from 'currentUser' and newer than 'lastReadTime' is unread.
                        // However, we don't have timestamps in the simple list shown in Chat.jsx (it has time_display strings).
                        // Let's use array length or a simple flag for now. 

                        // Revised Logic based on simplicity:
                        // If we are NOT in Chat view, and new messages arrive -> increment unread or just set hasUnread.
                        // But to know "new", we need to know "old".

                        // Simple approach: Store count of messages when last read.
                        const lastReadCount = parseInt(localStorage.getItem('chatLastReadCount') || '0');
                        const currentCount = json.length;

                        // We only care if meaningful new messages arrived (e.g. from others). 
                        // But strictly user asked: "whenever there is a message".

                        if (currentCount > lastReadCount) {
                            setUnreadCount(currentCount - lastReadCount);
                        } else {
                            setUnreadCount(0);
                        }
                    }
                }
            } catch (err) {
                console.error("Error polling notifications:", err);
            }
        };

        const interval = setInterval(fetchMessages, 3000); // Check every 3s
        fetchMessages(); // Initial check

        return () => clearInterval(interval);
    }, [lastReadTime]);

    const markAsRead = () => {
        setUnreadCount(0);
        // We will update the "last read count" to the current message count
        // effectively clearing the notification
        // We need the current messages length for this.
        // We can expose a function to do this.
    };

    // Actually, markAsRead needs to know the current total count to fetch it.
    // Let's expose a method that Chat.jsx calls with the current count.
    const updateReadStatus = (totalMessages) => {
        localStorage.setItem('chatLastReadCount', totalMessages.toString());
        setUnreadCount(0);
    };

    return (
        <NotificationContext.Provider value={{ unreadCount, updateReadStatus, messages }}>
            {children}
        </NotificationContext.Provider>
    );
};
