import {
    LayoutDashboard,
    PieChart,
    Newspaper,
    Wallet,
    LogOut,
    Calculator,
    Layers,
    HelpCircle,
    X,
    Home,
    TrendingUp,
    Landmark,
    MessageSquare,
    BookOpen,
    Calendar,
    Users
} from 'lucide-react';
import './Sidebar.css';
import { useNotification } from '../context/NotificationContext';

import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose, onNavigate, currentView }) {
    const { unreadCount } = useNotification();
    const { user } = useAuth();

    const menuItems = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'renda-variavel', label: 'Renda Variável', icon: TrendingUp },
        { id: 'renda-fixa', label: 'Renda Fixa', icon: Landmark },
        { id: 'portfolio', label: 'Divisão de Portfólio', icon: PieChart },
        { id: 'calculator', label: 'Simulador Renda Fixa', icon: Calculator },
        { id: 'options_calculator', label: 'Simulador Opções', icon: Layers },
        { id: 'strategies', label: 'Estratégias Opções', icon: BookOpen },
        { id: 'news', label: 'Notícias', icon: Newspaper },
        { id: 'calendar', label: 'Calendário', icon: Calendar },
        { id: 'chat', label: 'Alertas', icon: MessageSquare },
        { id: 'admin-leads', label: 'CRM Leads', icon: Users },
        { id: 'support', label: 'Suporte', icon: HelpCircle },
    ].filter(item => item.id !== 'admin-leads' || user?.email === 'raphaelfurlan28@gmail.com');

    return (
        <>
            {/* Overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            ></div>

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <header className="sidebar-header">
                    <h3>Menu</h3>
                    <button className="close-menu-btn" onClick={onClose}>
                        <X size={24} color="var(--text-primary)" />
                    </button>
                </header>

                <nav className="sidebar-nav">
                    {menuItems.map(item => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                                onClick={() => {
                                    onNavigate(item.id);
                                    onClose();
                                }}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                                {item.id === 'chat' && unreadCount > 0 && (
                                    <span style={{
                                        marginLeft: 'auto',
                                        background: '#ef4444',
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        padding: '2px 6px',
                                        borderRadius: '999px',
                                        minWidth: '18px',
                                        textAlign: 'center'
                                    }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <p>WiseFinan v2.0</p>
                </div>
            </aside>
        </>
    );
}
