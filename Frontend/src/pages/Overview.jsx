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
  Radio,
  FileCode,
  CheckCircle2
} from 'lucide-react';

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
    priorityInvestigation,
    systemStatus
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
            <FileCode size={13} />
            <span>Scan Contract</span>
          </button>
        </div>
      </div>

      {/* 2. CONCLUSION: Primary Security Status Banner */}
      <SecurityConclusionBanner
        statusLevel={securityStatus?.statusLevel || 'ELEVATED RISK'}
        score={securityStatus?.unifiedScore || 72}
        maxScore={securityStatus?.maxScore || 100}
        highFindings={securityStatus?.highFindingsCount || 3}
        runtimeAnomalies={securityStatus?.runtimeAnomaliesCount || 2}
        activeAlerts={securityStatus?.activeAlertsCount || 1}
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
      <div className="grid-2" style={{ marginBottom: '16px' }}>
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
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {evt.timestamp}
                        </span>
                        <SeverityBadge severity={evt.severity} />
                        <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          {evt.title}
                        </strong>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {evt.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>Target: <strong style={{ color: 'var(--text-secondary)' }}>{evt.contract}</strong></span>
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
    </div>
  );
}
