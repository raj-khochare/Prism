/**
 * Centralized API Client for PRISM
 * Strictly local / verified API boundary with error sanitization.
 * Never leaks stack traces or logs sensitive payloads to the console.
 */

import {
  DEMO_SYSTEM_METRICS,
  DEMO_SYSTEM_STATUS,
  DEMO_CONTRACTS,
  DEMO_STATIC_FINDINGS,
  DEMO_ALERTS,
  DEMO_RUNTIME_EVENTS,
  DEMO_TELEMETRY_SERIES,
  DEMO_RISK_FACTORS
} from './mockData.js';
import { analyzeSoliditySource } from './analysisEngine.js';

// Simulated delay helper for realistic UI responsiveness without artificial stalling
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

class PrismApiClient {
  constructor() {
    this.isDemoMode = true;
    this.contracts = [...DEMO_CONTRACTS];
    this.alerts = [...DEMO_ALERTS];
    this.findings = [...DEMO_STATIC_FINDINGS];
  }

  async getSystemMetrics() {
    await delay(80);
    return {
      success: true,
      data: {
        ...DEMO_SYSTEM_METRICS,
        monitoredContracts: this.contracts.length,
        openFindings: this.findings.length,
        activeAlerts: this.alerts.filter(a => !a.acknowledged && a.status !== 'Dismissed').length
      }
    };
  }

  async getSystemStatus() {
    await delay(100);
    return {
      success: true,
      data: DEMO_SYSTEM_STATUS
    };
  }

  async getContracts() {
    await delay(120);
    return {
      success: true,
      data: [...this.contracts]
    };
  }

  async getContractById(id) {
    await delay(100);
    const contract = this.contracts.find(c => c.id === id || c.address.toLowerCase() === id.toLowerCase());
    if (!contract) {
      return {
        success: false,
        error: 'Contract not found in registry.'
      };
    }
    return {
      success: true,
      data: contract
    };
  }

  async registerContract(newContract) {
    await delay(200);
    if (!newContract || !newContract.address) {
      return {
        success: false,
        error: 'Valid EVM contract address is required.'
      };
    }

    const item = {
      id: `c-${Date.now()}`,
      name: newContract.name || 'UnnamedContract',
      address: newContract.address,
      chain: newContract.chain || 'Ethereum Mainnet',
      riskScore: 30,
      severity: 'Low',
      status: 'Active',
      lastScan: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tx24h: 0,
      latestDetection: 'Newly registered - baseline monitoring active',
      verifiedSource: false
    };

    this.contracts.unshift(item);
    return {
      success: true,
      data: item
    };
  }

  async getStaticFindings(filters = {}) {
    await delay(100);
    let result = [...this.findings];

    if (filters.severity && filters.severity !== 'All') {
      result = result.filter(f => f.severity.toLowerCase() === filters.severity.toLowerCase());
    }
    if (filters.category && filters.category !== 'All') {
      result = result.filter(f => f.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.contract && filters.contract !== 'All') {
      result = result.filter(f => f.contract.toLowerCase() === filters.contract.toLowerCase());
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.detector.toLowerCase().includes(q) ||
        f.contract.toLowerCase().includes(q)
      );
    }

    return {
      success: true,
      data: result
    };
  }

  async scanContractSource(sourceCode, fileName = 'Contract.sol', contractAddress = '') {
    await delay(350);
    try {
      const analysis = analyzeSoliditySource(sourceCode, fileName);
      if (analysis.findings.length > 0) {
        // Prepend new findings to local list
        this.findings = [...analysis.findings, ...this.findings];
      }
      return {
        success: true,
        data: {
          ...analysis,
          contractAddress: contractAddress || 'Local File Analysis',
          scanTimestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
        }
      };
    } catch (err) {
      return {
        success: false,
        error: 'Static analysis parser encountered an unhandled syntax structure.',
        findings: [],
        stats: { total: 0, critical: 0, high: 0, medium: 0, low: 0, riskScore: 0 }
      };
    }
  }

  async getRuntimeTelemetry(contractName = 'LendingPoolCore') {
    await delay(120);
    return {
      success: true,
      data: {
        contract: contractName,
        currentBlock: DEMO_SYSTEM_METRICS.currentBlock,
        series: DEMO_TELEMETRY_SERIES,
        latestDetection: 'Potential reentrancy sequence in withdraw()'
      }
    };
  }

  async getRuntimeEvents(contractFilter = 'All') {
    await delay(100);
    let events = [...DEMO_RUNTIME_EVENTS];
    if (contractFilter && contractFilter !== 'All') {
      events = events.filter(e => e.contract.toLowerCase() === contractFilter.toLowerCase());
    }
    return {
      success: true,
      data: events
    };
  }

  async getRiskAssessment(contractName = 'LendingPoolCore') {
    await delay(120);
    const riskData = { ...DEMO_RISK_FACTORS, contract: contractName };
    return {
      success: true,
      data: riskData
    };
  }

  async getAlerts() {
    await delay(100);
    return {
      success: true,
      data: [...this.alerts]
    };
  }

  async acknowledgeAlert(alertId) {
    await delay(100);
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.status = 'Acknowledged';
    }
    return { success: true, data: alert };
  }

  async dismissAlert(alertId) {
    await delay(100);
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'Dismissed';
      alert.acknowledged = true;
    }
    return { success: true, data: alert };
  }
}

export const api = new PrismApiClient();
