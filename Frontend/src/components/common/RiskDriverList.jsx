import React from 'react';
import SeverityBadge from './SeverityBadge.jsx';
import { useRouter } from '../../router.jsx';
import { ArrowUpRight } from './Icons.jsx';

export default function RiskDriverList({ drivers = [] }) {
  const { navigate } = useRouter();

  if (!drivers || drivers.length === 0) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
        No elevated risk drivers identified. Protocol operating within nominal parameters.
      </div>
    );
  }

  return (
    <div className="risk-driver-list">
      {drivers.map((driver) => (
        <div key={driver.id} className="risk-driver-row">
          <div className="risk-driver-main">
            <SeverityBadge severity={driver.severity} />
            <div className="risk-driver-info">
              <span className="risk-driver-title">{driver.title}</span>
              <span className="risk-driver-desc">{driver.explanation}</span>
              <span className="risk-driver-source">
                Source: <strong style={{ color: 'var(--text-secondary)' }}>{driver.source}</strong>
                {driver.targetContract && ` · Target: ${driver.targetContract}`}
              </span>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(driver.linkTarget)}
              title="Inspect Evidence"
            >
              <span>Evidence</span>
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
