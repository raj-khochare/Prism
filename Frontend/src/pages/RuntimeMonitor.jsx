import React, { useState, useEffect } from 'react';
import { securityApi } from '../services/apiClient.js';
import { useApp } from '../context/AppContext.jsx';
import RestrainedChart from '../components/common/RestrainedChart.jsx';
import EventStream from '../components/common/EventStream.jsx';
import Pagination from '../components/common/Pagination.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { formatNumber } from '../utils/formatters.js';
import {
  Activity,
  Radio,
  Search,
  Filter,
  AlertTriangle,
  Server,
  Layers
} from 'lucide-react';
import { useRouter } from '../router.jsx';

export default function RuntimeMonitor() {
  const { network, currentBlock } = useApp();
  const { getQueryParam } = useRouter();
  const queryContract = getQueryParam('contract');

  const [selectedContract, setSelectedContract] = useState(queryContract || 'LendingPoolCore');
  const [contracts, setContracts] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [eventsData, setEventsData] = useState({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Event stream filters
  const [eventSearch, setEventSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, tRes, eRes] = await Promise.all([
        securityApi.getContracts({ pageSize: 50 }),
        securityApi.getRuntimeTelemetry(selectedContract),
        securityApi.getRuntimeEvents({
          contract: selectedContract === 'All' ? 'All' : selectedContract,
          search: eventSearch,
          severity: severityFilter,
          eventType: eventTypeFilter,
          page,
          pageSize
        })
      ]);

      if (cRes.success) setContracts(cRes.data.items);
      if (tRes.success) setTelemetry(tRes.data);
      if (eRes.success) setEventsData(eRes.data);
    } catch {
      setError('Unable to stream runtime telemetry from EVM node pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedContract, eventSearch, severityFilter, eventTypeFilter, page, pageSize]);

  if (loading && !telemetry) {
    return <LoadingState message="Connecting to runtime telemetry pipeline..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Runtime Pipeline Offline"
        message={error}
        onRetry={loadData}
      />
    );
  }

  const series = telemetry?.series || [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-title">Runtime Monitor</h1>
          <p className="page-subtitle">
            Post-deployment execution monitoring, transaction velocity anomaly detection, and real-time oracle price divergence telemetry.
          </p>
        </div>
        <div className="page-actions">
          <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span className="status-dot healthy"></span>
            Streaming Cancun Traces
          </span>
        </div>
      </div>

      {/* 1. CONCISE SUMMARY RIBBON (Section 11 Requirement) */}
      <div className="prism-panel" id="runtime-summary-ribbon">
        <div className="prism-panel-body" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="select-target-contract">Target Contract</label>
              <select
                id="select-target-contract"
                className="form-select"
                value={selectedContract}
                onChange={(e) => {
                  setSelectedContract(e.target.value);
                  setPage(1);
                }}
              >
                <option value="All">All Monitored Targets</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.chain})</option>
                ))}
              </select>
            </div>

            <div>
              <span className="meta-label">Network</span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {network}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                EVM Standard (Cancun)
              </div>
            </div>

            <div>
              <span className="meta-label">Latest Block</span>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                #{formatNumber(currentBlock)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="status-dot healthy"></span>
                Head Synchronized
              </div>
            </div>

            <div>
              <span className="meta-label">Last Detection</span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-sand)', marginTop: '2px' }}>
                {telemetry?.latestDetection || 'Nominal execution baseline'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Observed in block #18,492,815
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MEANINGFUL ANALYTICAL CHARTS (Answering Specific Questions) */}
      <div className="grid-2" style={{ marginBottom: '16px' }} id="runtime-charts-grid">
        {/* Chart 1: Transaction Velocity */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-body" style={{ padding: '14px 16px' }}>
            <RestrainedChart
              data={series}
              dataKey="velocity"
              timeKey="time"
              title="Transaction Velocity"
              question="Has transaction activity changed significantly?"
              unit="tx/min"
              color="var(--accent-teal)"
              warningThreshold={80}
              criticalThreshold={120}
              height={150}
            />
          </div>
        </div>

        {/* Chart 2: Oracle Price Deviation */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-body" style={{ padding: '14px 16px' }}>
            <RestrainedChart
              data={series}
              dataKey="deviation"
              timeKey="time"
              title="Oracle Price Deviation"
              question="Has oracle behavior deviated from reference TWAP?"
              unit="%"
              color="var(--accent-sand)"
              warningThreshold={1.5}
              criticalThreshold={2.0}
              height={150}
            />
          </div>
        </div>

        {/* Chart 3: Gas Consumption Behavior */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-body" style={{ padding: '14px 16px' }}>
            <RestrainedChart
              data={series}
              dataKey="gas"
              timeKey="time"
              title="Gas Consumption"
              question="Is execution consuming abnormal computational steps?"
              unit="k gas"
              color="var(--accent-teal)"
              warningThreshold={80}
              criticalThreshold={130}
              height={150}
            />
          </div>
        </div>

        {/* Chart 4: Liquidity Movement */}
        <div className="prism-panel" style={{ marginBottom: 0 }}>
          <div className="prism-panel-body" style={{ padding: '14px 16px' }}>
            <RestrainedChart
              data={series}
              dataKey="flow"
              timeKey="time"
              title="Liquidity Movement"
              question="Has liquidity moved unusually across blocks?"
              unit="k USDC"
              color="var(--accent-red)"
              warningThreshold={1500}
              criticalThreshold={3000}
              height={150}
            />
          </div>
        </div>
      </div>

      {/* 3. SCALABLE RUNTIME EVENT STREAM */}
      <div className="prism-panel" id="runtime-event-stream-section">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <Activity size={14} color="var(--accent-teal)" />
            <span>Runtime Event Stream</span>
          </div>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {eventsData.total} Total Traced Events
          </span>
        </div>

        <div className="prism-panel-body" style={{ padding: '12px 16px 0 16px' }}>
          {/* Stream Filter Bar */}
          <div className="filter-bar" style={{ marginBottom: '12px' }}>
            <div className="search-input-wrapper">
              <Search size={13} />
              <input
                type="text"
                placeholder="Search event type, tx hash, or description..."
                value={eventSearch}
                onChange={(e) => {
                  setEventSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search events"
              />
            </div>

            <div className="filter-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Severity:</span>
                <select
                  className="form-select"
                  value={severityFilter}
                  onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                  aria-label="Filter events by severity"
                >
                  <option value="All">All</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type:</span>
                <select
                  className="form-select"
                  value={eventTypeFilter}
                  onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
                  aria-label="Filter events by type"
                >
                  <option value="All">All Types</option>
                  <option value="REENTRANCY_INVOCATION">Reentrancy Invocation</option>
                  <option value="UNEXPECTED_BALANCE_DRAIN">Balance Drain</option>
                  <option value="RAPID_SWAP_SEQUENCE">Rapid Swap Sequence</option>
                  <option value="ORACLE_PRICE_DEVIATION">Oracle Deviation</option>
                  <option value="GAS_BURST_ANOMALY">Gas Burst Anomaly</option>
                  <option value="NORMAL_TELEMETRY">Normal Telemetry</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Event Stream Table with Expandable Call Trace */}
        <EventStream
          events={eventsData.items}
          showContract={true}
          emptyMessage="No runtime execution anomalies recorded for the current filter criteria."
        />

        {/* Server-ready Pagination */}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={eventsData.total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
