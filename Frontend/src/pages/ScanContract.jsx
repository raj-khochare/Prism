import React, { useState } from 'react';
import { useRouter } from '../router.jsx';
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
} from '../components/common/Icons.jsx';

export default function ScanContract() {
  const { navigate } = useRouter();
  const [sourceCode, setSourceCode] = useState(SAMPLE_SOL_VULNERABLE);
  const [fileName, setFileName] = useState('VulnerableVault.sol');
  const [contractAddress, setContractAddress] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(() => {
    try {
      const saved = sessionStorage.getItem('prism_last_scan');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [scanError, setScanError] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.sol')) {
      setScanError('Invalid file type. Please upload a Solidity source file (.sol).');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (event) => {
      setSourceCode(event.target.result);
      setScanResult(null);
      setSelectedFinding(null);
      setScanError(null);
      sessionStorage.removeItem('prism_last_scan');
    };

    reader.readAsText(file);
  };

  const loadSample = (type) => {
    const source =
      type === 'reentrancy'
        ? SAMPLE_SOL_VULNERABLE
        : SAMPLE_SOL_ORACLE;

    const name =
      type === 'reentrancy'
        ? 'VulnerableVault.sol'
        : 'OraclePriceConsumer.sol';

    const file = new File([source], name, {
      type: 'text/plain',
    });

    setSelectedFile(file);
    setSourceCode(source);
    setFileName(name);
    setScanResult(null);
    setSelectedFinding(null);
    setScanError(null);
  };

  const handleRunScan = async () => {
    if (!sourceCode.trim()) {
      setScanError('Please enter or upload a Solidity contract before running the scan.');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScanResult(null);
    setSelectedFinding(null);

    try {
      // Always build the file from the current editor content.
      // This makes both upload and manual paste use exactly the same scan path.
      const scanFile = new File(
        [sourceCode],
        fileName?.trim() || 'Contract.sol',
        { type: 'text/plain' }
      );

      const res = await securityApi.scanSoliditySource(scanFile);

      if (res.success) {
        setScanResult(res.data);

        sessionStorage.setItem(
          'prism_last_scan',
          JSON.stringify(res.data)
        );

        if (res.data.findings && res.data.findings.length > 0) {
          setSelectedFinding(res.data.findings[0]);
        }
      } else {
        setScanError(res.error || 'Static analysis could not be completed.');
      }
    } catch (error) {
      setScanError(
        error.message || 'An unexpected error occurred during static analysis.'
      );
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

      {/* 1. INPUT STAGE: Source Submission Panel */}
      <div className="prism-panel" id="scan-input-panel">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <FileCode size={14} color="var(--accent-teal)" />
            <span>1. Solidity Source Submission</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Load Sample:</span>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
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
                <Upload size={13} color="var(--text-secondary)" />
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Analysis runs through the PRISM FastAPI static analyzer with Slither and Gemini.
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRunScan}
              disabled={isScanning || !sourceCode.trim()}
              id="btn-run-static-analysis"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <Play size={13} />
              <span>{isScanning ? 'Analyzing Contract...' : 'Run Static Analysis'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. RESULTS STAGE: Analysis Findings & Source Evidence */}
      {
        scanResult && (
          <div id="scan-results-section">
            {/* Findings Summary Ribbon */}
            <div className="prism-panel">
              <div className="prism-panel-header">
                <div className="panel-title-group">
                  <CheckCircle2 size={14} color="var(--accent-teal)" />
                  <span>Analysis Complete: {scanResult.fileName}</span>
                </div>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {scanResult.scanTimestamp}
                </span>
              </div>

              <div className="prism-panel-body" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <span className="meta-label">Scan Status</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span className="status-dot healthy"></span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Analyzed</strong>
                    </div>
                  </div>

                  <div>
                    <span className="meta-label">Critical</span>
                    <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-red)' }}>
                      {scanResult.stats?.critical || 0}
                    </div>
                  </div>

                  <div>
                    <span className="meta-label">High</span>
                    <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-orange-red)' }}>
                      {scanResult.stats?.high || 0}
                    </div>
                  </div>

                  <div>
                    <span className="meta-label">Medium</span>
                    <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-yellow)' }}>
                      {scanResult.stats?.medium || 0}
                    </div>
                  </div>

                  <div>
                    <span className="meta-label">Low</span>
                    <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-green)' }}>
                      {scanResult.stats?.low || 0}
                    </div>
                  </div>

                  <div>
                    <span className="meta-label">Risk Contribution</span>
                    <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: scanResult.stats?.riskScore > 50 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
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
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Select to highlight code</span>
                </div>

                <div className="prism-panel-body" style={{ padding: 0 }}>
                  {scanResult.findings && scanResult.findings.length > 0 ? (
                    <div>
                      {scanResult.findings.map((f) => {
                        const isSelected = selectedFinding?.id === f.id;
                        return (
                          <div
                            key={f.id}
                            onClick={() => {
                              navigate(`/findings?id=${encodeURIComponent(f.id)}`);
                            }}
                            style={{
                              padding: '14px 16px',
                              borderBottom: '1px solid var(--border-default)',
                              backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                              borderLeft: isSelected ? '4px solid var(--accent-red)' : '4px solid transparent',
                              cursor: 'pointer',
                              transition: 'background-color var(--transition-fast)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <SeverityBadge severity={f.severity} />
                              <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-teal)', fontWeight: 700 }}>
                                {f.detector}
                              </span>
                            </div>

                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                              {f.title}
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '8px' }}>
                              {f.description}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                              <span className="mono">
                                Lines {f.lineStart}{f.lineEnd && f.lineEnd !== f.lineStart ? `–${f.lineEnd}` : ''}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--accent-sand)', fontWeight: 600 }}>
                                <span>Jump to line</span>
                                <ChevronRight size={11} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--accent-teal)', fontSize: '12px' }}>
                      <ShieldCheck size={28} color="var(--accent-teal)" style={{ marginBottom: '8px' }} />
                      <div style={{ fontWeight: 600 }}>No vulnerability patterns matched in analyzed source.</div>
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
              {selectedFinding?.analysis?.available && (
                <div className="prism-panel" style={{ marginTop: '16px' }}>
                  <div className="prism-panel-header">
                    <div className="panel-title-group">
                      <ShieldCheck size={13} color="var(--accent-teal)" />
                      <span>AI SECURITY ANALYSIS</span>
                    </div>

                    <span
                      className="mono"
                      style={{
                        fontSize: '10px',
                        color: 'var(--accent-teal)',
                        fontWeight: 700
                      }}
                    >
                      {selectedFinding.analysis.confidence || 'Analyzed'}
                    </span>
                  </div>

                  <div className="prism-panel-body">
                    <div style={{ marginBottom: '20px' }}>
                      <div className="form-label">Explanation</div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6
                        }}
                      >
                        {selectedFinding.analysis.explanation}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div className="form-label">Attack Scenario</div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {selectedFinding.analysis.attack_scenario}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div className="form-label">Impact</div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6
                        }}
                      >
                        {selectedFinding.analysis.impact}
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <div className="form-label">Recommendation</div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6
                        }}
                      >
                        {selectedFinding.analysis.recommendation}
                      </div>
                    </div>

                    {selectedFinding.analysis.fixed_code && (
                      <div>
                        <div className="form-label">Suggested Fixed Code</div>

                        <pre
                          style={{
                            margin: 0,
                            padding: '14px',
                            background: 'var(--bg-code)',
                            border: '1px solid var(--border-default)',
                            overflowX: 'auto',
                            fontSize: '11px',
                            lineHeight: 1.6,
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'pre'
                          }}
                        >
                          {selectedFinding.analysis.fixed_code}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
    </div>
  );
}
