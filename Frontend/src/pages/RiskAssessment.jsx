import React, { useState, useEffect } from 'react';
import { useRouter } from '../router.jsx';
import { securityApi } from '../services/apiClient.js';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { getRiskLevel } from '../utils/formatters.js';
import {
  ShieldAlert,
  Cpu,
  Layers,
  Search,
  ArrowRight,
  AlertTriangle,
  FileCode,
  Activity,
  Binary
} from 'lucide-react';

export default function RiskAssessment() {
  const { navigate } = useRouter();
  const [contracts, setContracts] = useState([]);
  const [selectedContract, setSelectedContract] = useState('LendingPoolCore');
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRiskData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, rRes] = await Promise.all([
        securityApi.getContracts({ pageSize: 50 }),
        securityApi.getRiskAssessment(selectedContract)
      ]);

      if (cRes.success) setContracts(cRes.data.items);
      if (rRes.success) setRiskData(rRes.data);
    } catch {
      setError('Unable to compute risk factor matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiskData();
  }, [selectedContract]);

  if (loading && !riskData) {
    return <LoadingState message="Aggregating static and runtime risk signals..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Risk Engine Unavailable"
        message={error}
        onRetry={loadRiskData}
      />
    );
  }

  const score = riskData?.score || 72;
  const riskInfo = getRiskLevel(score);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Risk Assessment</h1>
          <p className="page-subtitle">
            Quantitative explanation layer. Deconstructs protocol risk into underlying static vulnerabilities, on-chain execution traces, and individual signal contributions.
          </p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '3px 8px', fontSize: '11px' }}
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              id="select-risk-target"
            >
              {contracts.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name} (Risk {c.riskScore})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. PRIMARY SECTION: CURRENT RISK (Section 12 Requirement) */}
      <div
        className="prism-panel"
        id="current-risk-summary"
        style={{ borderLeft: '4px solid var(--accent-red)', marginBottom: '20px' }}
      >
        <div className="prism-panel-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Current Risk Assessment
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-red)', letterSpacing: '-0.01em' }}>
                  {riskData?.status || 'ELEVATED RISK'}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'var(--accent-red)', lineHeight: 1 }}>
                    {score}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    / 100
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Target Contract: <strong style={{ color: 'var(--text-primary)' }}>{riskData?.contract}</strong> · Evaluated at {riskData?.evaluatedAt || 'recent block'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ padding: '8px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div className="meta-label">Static Contribution</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: '#D66B60', marginTop: '2px' }}>
                  +38 pts
                </div>
              </div>

              <div style={{ padding: '8px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div className="meta-label">Runtime Contribution</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-sand)', marginTop: '2px' }}>
                  +34 pts
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WHY?: Static Signals vs Runtime Signals (Section 12 Requirement) */}
      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Static Signals */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-header">
            <div className="panel-title-group">
              <FileCode size={14} color="#D66B60" />
              <span>Static Signals</span>
            </div>
            <span className="mono" style={{ fontSize: '11px', color: '#D66B60', fontWeight: 600 }}>
              +38 pts
            </span>
          </div>

          <div className="prism-panel-body" style={{ padding: 0 }}>
            {riskData?.staticSignals?.map((sig, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  borderBottom: idx === riskData.staticSignals.length - 1 ? 'none' : '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {sig.factor}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: sig.contribution.startsWith('-') ? 'var(--accent-teal)' : '#D66B60'
                    }}
                  >
                    {sig.contribution}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '4px' }}>
                  {sig.explanation}
                </div>

                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Source: {sig.source}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Runtime Signals */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-header">
            <div className="panel-title-group">
              <Activity size={14} color="var(--accent-sand)" />
              <span>Runtime Signals</span>
            </div>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-sand)', fontWeight: 600 }}>
              +34 pts
            </span>
          </div>

          <div className="prism-panel-body" style={{ padding: 0 }}>
            {riskData?.runtimeSignals?.map((sig, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  borderBottom: idx === riskData.runtimeSignals.length - 1 ? 'none' : '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {sig.factor}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--accent-sand)'
                    }}
                  >
                    {sig.contribution}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '4px' }}>
                  {sig.explanation}
                </div>

                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Source: {sig.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CONCLUSION: Human-Readable Analytical Conclusion (Section 12 Requirement) */}
      <div className="prism-panel" id="risk-analytical-conclusion" style={{ marginBottom: '20px' }}>
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <AlertTriangle size={14} color="var(--accent-sand)" />
            <span>Conclusion: Primary Concern</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Analytical Synthesis</span>
        </div>

        <div className="prism-panel-body" style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '16px' }}>
            {riskData?.summaryConclusion?.primaryConcern ||
              'The current risk level is primarily driven by an existing contract vulnerability combined with abnormal oracle behavior observed during runtime.'}
          </p>

          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.04em' }}>
            What to Investigate Next
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {riskData?.summaryConclusion?.whatToInvestigate?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    {item.target}
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.35 }}>
                    {item.description}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(item.link)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <span>Investigate</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TECHNICAL MODEL METADATA (Shown strictly as statistical model metadata, not buzzwords) */}
      <div className="prism-panel" id="model-metadata-section" style={{ marginBottom: 0 }}>
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <Cpu size={13} color="var(--text-muted)" />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Classifier &amp; Anomaly Model Metadata</span>
          </div>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Statistical Inference Parameters
          </span>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="prism-table">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Version</th>
                <th>Inference Score</th>
                <th>Feature Vector</th>
                <th>Operational Scope</th>
              </tr>
            </thead>
            <tbody>
              {riskData?.modelMetadata?.map((m, idx) => (
                <tr key={idx}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{m.modelName}</strong>
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>{m.version}</td>
                  <td className="mono" style={{ color: 'var(--accent-sand)' }}>{m.score}</td>
                  <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {Array.isArray(m.features) ? m.features.join(', ') : m.features}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '11px', maxWidth: '300px' }}>
                    {m.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
