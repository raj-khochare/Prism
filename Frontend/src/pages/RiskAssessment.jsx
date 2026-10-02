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
} from '../components/common/Icons.jsx';

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
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Target:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '11px' }}
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

      {/* 1. PRIMARY SECTION: CURRENT RISK (Visually Dominant) */}
      <div
        className="prism-panel"
        id="current-risk-summary"
        style={{ border: '3px solid var(--accent-red)', boxShadow: 'var(--shadow-hard-xl)', marginBottom: '24px' }}
      >
        <div className="prism-panel-body" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-sand)', marginBottom: '6px' }}>
                Current Risk Assessment
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '26px', fontWeight: 900, color: 'var(--accent-red)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                  {riskData?.status || 'ELEVATED RISK'}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', backgroundColor: 'var(--bg-elevated)', padding: '4px 10px', border: '1.5px solid var(--border-default)', boxShadow: '2px 2px 0px #000' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 800, color: 'var(--accent-red)', lineHeight: 1 }}>
                    {score}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                    / 100
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Target Contract: <strong style={{ color: 'var(--text-primary)' }}>{riskData?.contract}</strong> · Evaluated at {riskData?.evaluatedAt || 'recent block'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ padding: '10px 16px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-xs)', border: '2px solid var(--border-default)', boxShadow: '2px 2px 0px #000', textAlign: 'center' }}>
                <div className="meta-label">Static Contribution</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-red)', marginTop: '4px' }}>
                  +38 pts
                </div>
              </div>

              <div style={{ padding: '10px 16px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-xs)', border: '2px solid var(--border-default)', boxShadow: '2px 2px 0px #000', textAlign: 'center' }}>
                <div className="meta-label">Runtime Contribution</div>
                <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-sand)', marginTop: '4px' }}>
                  +34 pts
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WHY?: Static Signals vs Runtime Signals */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Static Signals */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-header">
            <div className="panel-title-group">
              <FileCode size={14} color="var(--accent-red)" />
              <span>Static Signals Decomposition</span>
            </div>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 800 }}>
              +38 pts
            </span>
          </div>

          <div className="prism-panel-body" style={{ padding: 0 }}>
            {riskData?.staticSignals?.map((sig, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  borderBottom: idx === riskData.staticSignals.length - 1 ? 'none' : '1px solid var(--border-default)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {sig.factor}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: sig.contribution.startsWith('-') ? 'var(--accent-teal)' : 'var(--accent-red)'
                    }}
                  >
                    {sig.contribution}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '6px' }}>
                  {sig.explanation}
                </div>

                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Source: <strong style={{ color: 'var(--text-secondary)' }}>{sig.source}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Runtime Signals */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-header">
            <div className="panel-title-group">
              <Activity size={14} color="var(--accent-amber)" />
              <span>Runtime Signals Decomposition</span>
            </div>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 800 }}>
              +34 pts
            </span>
          </div>

          <div className="prism-panel-body" style={{ padding: 0 }}>
            {riskData?.runtimeSignals?.map((sig, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  borderBottom: idx === riskData.runtimeSignals.length - 1 ? 'none' : '1px solid var(--border-default)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {sig.factor}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: 'var(--accent-amber)'
                    }}
                  >
                    {sig.contribution}
                  </span>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '6px' }}>
                  {sig.explanation}
                </div>

                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Source: <strong style={{ color: 'var(--text-secondary)' }}>{sig.source}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CONCLUSION: Human-Readable Analytical Conclusion */}
      <div className="prism-panel" id="risk-analytical-conclusion" style={{ marginBottom: '24px' }}>
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <AlertTriangle size={14} color="var(--accent-sand)" />
            <span>Conclusion: Primary Concern</span>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Analytical Synthesis</span>
        </div>

        <div className="prism-panel-body" style={{ padding: '18px 22px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: '18px' }}>
            {riskData?.summaryConclusion?.primaryConcern ||
              'The current risk level is primarily driven by an existing contract vulnerability combined with abnormal oracle behavior observed during runtime.'}
          </p>

          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.06em' }}>
            What to Investigate Next
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {riskData?.summaryConclusion?.whatToInvestigate?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1.5px solid var(--border-default)',
                  boxShadow: '2px 2px 0px #000',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                    {item.target}
                  </strong>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    {item.description}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(item.link)}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <span>Investigate Evidence</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TECHNICAL MODEL METADATA (Statistical model metadata, strictly technical) */}
      <div className="prism-panel" id="model-metadata-section" style={{ marginBottom: 0 }}>
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <Cpu size={14} color="var(--text-muted)" />
            <span>Statistical Inference Models &amp; Detectors</span>
          </div>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            EVALUATION PARAMETERS
          </span>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
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
                  <td className="mono" style={{ color: 'var(--accent-sand)', fontWeight: 700 }}>{m.score}</td>
                  <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                    {Array.isArray(m.features) ? m.features.join(', ') : m.features}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '11px', maxWidth: '320px' }}>
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
