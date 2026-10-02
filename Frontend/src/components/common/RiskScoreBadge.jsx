import React from 'react';
import { getRiskLevel } from '../../utils/formatters.js';

export default function RiskScoreBadge({ score = 0, showScale = false }) {
  const levelInfo = getRiskLevel(score);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '13px',
          color: levelInfo.color
        }}
      >
        {score}
      </span>
      {showScale && (
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 100</span>
      )}
    </div>
  );
}
