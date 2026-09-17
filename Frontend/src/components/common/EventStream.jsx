import React, { useState } from 'react';
import SeverityBadge from './SeverityBadge.jsx';
import { formatTxHash, formatNumber } from '../../utils/formatters.js';
import { ChevronDown, ChevronRight, Terminal, Activity } from 'lucide-react';

export default function EventStream({
  events = [],
  showContract = true,
  maxDisplay = null,
  emptyMessage = 'No runtime execution events detected.'
}) {
  const [expandedId, setExpandedId] = useState(null);

  const displayEvents = maxDisplay ? events.slice(0, maxDisplay) : events;

  if (!displayEvents || displayEvents.length === 0) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
        {emptyMessage}
      </div>
    );
  }

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="table-container">
      <table className="prism-table" aria-label="Runtime Event Stream">
        <thead>
          <tr>
            <th style={{ width: '28px' }}></th>
            <th>Timestamp</th>
            {showContract && <th>Target Contract</th>}
            <th>Severity</th>
            <th>Event Type</th>
            <th>Block</th>
            <th>Transaction Hash</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {displayEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <React.Fragment key={evt.id}>
                <tr
                  onClick={() => toggleExpand(evt.id)}
                  style={{ cursor: 'pointer' }}
                  className={isExpanded ? 'row-selected' : ''}
                >
                  <td style={{ color: 'var(--text-muted)', textAlign: 'center', paddingRight: 0 }}>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {evt.timestamp}
                  </td>
                  {showContract && (
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{evt.contract}</strong>
                    </td>
                  )}
                  <td>
                    <SeverityBadge severity={evt.severity} />
                  </td>
                  <td className="mono" style={{ fontSize: '11px', color: 'var(--accent-teal)' }}>
                    {evt.eventType || 'EXECUTION_TRACE'}
                  </td>
                  <td className="mono">
                    #{formatNumber(evt.block)}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {formatTxHash(evt.txHash)}
                  </td>
                  <td style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {evt.description}
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={showContract ? 8 : 7} style={{ padding: 0 }}>
                      <div className="expanded-row-details">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '10px' }}>
                          <div>
                            <span className="meta-label">Full Transaction Hash</span>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                              {evt.txHash}
                            </div>
                          </div>
                          <div>
                            <span className="meta-label">Gas Consumed</span>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                              {evt.gasUsed || '—'} gas
                            </div>
                          </div>
                        </div>

                        {evt.traceSummary && (
                          <div>
                            <span className="meta-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                              <Terminal size={11} />
                              <span>Execution Call Trace</span>
                            </span>
                            <div
                              className="mono"
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#07090A',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-xs)',
                                fontSize: '11px',
                                color: 'var(--text-primary)',
                                overflowX: 'auto'
                              }}
                            >
                              {evt.traceSummary}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
