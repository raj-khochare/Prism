import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [network, setNetwork] = useState('Ethereum Mainnet');
  const [currentBlock, setCurrentBlock] = useState(18492815);
  const [connectionStatus, setConnectionStatus] = useState('Connected');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState(3);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await api.getSystemMetrics();
      if (res.success) {
        setSystemMetrics(res.data);
        setActiveAlertsCount(res.data.activeAlerts);
        setCurrentBlock(res.data.currentBlock);
      }
    } catch {
      // Non-blocking error handling
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Simulate real block increments every 20 seconds
    const timer = setInterval(() => {
      setCurrentBlock(prev => prev + 1);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppContext.Provider
      value={{
        network,
        setNetwork,
        currentBlock,
        connectionStatus,
        setConnectionStatus,
        isDemoMode,
        setIsDemoMode,
        mobileMenuOpen,
        setMobileMenuOpen,
        activeAlertsCount,
        setActiveAlertsCount,
        systemMetrics,
        fetchMetrics,
        loadingMetrics
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
