import React, { useState, useEffect } from 'react';
import { securityApi } from '../services/apiClient.js';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import CodeViewer from '../components/common/CodeViewer.jsx';
import Pagination from '../components/common/Pagination.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import {
  Search,
  Filter,
  ShieldAlert,
  Code2,
  AlertTriangle,
  X,
  FileCode,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from '../components/common/Icons.jsx';
import { useRouter } from '../router.jsx';

export default function StaticFindings() {
  const { getQueryParam } = useRouter();
  const queryId = getQueryParam('id');

  const [findingsData, setFindingsData] = useState({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [contractFilter, setContractFilter] = useState('All');
  const [detectorFilter, setDetectorFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchFindings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await securityApi.getStaticFindings({
        search,
        severity: severityFilter,
        category: categoryFilter,
        contract: contractFilter,
        detector: detectorFilter,
        status: statusFilter,
        page,
        pageSize
      });
      if (res.success) {
        setFindingsData(res.data);
        if (queryId) {
          const match = res.data.items.find(f => f.id === queryId);
          if (match) {
            setSelectedFinding(match);
            return;
          }
        }
        // Default select first item if none selected or not in page
        if (res.data.items.length > 0 && !selectedFinding) {
          setSelectedFinding(res.data.items[0]);
        }
      } else {
        setError('Failed to query static vulnerability findings.');
      }
    } catch {
      setError('An error occurred querying the static findings database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [search, severityFilter, categoryFilter, contractFilter, detectorFilter, statusFilter, page, pageSize]);

  const categories = ['All', 'Reentrancy', 'Unchecked Calls', 'Oracle Dependency', 'Access Control', 'Integer / Precision'];
  const severities = ['All', 'Critical', 'High', 'Medium', 'Low'];
  const statuses = ['All', 'Open', 'Under Review', 'Resolved'];
  const detectors = ['All', 'PRISM-DET-01', 'PRISM-DET-02', 'PRISM-DET-03', 'PRISM-DET-04', 'PRISM-DET-05'];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Static Findings</h1>
          <p className="page-subtitle">
            Vulnerability index across verified protocol smart contracts. Select any finding to inspect code evidence, severity rationale, and remediation.
          </p>
        </div>
        <div className="page-actions">
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px 10px', backgroundColor: 'var(--bg-panel)', border: '1.5px solid var(--border-default)', boxShadow: '2px 2px 0px #000' }}>
            TOTAL FINDINGS: <strong style={{ color: 'var(--text-primary)' }}>{findingsData.total}</strong>
          </span>
        </div>
      </div>

      {error && <ErrorState title="Findings Database Error" message={error} onRetry={fetchFindings} />}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search finding, detector, contract, or file..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search findings"
            id="search-findings-input"
          />
        </div>

        <div className="filter-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Severity:</span>
            <select
              className="form-select"
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              aria-label="Filter by severity"
            >
              {severities.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Category:</span>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              aria-label="Filter by category"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Detector:</span>
            <select
              className="form-select"
              value={detectorFilter}
              onChange={(e) => { setDetectorFilter(e.target.value); setPage(1); }}
              aria-label="Filter by detector"
            >
              {detectors.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Status:</span>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              aria-label="Filter by status"
            >
              {statuses.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Scalable Table & Detailed Investigation Inspector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Scalable Findings Table */}
        <div className="table-container">
          <table className="prism-table" aria-label="Static Findings Table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Finding Title</th>
                <th>Detector</th>
                <th>Target Contract</th>
                <th>File</th>
                <th>Line</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center' }}>
                    <LoadingState message="Filtering findings index..." />
                  </td>
                </tr>
              ) : findingsData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center' }}>
                    <EmptyState
                      title="No Findings Match Filter"
                      description="Try clearing search keywords or selecting All severities."
                    />
                  </td>
                </tr>
              ) : (
                findingsData.items.map((f) => {
                  const isSelected = selectedFinding?.id === f.id;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFinding(f)}
                      style={{ cursor: 'pointer' }}
                      className={isSelected ? 'row-selected' : ''}
                      id={`finding-row-${f.id}`}
                    >
                      <td>
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                          {f.title}
                        </strong>
                      </td>
                      <td className="mono" style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>
                        {f.detector}
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)' }}>{f.contract}</span>
                      </td>
                      <td className="mono" style={{ color: 'var(--text-muted)' }}>
                        {f.file}
                      </td>
                      <td className="mono">
                        {f.lineStart}{f.lineEnd && f.lineEnd !== f.lineStart ? `–${f.lineEnd}` : ''}
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: f.status === 'Resolved' ? 'var(--accent-teal-bg)' : 'var(--bg-elevated)',
                            color: f.status === 'Resolved' ? 'var(--accent-teal)' : 'var(--text-secondary)',
                            border: `1px solid ${f.status === 'Resolved' ? 'var(--accent-teal)' : 'var(--border-default)'}`
                          }}
                        >
                          {f.status || 'Open'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Scalable Pagination Bar */}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={findingsData.total}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>

        {/* Detailed Investigation View (Clear hierarchy: FINDING -> SEVERITY -> WHY IT MATTERS -> AFFECTED CODE -> REMEDIATION) */}
        {selectedFinding && (
          <div className="prism-panel" id="finding-investigation-view" style={{ borderLeft: '4px solid var(--accent-teal)' }}>
            <div className="prism-panel-header">
              <div className="panel-title-group">
                <ShieldAlert size={15} color="var(--accent-teal)" />
                <span>Finding Detail: {selectedFinding.title}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SeverityBadge severity={selectedFinding.severity} />
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ID: {selectedFinding.id}
                </span>
              </div>
            </div>

            <div className="prism-panel-body">
              {/* Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px', padding: '12px 16px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-xs)', border: '1.5px solid var(--border-default)', boxShadow: '2px 2px 0px #000' }}>
                <div>
                  <span className="meta-label">Detector</span>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--accent-teal)', fontWeight: 700, marginTop: '2px' }}>
                    {selectedFinding.detector}
                  </div>
                </div>

                <div>
                  <span className="meta-label">Affected Contract</span>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedFinding.contract}
                  </div>
                </div>

                <div>
                  <span className="meta-label">File &amp; Line Range</span>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {selectedFinding.file}:{selectedFinding.lineStart}{selectedFinding.lineEnd && selectedFinding.lineEnd !== selectedFinding.lineStart ? `–${selectedFinding.lineEnd}` : ''}
                  </div>
                </div>

                <div>
                  <span className="meta-label">Category</span>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>
                    {selectedFinding.category || 'Vulnerability'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Description
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedFinding.description}
                </div>
              </div>

              {/* Why It Matters (Prominent analytical callout) */}
              <div style={{ marginBottom: '18px', padding: '14px 16px', backgroundColor: 'var(--accent-red-bg)', border: '2px solid var(--accent-red)', boxShadow: '3px 3px 0px #000', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Why It Matters
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedFinding.whyItMatters}
                </div>
              </div>

              {/* Affected Source Code Evidence (Visually Dominant) */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Vulnerable Source Code Evidence
                </div>
                <CodeViewer
                  code={selectedFinding.codeSnippet || '// Source snippet unavailable'}
                  fileName={selectedFinding.file}
                  highlightStart={selectedFinding.lineStart}
                  highlightEnd={selectedFinding.lineEnd}
                  maxHeight="300px"
                />
              </div>

              {/* Suggested Remediation */}
              <div style={{ marginBottom: '18px', padding: '14px 16px', backgroundColor: 'var(--accent-teal-bg)', border: '2px solid var(--accent-teal)', boxShadow: '3px 3px 0px #000', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                  Suggested Remediation
                </div>
                <div className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selectedFinding.remediation}
                </div>
              </div>

              {/* Related Findings & Related Runtime Signals */}
              <div className="grid-2" style={{ marginTop: '14px' }}>
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-elevated)', border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Related Findings
                  </div>
                  {selectedFinding.relatedFindings && selectedFinding.relatedFindings.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedFinding.relatedFindings.map((rf, idx) => (
                        <span key={idx} className="mono" style={{ fontSize: '11px', padding: '3px 8px', backgroundColor: 'var(--bg-panel)', border: '1.5px solid var(--border-default)', boxShadow: '1px 1px 0px #000', borderRadius: 'var(--radius-xs)', color: 'var(--text-primary)' }}>
                          {rf}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No co-occurring findings recorded.</span>
                  )}
                </div>

                <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-elevated)', border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    Related Runtime Signals
                  </div>
                  {selectedFinding.relatedRuntimeSignals && selectedFinding.relatedRuntimeSignals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {selectedFinding.relatedRuntimeSignals.map((rs, idx) => (
                        <span key={idx} style={{ fontSize: '11px', color: 'var(--accent-sand)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <span className="status-dot warning"></span>
                          <span>{rs}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No live anomalous runtime traces detected.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
