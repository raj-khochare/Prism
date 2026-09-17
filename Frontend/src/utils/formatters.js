/**
 * Technical data formatters for PRISM
 */

export function formatAddress(address, prefix = 6, suffix = 4) {
  if (!address || typeof address !== 'string') return '—';
  if (address.length <= prefix + suffix + 2) return address;
  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`;
}

export function formatTxHash(hash) {
  if (!hash || typeof hash !== 'string') return '—';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatTimestamp(isoOrEpoch) {
  if (!isoOrEpoch) return '—';
  try {
    const d = new Date(isoOrEpoch);
    if (isNaN(d.getTime())) return String(isoOrEpoch);
    return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  } catch {
    return String(isoOrEpoch);
  }
}

export function formatRelativeTime(isoOrEpoch) {
  if (!isoOrEpoch) return '—';
  try {
    const d = new Date(isoOrEpoch).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '—';
  }
}

export function getSeverityStyle(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') {
    return { className: 'severity-critical', color: 'var(--accent-red)' };
  }
  if (s === 'high') {
    return { className: 'severity-high', color: '#D66B60' };
  }
  if (s === 'medium') {
    return { className: 'severity-medium', color: 'var(--accent-sand)' };
  }
  if (s === 'low') {
    return { className: 'severity-low', color: '#A3806E' };
  }
  return { className: 'severity-info', color: 'var(--accent-teal)' };
}

export function getRiskLevel(score) {
  if (score >= 80) return { label: 'Critical', color: 'var(--accent-red)' };
  if (score >= 60) return { label: 'High', color: '#D66B60' };
  if (score >= 35) return { label: 'Medium', color: 'var(--accent-sand)' };
  return { label: 'Low', color: 'var(--accent-teal)' };
}
