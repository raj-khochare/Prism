import React, { useState } from 'react';
import SeverityBadge from './SeverityBadge.jsx';
import { formatTxHash, formatNumber } from '../../utils/formatters.js';
import { ChevronDown, ChevronRight, Terminal } from './Icons.jsx';

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
      <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
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
            <th style={{ width: '32px', textAlign: 'center' }}></th>
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
                  <td style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px 4px' }}>
                    {isExpanded ? <ChevronDown size={13} color="var(--accent-teal)" /> : <ChevronRight size={13} />}
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
                  <td className="mono" style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 600 }}>
                    {evt.eventType || 'EXECUTION_TRACE'}
                  </td>
                  <td className="mono">
                    #{formatNumber(evt.block)}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {formatTxHash(evt.txHash)}
                  </td>
                  <td style={{ maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {evt.description}
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={showContract ? 8 : 7} style={{ padding: 0 }}>
                      <div className="expanded-row-details">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '12px' }}>
                          <div>
                            <span className="meta-label">Full Transaction Hash</span>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-teal)', wordBreak: 'break-all', marginTop: '2px' }}>
                              {evt.txHash}
                            </div>
                          </div>
                          <div>
                            <span className="meta-label">Gas Consumed</span>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px' }}>
                              {evt.gasUsed ? `${evt.gasUsed} gas` : '—'}
                            </div>
                          </div>
                        </div>

                        {evt.traceSummary && (
                          <div>
                            <span className="meta-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <Terminal size={11} color="var(--accent-teal)" />
                              <span>Execution Call Trace</span>
                            </span>
                            <div
                              className="mono"
                              style={{
                                padding: '10px 14px',
                                backgroundColor: '#07090A',
                                border: '1.5px solid var(--border-default)',
                                borderRadius: 'var(--radius-xs)',
                                fontSize: '11px',
                                color: 'var(--text-primary)',
                                overflowX: 'auto',
                                lineHeight: 1.5
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
