import React, { useState, useEffect } from 'react';

import { useRouter } from '../router.jsx';

import { securityApi } from '../services/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

import SeverityBadge from '../components/common/SeverityBadge.jsx';

import Pagination from '../components/common/Pagination.jsx';

import LoadingState from '../components/common/LoadingState.jsx';

import ErrorState from '../components/common/ErrorState.jsx';

import EmptyState from '../components/common/EmptyState.jsx';

import {
  formatAddress,
  formatNumber,
  formatTimestamp,
  getRiskLevel
} from '../utils/formatters.js';

import {
  Database,
  Plus,
  Search,
  Check,
  Copy,
  X,
  ArrowUpDown,
  ExternalLink
} from '../components/common/Icons.jsx';


export default function ContractRegistry() {
  const { isDeveloper } = useAuth();

  const { navigate } = useRouter();

  const [contractsData, setContractsData] = useState({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);


  // Filters & Sorting

  const [search, setSearch] = useState('');

  const [chainFilter, setChainFilter] = useState('All');

  const [riskFilter, setRiskFilter] = useState('All');

  const [statusFilter, setStatusFilter] = useState('All');

  const [sortBy, setSortBy] = useState('riskScore');

  const [sortDir, setSortDir] = useState('desc');

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);


  // Register Modal State

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newName, setNewName] = useState('');

  const [newAddress, setNewAddress] = useState('');

  const [newChain, setNewChain] = useState('Ethereum Mainnet');

  const [registering, setRegistering] = useState(false);

  const [registerError, setRegisterError] = useState(null);

  const [copiedAddr, setCopiedAddr] = useState(null);


  const loadContracts = async () => {

    setLoading(true);

    setError(null);

    try {

      const res = await securityApi.getContracts({
        search,
        chain: chainFilter,
        risk: riskFilter,
        status: statusFilter,
        sortBy,
        sortDir,
        page,
        pageSize
      });

      if (res.success) {

        setContractsData(res.data);

      } else {

        setError('Failed to query contract registry.');

      }

    } catch {

      setError(
        'Communication with the contract registry subsystem failed.'
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadContracts();

  }, [
    search,
    chainFilter,
    riskFilter,
    statusFilter,
    sortBy,
    sortDir,
    page,
    pageSize
  ]);


  const handleSort = (field) => {

    if (sortBy === field) {

      setSortDir(prev =>
        prev === 'asc' ? 'desc' : 'asc'
      );

    } else {

      setSortBy(field);

      setSortDir('desc');

    }

  };


  const handleDelete = async (contract) => {
    const ok = window.confirm(
      `Delete "${contract.name}"? Its findings, risk assessments and alerts are removed too. ` +
      'You can register it again with a new address afterwards.'
    );
    if (!ok) return;
    const res = await securityApi.deleteContract(contract.id);
    if (res.success) {
      loadContracts();
    } else {
      window.alert(res.error || 'Delete failed.');
    }
  };

  const handleRegister = async (e) => {

    e.preventDefault();

    if (!newAddress.trim()) {

      setRegisterError('Contract address is required.');

      return;

    }


    setRegistering(true);

    setRegisterError(null);

    try {

      const res = await securityApi.registerContract({

        name: newName.trim() || 'MonitoredContract',

        address: newAddress.trim(),

        chain: newChain

      });


      if (res.success) {

        setIsModalOpen(false);

        setNewName('');

        setNewAddress('');

        loadContracts();

      } else {

        setRegisterError(
          res.error || 'Registration failed.'
        );

      }

    } catch {

      setRegisterError(
        'Failed to register contract with registry service.'
      );

    } finally {

      setRegistering(false);

    }

  };


  const copyAddress = async (addr) => {

    try {

      await navigator.clipboard.writeText(addr);

      setCopiedAddr(addr);

      setTimeout(() => setCopiedAddr(null), 2000);

    } catch {

      // safe fallback

    }

  };


  return (

    <div>

      {/* Header */}

      <div className="page-header">

        <div className="page-header-text">

          <h1 className="page-title">
            Contract Registry
          </h1>

          <p className="page-subtitle">
            Catalog of registered and monitored protocol smart contracts
            across connected EVM networks.
          </p>

        </div>

        <div className="page-actions">

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
            id="btn-register-contract"
            disabled={!isDeveloper}
            title={isDeveloper ? '' : 'Reviewers have read-only access'}
          >

            <Plus size={14} />

            <span>
              Register Contract
            </span>

          </button>

        </div>

      </div>


      {error && (
        <ErrorState
          title="Registry Query Error"
          message={error}
          onRetry={loadContracts}
        />
      )}


      {/* Filter Bar */}

      <div className="filter-bar">

        <div className="search-input-wrapper">

          <Search size={14} />

          <input
            type="text"
            placeholder="Search by contract name, address, or detection..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search contracts"
            id="search-contracts-input"
          />

        </div>


        <div className="filter-group">

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >

            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontWeight: 700
              }}
            >
              Network:
            </span>

            <select
              className="form-select"
              value={chainFilter}
              onChange={(e) => {
                setChainFilter(e.target.value);
                setPage(1);
              }}
            >

              <option value="All">
                All Networks
              </option>

              <option value="Ethereum Mainnet">
                Ethereum Mainnet
              </option>

              <option value="Arbitrum One">
                Arbitrum One
              </option>

              <option value="Optimism">
                Optimism
              </option>

            </select>

          </div>


          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >

            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontWeight: 700
              }}
            >
              Risk:
            </span>

            <select
              className="form-select"
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setPage(1);
              }}
            >

              <option value="All">
                All Severities
              </option>

              <option value="Critical">
                Critical
              </option>

              <option value="High">
                High
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="Low">
                Low
              </option>

            </select>

          </div>


          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >

            <span
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                fontWeight: 700
              }}
            >
              Status:
            </span>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >

              <option value="All">
                All Statuses
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Warning">
                Warning
              </option>

              <option value="Investigating">
                Investigating
              </option>

            </select>

          </div>

        </div>

      </div>


      {/* Contract Table */}

      <div className="table-container">

        <table
          className="prism-table"
          aria-label="Monitored Contract Registry Table"
        >

          <thead>

            <tr>

              <th
                onClick={() => handleSort('name')}
                style={{ cursor: 'pointer' }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >

                  <span>
                    Contract
                  </span>

                  <ArrowUpDown
                    size={11}
                    color="var(--accent-teal)"
                  />

                </div>

              </th>


              <th>
                Address
              </th>


              <th>
                Network
              </th>


              <th
                onClick={() => handleSort('riskScore')}
                style={{ cursor: 'pointer' }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >

                  <span>
                    Risk Score
                  </span>

                  <ArrowUpDown
                    size={11}
                    color="var(--accent-teal)"
                  />

                </div>

              </th>


              <th>
                Severity
              </th>


              <th>
                Status
              </th>


              <th>
                Last Scan
              </th>


              <th
                onClick={() => handleSort('tx24h')}
                style={{ cursor: 'pointer' }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >

                  <span>
                    24h Transactions
                  </span>

                  <ArrowUpDown
                    size={11}
                    color="var(--accent-teal)"
                  />

                </div>

              </th>


              {/* NEW */}

              <th>
                Actions
              </th>

            </tr>

          </thead>


          <tbody>

            {loading ? (

              <tr>

                <td
                  colSpan={9}
                  style={{
                    padding: '30px',
                    textAlign: 'center'
                  }}
                >

                  <LoadingState
                    message="Querying registered protocol contracts..."
                  />

                </td>

              </tr>

            ) : contractsData.items.length === 0 ? (

              <tr>

                <td
                  colSpan={9}
                  style={{
                    padding: '30px',
                    textAlign: 'center'
                  }}
                >

                  <EmptyState
                    title="No Registered Contracts Match Criteria"
                    description="Try updating the filter controls or register a new contract address."
                  />

                </td>

              </tr>

            ) : (

              contractsData.items.map((contract) => {

                const riskLevel =
                  getRiskLevel(contract.riskScore);

                const isCopied =
                  copiedAddr === contract.address;


                return (

                  <tr
                    key={contract.id}
                    id={`contract-row-${contract.id}`}
                  >

                    {/* Contract */}

                    <td>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >

                        <strong
                          style={{
                            color: 'var(--text-primary)',
                            fontSize: '13px'
                          }}
                        >

                          {contract.name}

                        </strong>

                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            marginTop: '2px'
                          }}
                        >

                          {contract.latestDetection}

                        </span>

                      </div>

                    </td>


                    {/* Address */}

                    <td className="mono">

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >

                        <span>
                          {formatAddress(
                            contract.address,
                            8,
                            6
                          )}
                        </span>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() =>
                            copyAddress(contract.address)
                          }
                          title="Copy address"
                        >

                          {isCopied ? (
                            <Check
                              size={11}
                              color="var(--accent-teal)"
                            />
                          ) : (
                            <Copy size={11} />
                          )}

                        </button>

                      </div>

                    </td>


                    {/* Network */}

                    <td>

                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)'
                        }}
                      >

                        {contract.chain}

                      </span>

                    </td>


                    {/* Risk Score */}

                    <td>

                      <span
                        className="mono"
                        style={{
                          fontWeight: 800,
                          fontSize: '14px',
                          color: riskLevel.color
                        }}
                      >

                        {contract.riskScore}

                      </span>

                    </td>


                    {/* Severity */}

                    <td>

                      <SeverityBadge
                        severity={contract.severity}
                      />

                    </td>


                    {/* Status */}

                    <td>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >

                        <span
                          className={`status-dot ${
                            contract.status === 'Active'
                              ? 'healthy'
                              : contract.status === 'Warning'
                              ? 'warning'
                              : 'danger'
                          }`}
                        />

                        <span>
                          {contract.status}
                        </span>

                      </span>

                    </td>


                    {/* Last Scan */}

                    <td
                      className="mono"
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '11px'
                      }}
                    >

                      {formatTimestamp(
                        contract.lastScan
                      )}

                    </td>


                    {/* Transactions */}

                    <td
                      className="mono"
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600
                      }}
                    >

                      {formatNumber(contract.tx24h)}

                    </td>


                    {/* Scan Action */}

                    <td>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          console.log('SCAN BUTTON CONTRACT:', contract);

                          if (!contract?.id) {
                            console.error('Contract has no ID:', contract);
                            return;
                          }

                        window.location.assign(
                          `/scan?contractId=${encodeURIComponent(contract.id)}`
                        );
                      }}
                      >

                        Scan

                      </button>

                      {isDeveloper && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ marginLeft: '6px', color: 'var(--severity-critical, #c0392b)' }}
                          onClick={() => handleDelete(contract)}
                        >
                          Delete
                        </button>
                      )}

                    </td>

                  </tr>

                );

              })

            )}

          </tbody>

        </table>


        {/* Pagination */}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={contractsData.total}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
        />

      </div>


      {/* Register Contract Modal */}

      {isModalOpen && (

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
          onClick={() => setIsModalOpen(false)}
        >

          <div
            className="prism-panel"
            style={{
              width: '100%',
              maxWidth: '500px',
              marginBottom: 0,
              border: '2px solid var(--border-strong)',
              boxShadow: 'var(--shadow-hard-xl)'
            }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="prism-panel-header">

              <div className="panel-title-group">

                <Database
                  size={14}
                  color="var(--accent-teal)"
                />

                <span>
                  Register Monitored Contract
                </span>

              </div>


              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setIsModalOpen(false)}
              >

                <X size={14} />

              </button>

            </div>


            <div className="prism-panel-body">

              {registerError && (

                <div
                  style={{
                    marginBottom: '14px',
                    padding: '10px 14px',
                    backgroundColor: 'var(--accent-red-bg)',
                    border: '1.5px solid var(--accent-red)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    color: 'var(--accent-red)',
                    fontWeight: 600
                  }}
                >

                  {registerError}

                </div>

              )}


              <form onSubmit={handleRegister}>

                <div className="form-group">

                  <label
                    className="form-label"
                    htmlFor="reg-contract-name"
                  >
                    Contract Name
                  </label>

                  <input
                    id="reg-contract-name"
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={(e) =>
                      setNewName(e.target.value)
                    }
                    placeholder="e.g. YieldDistributorV2"
                  />

                </div>


                <div className="form-group">

                  <label
                    className="form-label"
                    htmlFor="reg-contract-address"
                  >
                    EVM Address (0x...)
                  </label>

                  <input
                    id="reg-contract-address"
                    type="text"
                    className="form-input mono"
                    value={newAddress}
                    onChange={(e) =>
                      setNewAddress(e.target.value)
                    }
                    placeholder="0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
                    required
                  />

                </div>


                <div className="form-group">

                  <label
                    className="form-label"
                    htmlFor="reg-contract-chain"
                  >
                    Blockchain Network
                  </label>

                  <select
                    id="reg-contract-chain"
                    className="form-select"
                    value={newChain}
                    onChange={(e) =>
                      setNewChain(e.target.value)
                    }
                  >

                    <option value="Ethereum Mainnet">
                      Ethereum Mainnet
                    </option>

                    <option value="Arbitrum One">
                      Arbitrum One
                    </option>

                    <option value="Optimism">
                      Optimism
                    </option>

                  </select>

                </div>


                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    marginTop: '18px'
                  }}
                >

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setIsModalOpen(false)
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={registering}
                  >

                    {registering
                      ? 'Registering...'
                      : 'Confirm Registration'}

                  </button>

                </div>

              </form>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}