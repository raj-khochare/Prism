import React, { useState, useEffect } from 'react';
import { useRouter } from '../router.jsx';
import { securityApi } from '../services/apiClient.js';
import SeverityBadge from '../components/common/SeverityBadge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatTxHash } from '../utils/formatters.js';
import {
  Bell,
  Sliders,
  CheckCircle,
  Check,
  X,
  Eye,
  ExternalLink
} from '../components/common/Icons.jsx';

export default function Alerts() {
  const { navigate } = useRouter();
  const [alertsData, setAlertsData] = useState({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configuration state
  const [riskThreshold, setRiskThreshold] = useState(75);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramChat, setTelegramChat] = useState('@prism_protocol_secops');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailRecipient, setEmailRecipient] = useState('sec-alerts@protocol.io');
  const [configSaved, setConfigSaved] = useState(false);

  // Filter & Detail state
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewingAlert, setViewingAlert] = useState(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await securityApi.getAlerts({
        status: statusFilter,
        severity: severityFilter,
        page,
        pageSize
      });
      if (res.success) {
        setAlertsData(res.data);
      } else {
        setError('Failed to query protocol security alerts.');
      }
    } catch {
      setError('Communication with the alert dispatcher subsystem failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter, page, pageSize]);

  const handleAcknowledge = async (id) => {
    const res = await securityApi.acknowledgeAlert(id);
    if (res.success) {
      loadAlerts();
      if (viewingAlert && viewingAlert.id === id) {
        setViewingAlert({ ...viewingAlert, status: 'Acknowledged', acknowledged: true });
      }
    }
  };

  const handleDismiss = async (id) => {
    const res = await securityApi.dismissAlert(id);
    if (res.success) {
      loadAlerts();
      if (viewingAlert && viewingAlert.id === id) {
        setViewingAlert({ ...viewingAlert, status: 'Dismissed', acknowledged: true });
      }
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">
            Threshold notification triggers, broadcast channel configurations, and operational security incident triage log.
          </p>
        </div>
      </div>

      {error && <ErrorState title="Alert Subsystem Error" message={error} onRetry={loadAlerts} />}

      {/* 1. CONFIGURATION PANEL (Risk Threshold, Telegram, Email) */}
      <div className="prism-panel" id="alert-configuration-panel">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <Sliders size={14} color="var(--accent-teal)" />
            <span>Alert Pipeline Configuration</span>
          </div>
          {configSaved && (
            <span style={{ fontSize: '11px', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
              <CheckCircle size={13} color="var(--accent-teal)" />
              Configuration updated
            </span>
          )}
        </div>

        <div className="prism-panel-body">
          <form onSubmit={handleSaveConfig}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'flex-start' }}>
              {/* Risk Threshold */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="input-risk-threshold">
                    Trigger Risk Threshold
                  </label>
                  <span className="mono" style={{ fontSize: '12px', fontWeight: 800, color: riskThreshold >= 75 ? 'var(--accent-red)' : 'var(--accent-sand)' }}>
                    {riskThreshold} / 100
                  </span>
                </div>
                <input
                  id="input-risk-threshold"
                  type="range"
                  min="30"
                  max="95"
                  step="5"
                  value={riskThreshold}
                  onChange={(e) => setRiskThreshold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-teal)' }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Triggers urgent incident notifications when unified risk score reaches or exceeds this level.
                </span>
              </div>

              {/* Telegram Channel */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="chk-telegram"
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                  />
                  <label className="form-label" htmlFor="chk-telegram" style={{ marginBottom: 0 }}>
                    Telegram Notification Webhook
                  </label>
                </div>
                <input
                  type="text"
                  className="form-input mono"
                  value={telegramChat}
                  onChange={(e) => setTelegramChat(e.target.value)}
                  disabled={!telegramEnabled}
                  placeholder="@secops_alerts_bot"
                  style={{ marginTop: '6px' }}
                />
              </div>

              {/* Email Integration */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    id="chk-email"
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                  />
                  <label className="form-label" htmlFor="chk-email" style={{ marginBottom: 0 }}>
                    Email Notification List
                  </label>
                </div>
                <input
                  type="email"
                  className="form-input"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  disabled={!emailEnabled}
                  placeholder="secops@protocol.io"
                  style={{ marginTop: '6px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="submit" className="btn btn-secondary btn-sm" id="btn-save-alert-config">
                Save Channel Configuration
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. ALERT LOG */}
      <div className="prism-panel" id="alert-log-panel">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <Bell size={14} color="var(--accent-teal)" />
            <span>Alert Incident Log</span>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Status:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '3px 8px', fontSize: '11px' }}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Dismissed">Dismissed</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Severity:</span>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '3px 8px', fontSize: '11px' }}
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              >
                <option value="All">All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <table className="prism-table" aria-label="Alert Incident Log Table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Target Contract</th>
                <th>Trigger Event</th>
                <th>Risk Score</th>
                <th>Timestamp</th>
                <th>Channel</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center' }}>
                    <LoadingState message="Loading alert incident log..." />
                  </td>
                </tr>
              ) : alertsData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center' }}>
                    <EmptyState
                      title="No Incident Alerts"
                      description="No alerts match the selected status or severity filters."
                    />
                  </td>
                </tr>
              ) : (
                alertsData.items.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{alert.contract}</strong>
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{alert.trigger}</span>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          fontWeight: 800,
                          fontSize: '13px',
                          color: alert.riskScore >= 75 ? 'var(--accent-red)' : 'var(--accent-sand)'
                        }}
                      >
                        {alert.riskScore}
                      </span>
                    </td>
                    <td className="mono" style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {alert.timestamp}
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {alert.channel}
                      </span>
                    </td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-default)',
                          backgroundColor: alert.status === 'Active' ? 'var(--accent-red-bg)' : 'var(--bg-elevated)',
                          color: alert.status === 'Active' ? 'var(--accent-red)' : 'var(--text-secondary)'
                        }}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* View Details */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setViewingAlert(alert)}
                          title="View Alert Evidence"
                        >
                          <Eye size={13} color="var(--text-secondary)" />
                        </button>

                        {/* Acknowledge */}
                        {alert.status !== 'Acknowledged' && alert.status !== 'Dismissed' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            style={{ fontSize: '10px', padding: '3px 8px' }}
                            title="Acknowledge Alert"
                          >
                            <Check size={11} color="var(--accent-teal)" />
                            <span>Ack</span>
                          </button>
                        )}

                        {/* Dismiss */}
                        {alert.status !== 'Dismissed' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleDismiss(alert.id)}
                            title="Dismiss Alert"
                          >
                            <X size={12} color="var(--text-muted)" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={alertsData.total}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Alert Detail Inspection Modal */}
      {viewingAlert && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setViewingAlert(null)}
        >
          <div
            className="prism-panel"
            style={{ width: '100%', maxWidth: '600px', marginBottom: 0, border: '2px solid var(--border-strong)', boxShadow: 'var(--shadow-hard-xl)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="prism-panel-header">
              <div className="panel-title-group">
                <SeverityBadge severity={viewingAlert.severity} />
                <span>Incident Triage: {viewingAlert.contract}</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setViewingAlert(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="prism-panel-body">
              <div style={{ marginBottom: '16px' }}>
                <span className="meta-label">Trigger Condition</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {viewingAlert.trigger}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px', padding: '12px 16px', backgroundColor: 'var(--bg-elevated)', border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-xs)' }}>
                <div>
                  <span className="meta-label">Unified Risk Score</span>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-red)', marginTop: '2px' }}>
                    {viewingAlert.riskScore} / 100
                  </div>
                </div>

                <div>
                  <span className="meta-label">Timestamp</span>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {viewingAlert.timestamp}
                  </div>
                </div>

                <div>
                  <span className="meta-label">Dispatch Channel</span>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {viewingAlert.channel}
                  </div>
                </div>

                <div>
                  <span className="meta-label">Current Status</span>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700, marginTop: '2px' }}>
                    {viewingAlert.status}
                  </div>
                </div>
              </div>

              {viewingAlert.txHash && (
                <div style={{ marginBottom: '18px' }}>
                  <span className="meta-label">Related Transaction Hash</span>
                  <div
                    className="mono"
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-teal)',
                      wordBreak: 'break-all',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-xs)',
                      border: '1.5px solid var(--border-default)',
                      marginTop: '4px'
                    }}
                  >
                    {viewingAlert.txHash}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setViewingAlert(null);
                    navigate(`/runtime?contract=${viewingAlert.contract}`);
                  }}
                >
                  <span>Open Runtime Evidence</span>
                  <ExternalLink size={12} />
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {viewingAlert.status !== 'Acknowledged' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAcknowledge(viewingAlert.id)}
                    >
                      Acknowledge
                    </button>
                  )}
                  {viewingAlert.status !== 'Dismissed' && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDismiss(viewingAlert.id)}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
