import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { securityApi } from '../services/apiClient.js';
import { subscribeTopic } from '../services/liveFeed.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { token } = useAuth();
  const [network] = useState('Local Hardhat fork');
  const [currentBlock, setCurrentBlock] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [sys, alerts] = await Promise.all([
      securityApi.getSystemStatus(),
      securityApi.getAlerts({ status: 'Active', pageSize: 1 }),
    ]);
    if (sys.success) {
      setSystemStatus(sys.data);
      const rpc = sys.data.find((s) => s.component === 'RPC Provider');
      const sync = sys.data.find((s) => s.component === 'Block Sync');
      setConnectionStatus(rpc?.status || 'Unknown');
      const m = /#(\d+)/.exec(sync?.target || '');
      if (m) setCurrentBlock(Number(m[1]));
    } else {
      setConnectionStatus('Backend offline');
    }
    if (alerts.success) setActiveAlertsCount(alerts.data.total);
  }, [token]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  // Live pushes: a new alert bumps the counter immediately.
  useEffect(() => {
    if (!token) return undefined;
    return subscribeTopic('/topic/alerts', () => setActiveAlertsCount((n) => n + 1));
  }, [token]);

  return (
    <AppContext.Provider
      value={{
        network,
        currentBlock,
        connectionStatus,
        isDemoMode: false,
        mobileMenuOpen,
        setMobileMenuOpen,
        activeAlertsCount,
        setActiveAlertsCount,
        systemStatus,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
