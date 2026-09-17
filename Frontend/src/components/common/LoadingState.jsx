import React from 'react';

export function SkeletonRow({ cols = 4, height = 24 }) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            flex: i === 0 ? 2 : 1,
            height: `${height}px`,
            marginBottom: 0
          }}
        />
      ))}
    </div>
  );
}

export default function LoadingState({ message = 'Retrieving security telemetry...' }) {
  return (
    <div className="state-box" style={{ padding: '36px 20px' }}>
      <div
        style={{
          width: '20px',
          height: '20px',
          border: '2px solid var(--border-subtle)',
          borderTopColor: 'var(--accent-teal)',
          borderRadius: '50%',
          animation: 'prism-spin 0.75s linear infinite',
          marginBottom: '10px'
        }}
      />
      <style>{`@keyframes prism-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <span className="state-desc">{message}</span>
    </div>
  );
}
