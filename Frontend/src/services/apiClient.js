/**
 * PRISM Centralized API Service Layer
 * Simulates server-ready pagination, multi-attribute filtering, sorting,
 * and debounced queries. Designed so demoData can be seamlessly swapped
 * with production API endpoints without modifying UI components.
 */

import {
  DEMO_SECURITY_STATUS,
  DEMO_RISK_DRIVERS,
  DEMO_RECENT_EVENTS,
  DEMO_PRIORITY_INVESTIGATION,
  DEMO_SYSTEM_STATUS,
  DEMO_CONTRACTS,
  DEMO_STATIC_FINDINGS,
  DEMO_ALERTS,
  DEMO_RUNTIME_EVENTS,
  DEMO_TELEMETRY_SERIES,
  DEMO_RISK_DECOMPOSITION
} from '../data/mockSecurityData.js';
// import { analyzeSoliditySource } from '../api/analysisEngine.js';

// Realistic simulated response delay
const delay = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));

class SecurityApiClient {
  constructor() {
    this.isDemoMode = true;
    this.contracts = [...DEMO_CONTRACTS];
    this.findings = [...DEMO_STATIC_FINDINGS];
    this.alerts = [...DEMO_ALERTS];
    this.runtimeEvents = [...DEMO_RUNTIME_EVENTS];
  }

  // 1. Overview Page Data
  async getOverviewData() {
    await delay(100);
    return {
      success: true,
      data: {
        securityStatus: {
          ...DEMO_SECURITY_STATUS,
          highFindingsCount: this.findings.filter(f => f.severity === 'High' || f.severity === 'Critical').length,
          activeAlertsCount: this.alerts.filter(a => !a.acknowledged && a.status !== 'Dismissed').length
        },
        riskDrivers: [...DEMO_RISK_DRIVERS],
        recentEvents: [...DEMO_RECENT_EVENTS],
        priorityInvestigation: { ...DEMO_PRIORITY_INVESTIGATION },
        systemStatus: [...DEMO_SYSTEM_STATUS]
      }
    };
  }

  // 2. Scalable Contract Registry Query
  async getContracts({
    search = '',
    chain = 'All',
    status = 'All',
    risk = 'All',
    sortBy = 'riskScore',
    sortDir = 'desc',
    page = 1,
    pageSize = 10
  } = {}) {
    await delay(120);
    let items = [...this.contracts];

    // Filter
    if (chain && chain !== 'All') {
      items = items.filter(c => c.chain.toLowerCase() === chain.toLowerCase());
    }
    if (status && status !== 'All') {
      items = items.filter(c => c.status.toLowerCase() === status.toLowerCase());
    }
    if (risk && risk !== 'All') {
      items = items.filter(c => c.severity.toLowerCase() === risk.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.latestDetection.toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    // Pagination
    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      }
    };
  }

  async registerContract({ name, address, chain = 'Ethereum Mainnet' }) {
    await delay(180);
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      return {
        success: false,
        error: 'Invalid EVM contract address format (must be 42 characters starting with 0x).'
      };
    }

    const newEntry = {
      id: `c-${Date.now()}`,
      name: name.trim() || 'MonitoredContract',
      address: address.trim(),
      chain,
      riskScore: 28,
      severity: 'Low',
      status: 'Active',
      lastScan: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tx24h: 0,
      latestDetection: 'Newly registered - baseline telemetry initialized',
      verifiedSource: false
    };

