/**
 * PRISM API client - talks to the Spring Boot backend.
 *
 * It keeps the `{ success, data | error }` shape the pages were written against, so the
 * pages did not need to change when the mock data was replaced. Nothing in here is mocked.
 *
 * Fixes vs the old file:
 *  - scan used a hard-coded URL, the wrong token key ('token' instead of 'prism_token') and a
 *    non-existent endpoint (/api/scan); it also read `staticRiskContribution`, which the
 *    backend never returns (the field is `riskScore`), so the score was always 0
 *  - prove-exploit sent `finding.function`/`finding.contract`, which the finding cards do not
 *    have (they have functionName / solidityContractName), so the backend always answered 400
 *  - every other call returned mock data
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const TOKEN_KEY = 'prism_token';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

async function request(path, { method = 'GET', body, params } = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    const res = await fetch(`${API_BASE}${path}${qs(params)}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* empty body */
    }

    if (res.status === 401) {
      // Expired/invalid token: let the auth context send the user back to /login.
      window.dispatchEvent(new Event('prism:unauthorized'));
    }
    if (!res.ok) {
      return { success: false, status: res.status, error: data?.message || data?.error || `Request failed (${res.status}).` };
    }
    return { success: true, data };
  } catch {
    return { success: false, error: 'Unable to reach the PRISM backend. Is it running?' };
  }
}

class SecurityApiClient {
  constructor() {
    this._contractCache = null;
  }

  // The pages select contracts by name; the backend works with ids.
  async _resolveContractId(nameOrId) {
    if (nameOrId && UUID_RE.test(nameOrId)) return nameOrId;
    const res = await this.getContracts({ pageSize: 200 });
    if (!res.success || res.data.items.length === 0) return null;
    const match = res.data.items.find((c) => c.name === nameOrId);
    return (match || res.data.items[0]).id;
  }

  getOverviewData() {
    return request('/api/overview');
  }

  getSystemStatus() {
    return request('/api/system/status');
  }

  getContracts({ search = '', chain = 'All', status = 'All', risk = 'All', sortBy = 'riskScore', sortDir = 'desc', page = 1, pageSize = 10 } = {}) {
    return request('/api/contracts', { params: { search: search.trim(), chain, status, risk, sortBy, sortDir, page, pageSize } });
  }

  deleteContract(id) {
    return request(`/api/contracts/${id}`, { method: 'DELETE' });
  }

  registerContract({ name = '', address, chain = 'Ethereum Mainnet' }) {
    return request('/api/contracts', { method: 'POST', body: { name: name.trim(), address: (address || '').trim(), chain } });
  }

  getStaticFindings({ search = '', severity = 'All', category = 'All', contract = 'All', detector = 'All', status = 'All', contractId, page = 1, pageSize = 10 } = {}) {
    return request('/api/findings', { params: { search: search.trim(), severity, category, contract, detector, status, contractId, page, pageSize } });
  }

  async getFindingById(id) {
    const res = await this.getStaticFindings({ pageSize: 1000 });
    if (!res.success) return res;
    const f = res.data.items.find((x) => x.id === id);
    return f ? { success: true, data: f } : { success: false, error: 'Finding record not found.' };
  }

  async scanSoliditySource(file) {
    const sourceCode = await file.text();
    const res = await request('/api/scan', { method: 'POST', body: { sourceCode, fileName: file.name } });
    if (!res.success) return { success: false, error: res.error || 'Static analysis failed.' };

    const result = res.data;
    const findings = result.findings || [];
    const stats = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach((f) => {
      const sev = String(f.severity || '').toLowerCase();
      if (sev in stats) stats[sev] += 1;
    });
    stats.riskScore = Math.round(result.riskScore ?? 0);

    return {
      success: true,
      data: {
        fileName: result.fileName || file.name,
        scanTimestamp: result.scanTimestamp || new Date().toISOString(),
        findings,
        stats,
        riskScore: stats.riskScore,
        contractId: findings[0]?.contractId || null,
      },
    };
  }

  async proveExploit(finding) {
    if (!finding) return { success: false, error: 'No finding selected.' };
    if (!finding.solidityContractName || !finding.functionName) {
      return { success: false, error: 'This finding has no contract/function and cannot be exploit-tested.' };
    }
    const res = await request('/api/exploits/prove', {
      method: 'POST',
      body: {
        // The backend loads the stored source from contractId.
        contractId: finding.contractId,
        findingId: finding.analyzerFindingId || undefined,
        finding: {
          detector_id: finding.detectorId || finding.detector,
          title: finding.title,
          contract: finding.solidityContractName,
          function: finding.functionName,
          description: finding.description,
          source_snippet: finding.sourceSnippet || finding.codeSnippet || '',
        },
      },
    });
    return res;
  }

  async getRuntimeTelemetry(nameOrId) {
    const id = await this._resolveContractId(nameOrId);
    if (!id) return { success: true, data: { contract: nameOrId || '', currentBlock: 0, series: [], latestDetection: 'No contracts registered', activeQuestions: [] } };
    return request('/api/runtime/telemetry', { params: { contractId: id } });
  }

  getRuntimeEvents({ search = '', contract = 'All', severity = 'All', eventType = 'All', page = 1, pageSize = 10 } = {}) {
    return request('/api/runtime/events', { params: { search: search.trim(), contract, severity, eventType, page, pageSize } });
  }

  async getRiskAssessment(nameOrId) {
    const id = await this._resolveContractId(nameOrId);
    if (!id) return { success: true, data: { contract: '', score: 0, assessed: false, status: 'NOT ASSESSED', staticSignals: [], runtimeSignals: [], modelMetadata: [], summaryConclusion: { primaryConcern: 'Register or scan a contract first.', whatToInvestigate: [] } } };
    return request(`/api/contracts/${id}/risk`);
  }

  getAlerts({ status = 'All', severity = 'All', page = 1, pageSize = 10 } = {}) {
    return request('/api/alerts', { params: { status, severity, page, pageSize } });
  }

  acknowledgeAlert(id) {
    return request(`/api/alerts/${id}/acknowledge`, { method: 'PUT' });
  }

  dismissAlert(id) {
    return request(`/api/alerts/${id}/dismiss`, { method: 'PUT' });
  }

  getAlertConfig() {
    return request('/api/alerts/config');
  }

  saveAlertConfig(config) {
    return request('/api/alerts/config', { method: 'PUT', body: config });
  }
}

export const securityApi = new SecurityApiClient();
