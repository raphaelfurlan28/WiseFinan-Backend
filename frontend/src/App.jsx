
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ModernLoader from './components/ModernLoader';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StockList from './components/StockList';
import StockDetail from './components/StockDetail';
import Home from './components/Home';
import FixedIncome from './components/FixedIncome';
import Portfolio from './components/Portfolio';
import Noticias from './components/Noticias';
import Calculator from './components/Calculator';
import OptionsCalculator from './components/OptionsCalculator';
import Support from './components/Support';
import Chat from './components/Chat';
import Strategies from './components/Strategies';
import Calendario from './components/Calendario';
import LeadBoard from './components/LeadBoard';
import SplashScreen from './components/SplashScreen';
import UserProfileModal from './components/UserProfileModal';
import LandingPage from './components/LandingPage/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './styles/main.css';
import './components/Dashboard.css'; // Global Dashboard Styles

// Replace with your actual Google Client ID
// Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "477556815504-12btpjhrd9cr5qc86aqp2e7792oemvqj.apps.googleusercontent.com";

import { useSwipeBack } from './hooks/useSwipeBack';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  // History Stack for Navigation
  const [history, setHistory] = useState([]);

  // Sync with window.history for Android Back Button
  useEffect(() => {
    // Push initial state
    window.history.replaceState({ view: 'home' }, '');

    const handlePopState = (event) => {
      // If user presses back button (or swipes back on Android)
      handleBack();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [history, selectedStock]); // Re-bind when history/modal changes

  const handleBack = () => {
    // Priority 1: Close Modal
    if (selectedStock) {
      setSelectedStock(null);
      return;
    }

    // Priority 2: Pop History
    if (history.length > 0) {
      const previousView = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1)); // Remove last
      setCurrentView(previousView);
    }
  };

  // Custom Hook for Swipe Back (Internal App Swipe)
  useSwipeBack(handleBack);

  // Global Loading
  if (loading) {
    return <ModernLoader text="Carregando..." />;
  }

  // Splash Screen / Login / Landing
  if (!user) {
    if (showLogin) {
      return <SplashScreen onBack={() => setShowLogin(false)} />;
    }
    return <LandingPage onLoginClick={() => setShowLogin(true)} />;
  }

  const handleNavigate = (viewId) => {
    if (viewId === currentView) return;

    // Push to window history so back button works
    window.history.pushState({ view: viewId }, '');

    // Push current view to history before changing
    setHistory(prev => [...prev, currentView]);
    setCurrentView(viewId);
    setSelectedStock(null);
  };

  const renderContent = () => {
    if (selectedStock) {
      return <StockDetail stock={selectedStock} onBack={() => setSelectedStock(null)} />;
    }

    switch (currentView) {
      case 'home':
        return <Home onNavigate={handleNavigate} onStockClick={setSelectedStock} />;
      case 'renda-variavel':
        return <StockList onSelectStock={setSelectedStock} />;
      case 'renda-fixa':
        return <FixedIncome />;
      case 'portfolio':
        return <Portfolio />;
      case 'news':
        return <Noticias />;
      case 'calculator':
        return <Calculator />;
      case 'options_calculator':
        return <OptionsCalculator />;
      case 'chat':
        return <Chat />;
      case 'strategies':
        return <Strategies />;
      case 'calendar':
        return <Calendario />;
      case 'admin-leads':
        if (user?.email === 'raphaelfurlan28@gmail.com') {
          return <LeadBoard />;
        }
        return <Home onNavigate={handleNavigate} onStockClick={setSelectedStock} />;
      case 'support':
        return <Support />;

      default:
        return <Home onNavigate={handleNavigate} onStockClick={setSelectedStock} />;
    }
  };

  return (
    <div className="app-container">
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <Header
        user={user}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onProfileClick={() => setIsProfileModalOpen(true)}
        onNavigate={handleNavigate}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleNavigate}
        currentView={currentView}
      />

      <main className="main-content dashboard-container">
        {renderContent()}
      </main>
    </div>
  );
};

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: 'white', background: '#0f172a', height: '100vh' }}>
          <h1>Algo deu errado.</h1>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', color: 'black' }}>
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <GoogleOAuthProvider clientId="477556815504-12btpjhrd9cr5qc86aqp2e7792oemvqj.apps.googleusercontent.com">
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </NotificationProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