    this.contracts.unshift(newEntry);
    return { success: true, data: newEntry };
  }

  // 3. Scalable Static Findings Query
  async getStaticFindings({
    search = '',
    severity = 'All',
    category = 'All',
    contract = 'All',
    detector = 'All',
    status = 'All',
    page = 1,
    pageSize = 10
  } = {}) {
    await delay(100);
    let items = [...this.findings];

    if (severity && severity !== 'All') {
      items = items.filter(f => f.severity.toLowerCase() === severity.toLowerCase());
    }
    if (category && category !== 'All') {
      items = items.filter(f => f.category.toLowerCase() === category.toLowerCase());
    }
    if (contract && contract !== 'All') {
      items = items.filter(f => f.contract.toLowerCase() === contract.toLowerCase());
    }
    if (detector && detector !== 'All') {
      items = items.filter(f => f.detector.toLowerCase() === detector.toLowerCase());
    }
    if (status && status !== 'All') {
      items = items.filter(f => f.status.toLowerCase() === status.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.detector.toLowerCase().includes(q) ||
        f.contract.toLowerCase().includes(q) ||
        f.file.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      }
    };
  }

  async getFindingById(id) {
    await delay(80);
    const finding = this.findings.find(f => f.id === id);
    if (!finding) return { success: false, error: 'Finding record not found.' };
    return { success: true, data: finding };
  }

  // 4. Static Scan Submission
  async scanSoliditySource(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.detail || 'Static analysis failed.',
        };
      }

      // Convert backend response into the shape the existing UI expects.
      const findings = (result.findings || []).map((item, index) => {
        const finding = item.finding || {};

        return {
          id: `${finding.detector_id || 'finding'}-${index}`,
          detector: finding.detector_id || 'unknown',
          title: finding.title || 'Security Finding',
          severity: item.severity || finding.impact || 'Informational',
          category: 'Vulnerability',
          description:
            item.analysis?.explanation ||
            finding.description ||
            'No description available.',

          whyItMatters:
            item.analysis?.impact ||
            'No impact analysis available.',

          remediation:
            item.analysis?.recommendation ||
            'No remediation recommendation available.',
          attackScenario: item.analysis?.attack_scenario || '',
          fixedCode: item.analysis?.fixed_code || '',

          codeSnippet: finding.source_snippet || '',

          lineStart: finding.line_start || 1,
          lineEnd: finding.line_end || finding.line_start || 1,
          contract: finding.contract || 'Unknown',
          function: finding.function || 'Unknown',
          file: finding.source_file || file.name,
          sourceSnippet: finding.source_snippet || '',
          analysis: item.analysis || null,
          status: 'Open',
          relatedFindings: [],
          relatedRuntimeSignals: [],
        };
      });

      const stats = findings.reduce(
        (acc, finding) => {
          const severity = finding.severity.toLowerCase();

          if (severity === 'critical') acc.critical++;
          else if (severity === 'high') acc.high++;
          else if (severity === 'medium') acc.medium++;
          else if (severity === 'low') acc.low++;

          return acc;
        },
        {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        }
      );

      stats.riskScore = result.risk_score || 0;

      this.findings = [...findings, ...this.findings];

      return {
        success: true,
        data: {
          fileName: file.name,
          contractAddress: 'Local Analysis File',
          scanTimestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
          findings,
          stats,
          riskScore: result.risk_score || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to connect to the PRISM analysis backend.',
      };
    }
  }

  // 5. Runtime Telemetry & Events
  async getRuntimeTelemetry(contractName = 'LendingPoolCore') {
    await delay(100);
    return {
      success: true,
      data: {
        contract: contractName,
        currentBlock: 18492815,
        series: DEMO_TELEMETRY_SERIES,
        latestDetection: 'Potential reentrancy sequence in withdraw()',
        activeQuestions: [
          { question: 'Has transaction activity changed significantly?', status: 'Elevated (140 tx/min vs 20 tx/min baseline)', alert: true },
          { question: 'Is execution consuming abnormal computational steps?', status: 'Surging (145k gas avg vs 40k gas nominal)', alert: true },
          { question: 'Has oracle price deviated from reference TWAP?', status: 'Critical (+2.14% divergence vs 30m TWAP)', alert: true },
          { question: 'Has large capital moved unusually?', status: 'Critical (3.2M USDC outflow in block #18492809)', alert: true }
        ]
      }
    };
  }

  async getRuntimeEvents({
    search = '',
    contract = 'All',
    severity = 'All',
    eventType = 'All',
    page = 1,
    pageSize = 10
  } = {}) {
    await delay(100);
    let items = [...this.runtimeEvents];

    if (contract && contract !== 'All') {
      items = items.filter(e => e.contract.toLowerCase() === contract.toLowerCase());
    }
    if (severity && severity !== 'All') {
      items = items.filter(e => e.severity.toLowerCase() === severity.toLowerCase());
    }
    if (eventType && eventType !== 'All') {
      items = items.filter(e => e.eventType.toLowerCase() === eventType.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(e =>
        e.contract.toLowerCase().includes(q) ||
        e.txHash.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      }
    };
  }

  // 6. Risk Assessment Decomposition
  async getRiskAssessment(contractName = 'LendingPoolCore') {
    await delay(120);
    return {
      success: true,
      data: {
        ...DEMO_RISK_DECOMPOSITION,
        contract: contractName
      }
    };
  }

  // 7. Alerts
  async getAlerts({
    status = 'All',
    severity = 'All',
    page = 1,
    pageSize = 10
  } = {}) {
    await delay(90);
    let items = [...this.alerts];

    if (status === 'Active') {
      items = items.filter(a => !a.acknowledged && a.status !== 'Dismissed');
    } else if (status === 'Acknowledged') {
      items = items.filter(a => a.status === 'Acknowledged');
    } else if (status === 'Dismissed') {
      items = items.filter(a => a.status === 'Dismissed');
    }

    if (severity && severity !== 'All') {
      items = items.filter(a => a.severity.toLowerCase() === severity.toLowerCase());
    }

    const total = items.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      data: {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      }
    };
  }

  async acknowledgeAlert(alertId) {
    await delay(80);
    const item = this.alerts.find(a => a.id === alertId);
    if (item) {
      item.acknowledged = true;
      item.status = 'Acknowledged';
    }
    return { success: true, data: item };
  }

  async dismissAlert(alertId) {
    await delay(80);
    const item = this.alerts.find(a => a.id === alertId);
    if (item) {
      item.status = 'Dismissed';
      item.acknowledged = true;
    }
    return { success: true, data: item };
  }
}

export const securityApi = new SecurityApiClient();
