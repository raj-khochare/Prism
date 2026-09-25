import React from 'react';
import { useRouter } from '../../router.jsx';
import { formatAddress, formatTxHash } from '../../utils/formatters.js';
import { Search, ArrowRight, ShieldCheck, AlertCircle } from './Icons.jsx';

export default function PriorityInvestigationCard({ investigation }) {
  const { navigate } = useRouter();

  if (!investigation) return null;

  return (
    <div className="priority-investigation-box" id="priority-investigation">
      <div className="investigation-header">
        <div className="investigation-title">
          <AlertCircle size={16} color="var(--accent-sand)" />
          <span>Priority Investigation: {investigation.title}</span>
        </div>
        <span className="badge-severity medium">Action Recommended</span>
      </div>

      <p className="investigation-summary">
        {investigation.summary}
      </p>

      <div className="investigation-meta-grid">
        <div className="investigation-meta-item">
          <span className="meta-label">Affected Contract</span>
          <span className="meta-value">{investigation.affectedContract}</span>
          {investigation.affectedContractAddress && (
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {formatAddress(investigation.affectedContractAddress, 8, 6)}
            </span>
          )}
        </div>

        <div className="investigation-meta-item">
          <span className="meta-label">Related Blocks</span>
          <span className="meta-value">{investigation.relatedBlocks}</span>
        </div>

        <div className="investigation-meta-item">
          <span className="meta-label">Related Transactions</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {investigation.relatedTransactions?.map((tx, idx) => (
              <span key={idx} className="meta-value">
                {formatTxHash(tx)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {investigation.investigationSteps && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.04em' }}>
            Recommended Protocol Triage Steps
          </div>
          <ul style={{ paddingLeft: '18px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {investigation.investigationSteps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate(investigation.actionRoute || '/runtime')}
          id="btn-view-investigation"
        >
          <span>View Investigation Traces</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
