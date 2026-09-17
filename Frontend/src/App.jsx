import React from 'react';
import { useRouter } from './router.jsx';
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

export default function App() {
  const { currentPath } = useRouter();

  const renderCurrentPage = () => {
    const basePath = currentPath.split('?')[0];

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
