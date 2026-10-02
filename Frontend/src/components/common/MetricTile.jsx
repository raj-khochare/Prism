import React from 'react';

export default function MetricTile({ label, value, subtext, indicator, trendColor }) {
  return (
    <div className="metric-tile">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {indicator}
      </div>
      <div className="metric-value">{value}</div>
      {subtext && (
        <div className="metric-subtext" style={{ color: trendColor || 'var(--text-secondary)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
