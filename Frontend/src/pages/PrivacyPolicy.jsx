import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Privacy Policy</h1>
          <p className="page-subtitle">
            Technical privacy standards, client-side isolation boundaries, and security telemetry processing policies for PRISM.
          </p>
        </div>
      </div>

      <div className="prism-panel">
        <div className="prism-panel-body" style={{ padding: '24px', lineHeight: 1.6, fontSize: '13px', color: 'var(--text-primary)' }}>
          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1. Non-Custodial Architecture
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              PRISM operates strictly as a read-only security monitoring and static analysis platform. The application never solicits, captures, stores, or processes private keys, seed phrases, signing keys, or wallet credentials. All on-chain interactions are limited to public RPC read operations.
            </p>
          </section>

          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. Source Code Confidentiality &amp; Client-Side Isolation
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Solidity smart contract source code submitted for static analysis is processed locally within the browser’s sandboxed JavaScript execution context. PRISM does not transmit uploaded source files or AST tokens to third-party artificial intelligence services, external code repositories, or third-party telemetry sinks.
            </p>
          </section>

          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3. Telemetry and Analytics Absence
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              This interface contains no third-party session recorders, trackers, advertising identifiers, or analytics scripts. Network communication is strictly confined to designated protocol RPC nodes and explicit PRISM backend services configured by the infrastructure operator.
            </p>
          </section>

          <section style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              4. Local State and Cache Management
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              User preferences, filter states, and notification channel configurations are preserved strictly in transient browser storage or local database instances managed directly by the operator.
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
