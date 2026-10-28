import React from 'react';
import { useRouter } from './router.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/common/Sidebar.jsx';
import TopBar from './components/common/TopBar.jsx';
import Footer from './components/common/Footer.jsx';

import Overview from './pages/Overview.jsx';
import ScanContract from './pages/ScanContract.jsx';
import StaticFindings from './pages/StaticFindings.jsx';
import RuntimeMonitor from './pages/RuntimeMonitor.jsx';
import RiskAssessment from './pages/RiskAssessment.jsx';
import Alerts from './pages/Alerts.jsx';
import ContractRegistry from './pages/ContractRegistry.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsConditions from './pages/TermsConditions.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';


const PUBLIC_PATHS = ['/login', '/register', '/privacy', '/terms'];

export default function App() {
  const { currentPath, navigate } = useRouter();
  const { token, authLoading } = useAuth();
  const basePath = currentPath.split('?')[0];
  const isPublicPath = PUBLIC_PATHS.includes(basePath);
  // Wait for the /api/auth/me check (on refresh) before deciding anything,
  // so a valid session doesn't flash the login page for a moment.
  if (authLoading) return null;

  // Not logged in and trying to reach a gated page -> force to /login.
  if (!token && !isPublicPath) {
    navigate('/login');
    return null;
  }

  // Already logged in and sitting on /login or /register -> send into the app.
  // Everything past this point (Overview and the rest of the dashboard) is
  // still running on mock/demo data exactly as before — only the login gate
  // itself is real, since that's the only backend module built so far.
  if (token && (basePath === '/login' || basePath === '/register')) {
    navigate('/overview');
    return null;
  }

  // Dedicated focused authentication views
  if (basePath === '/login') {
    return <Login />;
  }

  if (basePath === '/register') {
    return <Register />;
  }

  const renderCurrentPage = () => {
    switch (basePath) {
      case '/':
      case '/overview':
        return <Overview />;
      case '/scan':
        return <ScanContract />;
      case '/findings':
        return <StaticFindings />;
      case '/runtime':
        return <RuntimeMonitor />;
      case '/risk':
        return <RiskAssessment />;
      case '/alerts':
        return <Alerts />;
      case '/registry':
        return <ContractRegistry />;
      case '/privacy':
        return <PrivacyPolicy />;
      case '/terms':
        return <TermsConditions />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="page-container" id="main-content">
          {renderCurrentPage()}
        </main>
        <Footer />
      </div>
    </div>
  );
}
