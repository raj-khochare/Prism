import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { Menu } from './Icons.jsx';
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
          <Menu size={16} />
        </button>

        <div className="topbar-meta-item">
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Network:</span>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="form-select"
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              height: '28px',
              width: 'auto',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600
            }}
            aria-label="Select Blockchain Network"
          >
            <option value="Ethereum Mainnet">Ethereum Mainnet</option>
            <option value="Arbitrum One">Arbitrum One</option>
            <option value="Optimism">Optimism</option>
          </select>
        </div>

        <div className="topbar-meta-item mono">
          <span style={{ color: 'var(--text-muted)' }}>Block</span>
          <strong style={{ color: 'var(--text-primary)' }}>#{formatNumber(currentBlock)}</strong>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-meta-item" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          <span className="status-dot healthy"></span>
          <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>{connectionStatus.toUpperCase()}</span>
        </div>

        {isDemoMode && (
          <div className="demo-pill" title="Synthetic protocol demonstration records active. No live transactions executed.">
            <span>DEMO MODE</span>
          </div>
        )}
      </div>
    </header>
  );
}
