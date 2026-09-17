import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Menu } from 'lucide-react';
import { formatNumber } from '../../utils/formatters.js';

export default function TopBar() {
  const {
    network,
    setNetwork,
    currentBlock,
    connectionStatus,
    isDemoMode,
    mobileMenuOpen,
    setMobileMenuOpen
  } = useApp();

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <Menu size={14} />
        </button>

        <div className="topbar-meta-item">
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="form-select"
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              height: '24px',
              width: 'auto',
              fontFamily: 'var(--font-mono)'
            }}
            aria-label="Select Blockchain Network"
          >
            <option value="Ethereum Mainnet">Ethereum Mainnet</option>
            <option value="Arbitrum One">Arbitrum One</option>
            <option value="Optimism">Optimism</option>
          </select>
        </div>

        <div className="topbar-meta-item mono">
          <span>Head Block</span>
          <strong>#{formatNumber(currentBlock)}</strong>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-meta-item">
          <span className="status-dot healthy"></span>
          <span>{connectionStatus}</span>
        </div>

        {isDemoMode && (
          <div className="demo-pill" title="Synthetic protocol demonstration records active. No live transactions executed.">
            <span>DEMO DATA</span>
          </div>
        )}
      </div>
    </header>
  );
}
