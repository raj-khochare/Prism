import React from 'react';
import { AlertCircle } from 'lucide-react';

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
        gap: '12px',
        padding: '14px 16px',
        backgroundColor: 'var(--accent-red-bg)',
        border: '1px solid var(--accent-red-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px'
      }}
      role="alert"
    >
      <AlertCircle size={16} color="var(--accent-red)" style={{ marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-red)' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
          {message || 'The requested operation could not complete. Verify parameters and retry.'}
        </div>
        {onRetry && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRetry}
            style={{ marginTop: '10px' }}
          >
            Retry Request
          </button>
        )}
      </div>
    </div>
  );
}
