import React from 'react';
import { useRouter } from '../../router.jsx';
import { useApp } from '../../context/AppContext.jsx';
import {
  LayoutDashboard,
  SearchCode,
  ShieldAlert,
  Activity,
  Gauge,
  Bell,
  Database,
  X,
  Shield,
  Server
} from './Icons.jsx';
import { formatNumber } from '../../utils/formatters.js';
import { DEMO_SYSTEM_STATUS } from '../../data/mockSecurityData.js';

export default function Sidebar() {
  const { currentPath, navigate } = useRouter();
  const { mobileMenuOpen, setMobileMenuOpen, currentBlock } = useApp();

  const navItems = [
    { label: 'Overview', path: '/overview', icon: LayoutDashboard },
    { label: 'Scan Contract', path: '/scan', icon: SearchCode },
    { label: 'Static Findings', path: '/findings', icon: ShieldAlert },
    { label: 'Runtime Monitor', path: '/runtime', icon: Activity },
    { label: 'Risk Assessment', path: '/risk', icon: Gauge },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Contract Registry', path: '/registry', icon: Database }
  ];

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 45
          }}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" style={{ cursor: 'pointer' }} onClick={() => handleNavClick('/overview')}>
          <div className="brand-glyph">
            <Shield size={16} />
          </div>
          <div className="brand-text">
            <span className="brand-name">PRISM</span>
            <span className="brand-sub">SECOPS CONSOLE</span>
          </div>

          {mobileMenuOpen && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', padding: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(false);
              }}
              aria-label="Close navigation"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === '/overview' && currentPath === '/');
            return (
              <button
                key={item.path}
                type="button"
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
                id={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Infrastructure Health Section (Subordinate, Technical) */}
        <div className="sidebar-infra-health">
          <div className="sidebar-section-title">
            <Server size={11} color="var(--accent-teal)" />
            <span>Infra Health</span>
          </div>
          <div className="infra-health-list">
            {DEMO_SYSTEM_STATUS.map((sys, idx) => (
              <div key={idx} className="infra-health-item">
                <span className="infra-label">{sys.component}</span>
                <span className="infra-status">
                  <span className="status-dot healthy"></span>
                  <span>{sys.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Node Status & Head */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>NODE STATUS</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              <span className="status-dot healthy"></span>
              SYNCED
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>HEAD BLOCK</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>#{formatNumber(currentBlock)}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
