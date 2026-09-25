import React from 'react';

export default function TermsConditions() {
  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Terms &amp; Conditions</h1>
          <p className="page-subtitle">
            Operating parameters, evaluation boundaries, and usage specifications for the PRISM platform.
          </p>
        </div>
      </div>

      <div className="prism-panel">
        <div className="prism-panel-body" style={{ padding: '24px', lineHeight: 1.6, fontSize: '13px', color: 'var(--text-primary)' }}>
          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1. Platform Scope and Operational Nature
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              PRISM provides automated static vulnerability detection and heuristic runtime anomaly monitoring for Ethereum Virtual Machine (EVM) compatible contracts. The platform is designed as an auxiliary security engineering tool and does not constitute a formal smart contract audit, legal counsel, or an absolute guarantee of vulnerability-free protocol operation.
            </p>
          </section>

          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. User Obligations &amp; Permitted Usage
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Users are responsible for ensuring they possess authorization to monitor, scan, and evaluate target smart contracts. PRISM must not be utilized to execute unauthorized denial-of-service attempts, adversarial reentrancy attacks, or exploit attempts against third-party decentralized protocols.
            </p>
          </section>

          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3. Telemetry and Analysis Determinism
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Static analysis results and runtime anomaly scores represent mathematical heuristics calibrated on historical exploit patterns. Blockchain networks are subject to re-organizations, network latency, and mempool volatility that may impact detection timelines.
            </p>
          </section>

          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              4. Disclaimer of Protocol Liability
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              The software is provided on an "as is" and "as available" basis without warranty of any kind. Under no circumstances shall the platform developers or contributors be held liable for smart contract economic losses, exploit outcomes, or token value depreciation resulting from reliance on platform telemetry.
            </p>
          </section>

          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
            PRISM Platform Specification &bull; Last Revised September 2026
          </div>
        </div>
      </div>
    </div>
  );
}
