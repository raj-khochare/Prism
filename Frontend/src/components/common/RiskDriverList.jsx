import React from 'react';
import SeverityBadge from './SeverityBadge.jsx';
import { useRouter } from '../../router.jsx';
import { ArrowUpRight } from 'lucide-react';

export default function RiskDriverList({ drivers = [] }) {
  const { navigate } = useRouter();

  if (!drivers || drivers.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
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
                Source: {driver.source}
                {driver.targetContract && ` · Contract: ${driver.targetContract}`}
              </span>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
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
