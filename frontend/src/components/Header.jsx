import React, { useState } from 'react';
import { Menu, User, Bell } from 'lucide-react';
import './Header.css';
import { useNotification } from '../context/NotificationContext';

export default function Header({ onToggleSidebar, user, onProfileClick }) {
    const { unreadCount } = useNotification();
    const [imgError, setImgError] = useState(false);

    return (
        <header className="app-header">
            <div className="header-left">
                <button className="menu-btn" onClick={onToggleSidebar}>
                    <Menu size={24} color="var(--text-primary)" />
                </button>
                {/* Text Next to Menu - Login Style */}
                <span style={{
                    marginLeft: '16px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '1.6rem',
                    fontWeight: '800',
                    background: 'linear-gradient(to right, #4ade80, #34d399, #22d3ee)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-1px',
                    textShadow: '0 10px 20px rgba(74, 222, 128, 0.2)'
                }}>
                    WiseFinan
                </span>
            </div>

            <div className="header-right">
                <button className="icon-btn">
                    <Bell size={20} color="var(--text-primary)" />
                    {unreadCount > 0 && (
                        <span className="notif-badge" style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1
                        }}>
                            {unreadCount}
                        </span>
                    )}
                </button>
                <div className="user-profile" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
                    <div className="user-info">
                        <span className="user-name">{user.name.split(' ')[0]}</span>
                    </div>
                    <div className="avatar-container">
                        {user.photo && !imgError ? (
                            <img
                                src={user.photo}
                                alt={user.name}
                                referrerPolicy="no-referrer"
                                onError={() => setImgError(true)}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <User size={20} color="#fff" />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
