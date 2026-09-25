import React from 'react';
import { useRouter } from '../../router.jsx';
import { ShieldAlert, ArrowRight } from './Icons.jsx';

export default function SecurityConclusionBanner({
  statusLevel = 'ELEVATED RISK',
  score = 72,
  maxScore = 100,
  highFindings = 3,
  runtimeAnomalies = 2,
  activeAlerts = 1,
  isDemoData = true,
  actionText = 'Investigate Risk Drivers',
  actionRoute = '/risk'
}) {
  const { navigate } = useRouter();

  return (
    <div className="security-conclusion-card" id="security-conclusion">
      <div className="security-conclusion-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={14} color="var(--accent-red)" />
          <span className="conclusion-eyebrow">Protocol Security Status Conclusion</span>
          {isDemoData && <span className="demo-pill">DEMO DATA</span>}
        </div>

        <div className="conclusion-headline">
          <span className="conclusion-status-title">{statusLevel}</span>
          <div className="conclusion-score-wrap">
            <span className="conclusion-score">{score}</span>
            <span className="conclusion-score-denom">/ {maxScore}</span>
          </div>
        </div>

        <div className="conclusion-subtext">
          <span>
            <span className="conclusion-stat-pill" style={{ color: 'var(--accent-red)' }}>{highFindings}</span> High Findings
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>
            <span className="conclusion-stat-pill" style={{ color: 'var(--accent-sand)' }}>{runtimeAnomalies}</span> Runtime Anomalies
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>
            <span className="conclusion-stat-pill" style={{ color: 'var(--accent-sand)' }}>{activeAlerts}</span> Active Alert
          </span>
        </div>
      </div>

      <div className="security-conclusion-right">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate(actionRoute)}
          id="btn-investigate-conclusion"
          style={{ padding: '9px 18px', fontSize: '13px' }}
        >
          <span>{actionText}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
