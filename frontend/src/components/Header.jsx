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
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px', gap: '12px' }}>
                    <img src="/logo-app.svg" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
                    <span style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: '#e2e8f0',
                        letterSpacing: '-0.5px'
                    }}>
                        WiseFinan
                    </span>
                </div>
            </div>

            <div className="header-right">
                <button className="icon-btn">
                    <Bell size={20} color="var(--text-primary)" />
                    {unreadCount > 0 && (
                        <span className="notif-badge" style={{
                            position: 'absolute', top: -5, right: -5,
                            background: '#ef4444', color: 'white',
                            fontSize: '0.65rem', padding: '2px 5px', borderRadius: '10px',
                            minWidth: '16px', textAlign: 'center'
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
