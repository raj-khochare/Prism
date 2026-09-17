import React, { useState } from 'react';
import { securityApi } from '../services/apiClient.js';
import { SAMPLE_SOL_VULNERABLE, SAMPLE_SOL_ORACLE } from '../data/mockSecurityData.js';
import CodeViewer from '../components/common/CodeViewer.jsx';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import {
  Play,
  Upload,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export default function ScanContract() {
  const [sourceCode, setSourceCode] = useState(SAMPLE_SOL_VULNERABLE);
  const [fileName, setFileName] = useState('VulnerableVault.sol');
  const [contractAddress, setContractAddress] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.sol')) {
      setScanError('Invalid file type. Please upload a Solidity source file (.sol).');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSourceCode(event.target.result);
      setScanResult(null);
      setSelectedFinding(null);
      setScanError(null);
    };
    reader.readAsText(file);
  };

  const loadSample = (type) => {
    if (type === 'reentrancy') {
      setSourceCode(SAMPLE_SOL_VULNERABLE);
      setFileName('VulnerableVault.sol');
    } else {
      setSourceCode(SAMPLE_SOL_ORACLE);
      setFileName('OraclePriceConsumer.sol');
    }
    setScanResult(null);
    setSelectedFinding(null);
    setScanError(null);
  };

  const handleRunScan = async () => {
    if (!sourceCode.trim()) {
      setScanError('Solidity source code is required to execute static analysis.');
      return;
    }

    setIsScanning(true);
    setScanError(null);

    try {
      const res = await securityApi.scanSoliditySource(sourceCode, fileName, contractAddress);
      if (res.success) {
        setScanResult(res.data);
        if (res.data.findings && res.data.findings.length > 0) {
          setSelectedFinding(res.data.findings[0]);
        }
      } else {
        setScanError(res.error || 'Static analysis could not be completed.');
      }
    } catch {
      setScanError('An unexpected client error occurred during AST vulnerability parsing.');
    } finally {
      setIsScanning(false);
    }
  };

  // Find all lines flagged across all findings
  const allVulnerableLines = scanResult?.findings?.flatMap((f) => {
    const lines = [];
    const end = f.lineEnd || f.lineStart;
    for (let l = f.lineStart; l <= end; l++) {
      lines.push(l);
    }
    return lines;
  }) || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Scan Contract</h1>
          <p className="page-subtitle">
            Submit Solidity source code for local static analysis, pattern matching, and AST vulnerability detection.
          </p>
        </div>
        <div className="page-actions">
          <span className="demo-pill">Client-Side Parser Active</span>
        </div>
      </div>

      {scanError && (
        <ErrorState
          title="Analysis Error"
          message={scanError}
          onRetry={() => setScanError(null)}
        />
      )}

      {/* Input Controls Panel */}
      <div className="prism-panel" id="scan-input-panel">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <FileCode size={14} color="var(--accent-teal)" />
            <span>Solidity Source Submission</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Load Sample:</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadSample('reentrancy')}
            >
              Reentrancy Vault
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => loadSample('oracle')}
            >
              Oracle Consumer
            </button>
          </div>
        </div>

        <div className="prism-panel-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="contract-filename">Contract Filename</label>
              <input
                id="contract-filename"
                type="text"
                className="form-input"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. ProtocolVault.sol"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="contract-address">Deployed Address (Optional)</label>
              <input
                id="contract-address"
                type="text"
                className="form-input mono"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x... (optional EVM address)"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0, justifyContent: 'flex-end' }}>
              <label className="form-label">Upload .sol File</label>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', textAlign: 'center' }}>
                <Upload size={13} />
                <span>Choose .sol File</span>
                <input
                  type="file"
                  accept=".sol"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Paste source textarea */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="solidity-source-input">
                Solidity Code Input
              </label>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {sourceCode.split('\n').length} lines
              </span>
            </div>
            <textarea
              id="solidity-source-input"
              className="form-textarea"
              rows={10}
              value={sourceCode}
              onChange={(e) => {
                setSourceCode(e.target.value);
                setScanResult(null);
                setSelectedFinding(null);
              }}
              placeholder="// Paste Solidity code here..."
              spellCheck={false}
            />
          </div>

          {/* Primary Action Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Evaluated strictly locally. No source code transmitted to external servers.
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunScan}
              disabled={isScanning || !sourceCode.trim()}
              id="btn-run-static-analysis"
            >
              <Play size={13} />
              <span>{isScanning ? 'Analyzing AST...' : 'Run Static Analysis'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Static Analysis Results Section */}
      {scanResult && (
        <div id="scan-results-section">
          {/* Findings Summary Ribbon */}
          <div className="prism-panel">
            <div className="prism-panel-header">
              <div className="panel-title-group">
                <CheckCircle2 size={14} color="var(--accent-teal)" />
                <span>Analysis Complete: {scanResult.fileName}</span>
              </div>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {scanResult.scanTimestamp}
              </span>
            </div>

            <div className="prism-panel-body" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', alignItems: 'center' }}>
                <div>
                  <span className="meta-label">Scan Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span className="status-dot healthy"></span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Analyzed</strong>
                  </div>
                </div>

                <div>
                  <span className="meta-label">Critical</span>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-red)' }}>
                    {scanResult.stats?.critical || 0}
                  </div>
                </div>

                <div>
                  <span className="meta-label">High</span>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#D66B60' }}>
                    {scanResult.stats?.high || 0}
                  </div>
                </div>

                <div>
                  <span className="meta-label">Medium</span>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-sand)' }}>
                    {scanResult.stats?.medium || 0}
                  </div>
                </div>

                <div>
                  <span className="meta-label">Low</span>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-teal)' }}>
                    {scanResult.stats?.low || 0}
                  </div>
                </div>

                <div>
                  <span className="meta-label">Risk Contribution</span>
                  <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: scanResult.stats?.riskScore > 50 ? 'var(--accent-red)' : 'var(--accent-teal)' }}>
                    +{scanResult.stats?.riskScore || 0} pts
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Inspection: Findings List on Left, Source Viewer on Right */}
          <div className="grid-2">
            {/* Finding Navigation Panel */}
            <div className="prism-panel" style={{ marginBottom: 0 }}>
              <div className="prism-panel-header">
                <div className="panel-title-group">
                  <AlertTriangle size={13} color="var(--accent-sand)" />
                  <span>Detected Vulnerabilities ({scanResult.findings?.length || 0})</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Select to highlight</span>
              </div>

              <div className="prism-panel-body" style={{ padding: 0 }}>
                {scanResult.findings && scanResult.findings.length > 0 ? (
                  <div>
                    {scanResult.findings.map((f) => {
                      const isSelected = selectedFinding?.id === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFinding(f)}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid var(--border-subtle)',
                            backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                            borderLeft: isSelected ? '3px solid var(--accent-red)' : '3px solid transparent',
                            cursor: 'pointer',
                            transition: 'background-color var(--transition-fast)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <SeverityBadge severity={f.severity} />
                            <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-teal)' }}>
                              {f.detector}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                            {f.title}
                          </div>

                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.35, marginBottom: '6px' }}>
                            {f.description}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                            <span className="mono">
                              Lines {f.lineStart}{f.lineEnd && f.lineEnd !== f.lineStart ? `–${f.lineEnd}` : ''}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--accent-sand)' }}>
                              <span>Jump to line</span>
                              <ChevronRight size={11} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-teal)', fontSize: '12px' }}>
                    <ShieldCheck size={24} style={{ marginBottom: '6px' }} />
                    <div>No vulnerability patterns matched in analyzed source.</div>
                  </div>
                )}
              </div>
            </div>

            {/* Source Code Viewer */}
            <div>
              <CodeViewer
                code={sourceCode}
                fileName={fileName}
                vulnerableLines={allVulnerableLines}
                highlightStart={selectedFinding?.lineStart}
                highlightEnd={selectedFinding?.lineEnd}
                activeFindingTitle={selectedFinding?.title}
                maxHeight="520px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
