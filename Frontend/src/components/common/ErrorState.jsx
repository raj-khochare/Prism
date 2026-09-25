import React from 'react';
import { AlertCircle } from './Icons.jsx';

export default function ErrorState({
  title = 'System Telemetry Warning',
  message,
  onRetry
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 18px',
        backgroundColor: 'var(--accent-red-bg)',
        border: '2px solid var(--accent-red)',
        boxShadow: 'var(--shadow-hard-md)',
        borderRadius: 'var(--radius-xs)',
        marginBottom: '20px'
      }}
      role="alert"
    >
      <AlertCircle size={18} color="var(--accent-red)" style={{ marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-red)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.45 }}>
          {message || 'The requested operation could not complete. Verify parameters and retry.'}
        </div>
        {onRetry && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRetry}
            style={{ marginTop: '12px' }}
          >
            Retry Request
          </button>
        )}
      </div>
    </div>
  );
}
