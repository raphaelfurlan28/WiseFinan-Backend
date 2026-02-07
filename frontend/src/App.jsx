
import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StockList from './components/StockList';
import StockDetail from './components/StockDetail';
import Home from './components/Home';
import Updates from './components/Updates';
import FixedIncome from './components/FixedIncome';
import Portfolio from './components/Portfolio';
import Noticias from './components/Noticias';
import Calculator from './components/Calculator';
import OptionsCalculator from './components/OptionsCalculator';
import Support from './components/Support';
import Chat from './components/Chat';
import Strategies from './components/Strategies';
import SplashScreen from './components/SplashScreen';
import UserProfileModal from './components/UserProfileModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './styles/main.css';

// Replace with your actual Google Client ID
// Replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "477556815504-12btpjhrd9cr5qc86aqp2e7792oemvqj.apps.googleusercontent.com";

const AppContent = () => {
  const { user, loading } = useAuth();
  const [selectedStock, setSelectedStock] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');

  // Loading State
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Carregando...
      </div>
    );
  }

  // Splash Screen / Login
  if (!user) {
    return <SplashScreen />;
  }

  const handleNavigate = (viewId) => {
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
      case 'support':
        return <Support />;
      case 'updates':
        return <Updates />;
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
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleNavigate}
        currentView={currentView}
      />

      <main className="main-content">
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
