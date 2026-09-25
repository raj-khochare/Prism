import React from 'react';

/**
 * Technical restrained loading indicator.
 * No fake progress bars, zero generic skeletons.
 */
export default function LoadingState({ message = 'Retrieving security telemetry...' }) {
  return (
    <div className="state-box" style={{ padding: '32px 20px' }}>
      <div className="compact-loader">
        <div className="compact-loader-spinner" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function InlineLoadingIndicator({ label = 'Querying...' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      <div className="compact-loader-spinner" style={{ width: '12px', height: '12px' }} />
      <span>{label}</span>
    </div>
  );
}
