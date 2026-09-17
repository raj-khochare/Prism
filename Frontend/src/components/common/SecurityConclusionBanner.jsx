import React from 'react';
import { useRouter } from '../../router.jsx';
import { ShieldAlert, ArrowRight } from 'lucide-react';

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
          <span className="conclusion-eyebrow">Security Status</span>
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
            <span className="conclusion-stat-pill">{highFindings}</span> High Findings
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>
            <span className="conclusion-stat-pill">{runtimeAnomalies}</span> Runtime Anomalies
          </span>
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span>
            <span className="conclusion-stat-pill">{activeAlerts}</span> Active Alert
          </span>
        </div>
      </div>

      <div className="security-conclusion-right">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(actionRoute)}
          id="btn-investigate-conclusion"
        >
          <span>{actionText}</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
