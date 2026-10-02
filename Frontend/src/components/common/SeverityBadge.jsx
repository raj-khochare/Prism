import React from 'react';

export default function SeverityBadge({ severity, className = '' }) {
  const sev = String(severity || 'info').toLowerCase();

  let modifierClass = 'info';
  if (sev.includes('crit')) modifierClass = 'critical';
  else if (sev.includes('high')) modifierClass = 'high';
  else if (sev.includes('med')) modifierClass = 'medium';
  else if (sev.includes('low')) modifierClass = 'low';

  return (
    <span className={`badge-severity ${modifierClass} ${className}`}>
      {severity || 'INFO'}
    </span>
  );
}
