import React, { useState, useEffect } from 'react';
import { useRouter } from '../router.jsx';
import { securityApi } from '../services/apiClient.js';
import SecurityConclusionBanner from '../components/common/SecurityConclusionBanner.jsx';
import RiskDriverList from '../components/common/RiskDriverList.jsx';
import PriorityInvestigationCard from '../components/common/PriorityInvestigationCard.jsx';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { formatTxHash, formatNumber } from '../utils/formatters.js';
import {
  ShieldAlert,
  ArrowRight,
  Activity,
  AlertTriangle,
  FileCode
} from '../components/common/Icons.jsx';

export default function Overview() {
  const { navigate } = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await securityApi.getOverviewData();
      if (res.success) {
        setData(res.data);
      } else {
        setError('Unable to aggregate protocol security intelligence.');
      }
    } catch {
      setError('Communication with the security operations service failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingState message="Synthesizing protocol security conclusion..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Intelligence Aggregation Error"
        message={error}
        onRetry={loadData}
      />
    );
  }

  const {
    securityStatus,
    riskDrivers,
    recentEvents,
    priorityInvestigation
  } = data || {};

  return (
    <div>
      {/* 1. Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">
            Protocol risk state synthesized from Solidity static analysis, post-deployment execution telemetry, and runtime anomaly detection.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/scan')}
            id="btn-quick-scan"
          >
            <FileCode size={13} color="var(--accent-teal)" />
            <span>Scan Contract</span>
          </button>
        </div>
      </div>

      {/* 2. CONCLUSION: Primary Security Status Banner (Visually Dominant) */}
      <SecurityConclusionBanner
        statusLevel={securityStatus?.statusLevel ?? 'NO DATA'}
        score={securityStatus?.unifiedScore ?? 0}
        maxScore={securityStatus?.maxScore || 100}
        highFindings={securityStatus?.highFindingsCount ?? 0}
        runtimeAnomalies={securityStatus?.runtimeAnomaliesCount ?? 0}
        activeAlerts={securityStatus?.activeAlertsCount ?? 0}
        isDemoData={securityStatus?.isDemoData}
        actionText="Investigate Risk Drivers"
        actionRoute="/risk"
      />

      {/* 3. REASONS: Why is this risk elevated? */}
      <div className="prism-panel" id="why-risk-elevated">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <AlertTriangle size={14} color="var(--accent-sand)" />
            <span>Why is this risk elevated?</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/risk')}
          >
            <span>Full Decomposition</span>
            <ArrowRight size={12} />
          </button>
        </div>
        <RiskDriverList drivers={riskDrivers} />
      </div>

      {/* Two Column Section: WHAT HAPPENED? & WHAT SHOULD I INVESTIGATE? */}
      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* 4. WHAT HAPPENED?: Concise Recent Event Stream */}
        <div className="prism-panel" style={{ marginBottom: 0 }} id="what-happened">
          <div className="prism-panel-header">
            <div className="panel-title-group">
              <Activity size={14} color="var(--accent-teal)" />
              <span>What happened?</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/runtime')}
              id="btn-view-all-events"
            >
              <span>View all events</span>
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="prism-panel-body" style={{ padding: 0 }}>
            {recentEvents && recentEvents.length > 0 ? (
              <div>
                {recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    style={{
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '14px',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    className="overview-event-item"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {evt.timestamp}
                        </span>
                        <SeverityBadge severity={evt.severity} />
                        <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          {evt.title}
                        </strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {evt.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>Target: <strong style={{ color: 'var(--text-primary)' }}>{evt.contract}</strong></span>
                        <span>·</span>
                        <span className="mono">Block #{formatNumber(evt.block)}</span>
                        <span>·</span>
                        <span className="mono">Tx {formatTxHash(evt.txHash)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                No recent critical events recorded.
              </div>
            )}
          </div>
        </div>

        {/* 5. WHAT SHOULD I INVESTIGATE?: Priority Investigation Surface */}
        <div>
          <PriorityInvestigationCard investigation={priorityInvestigation} />
        </div>
      </div>

      {/* 6. DETAILED EVIDENCE: Secondary Infrastructure Baseline (Subordinate to Security State)
      {systemStatus && systemStatus.length > 0 && (
        <div
          className="prism-panel"
          id="secondary-infrastructure-baseline"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1.5px solid var(--border-default)',
            boxShadow: 'var(--shadow-hard-xs)',
            marginBottom: '10px'
          }}
        >
          <div
            style={{
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #DDD9CC',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            <span>Telemetry &amp; Ingestion Subsystem Baseline (Secondary Telemetry)</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>NOMINAL BASELINE</span>
          </div>
          <div
            style={{
              padding: '12px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}
          >
            {systemStatus.map((sys, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #111111',
                  borderRadius: 'var(--radius-xs)'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>{sys.component}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#111111' }}>
                  <span className="status-dot healthy"></span>
                  <span>{sys.status}</span>
                </span>
              </div>
            ))} */}
          {/* </div>
        </div>
      )} */}
    </div>
  );
}

