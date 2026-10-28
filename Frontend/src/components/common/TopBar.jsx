import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../../router.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Menu, User, LogOut, ChevronDown } from './Icons.jsx';
import { formatNumber } from '../../utils/formatters.js';

function initialsFor(user) {
  const source = user?.displayName || user?.username || '';
  if (!source) return '?';
  const parts = source.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ProfileMenu() {
  const { navigate } = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="profile-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className="profile-badge"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="profile-avatar">{initialsFor(user)}</span>
        <span className="profile-name">{user.displayName || user.username}</span>
        {user.role && <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', padding: '1px 5px', border: '1px solid var(--border-default)', borderRadius: '3px', color: user.role === 'REVIEWER' ? 'var(--accent-sand)' : 'var(--accent-teal)' }}>{user.role}</span>}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-header">
            <span className="profile-avatar profile-avatar-lg">{initialsFor(user)}</span>
            <div className="profile-dropdown-meta">
              <strong>{user.displayName || user.username}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <hr className="profile-dropdown-divider" />
          <button type="button" className="profile-dropdown-item" onClick={handleLogout} role="menuitem">
            <LogOut size={14} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const {
    network,
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
          <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)' }}>{network}</strong>
        </div>

        <div className="topbar-meta-item mono">
          <span style={{ color: 'var(--text-muted)' }}>Block</span>
          <strong style={{ color: 'var(--text-primary)' }}>#{formatNumber(currentBlock)}</strong>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-meta-item" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          <span className={`status-dot ${/connected|synchronized/i.test(connectionStatus) ? 'healthy' : 'danger'}`}></span>
          <span style={{ color: /connected|synchronized/i.test(connectionStatus) ? 'var(--accent-teal)' : 'var(--accent-red)', fontWeight: 600 }}>{connectionStatus.toUpperCase()}</span>
        </div>

        {isDemoMode && (
          <div className="demo-pill" title="Dashboard data is synthetic. Account and authentication are live.">
            <span>DEMO DATA</span>
          </div>
        )}

        {user ? (
          <ProfileMenu />
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="topbar-login-btn"
            aria-label="Sign in"
          >
            <User size={12} />
            LOGIN
          </button>
        )}
      </div>
    </header>
  );
}