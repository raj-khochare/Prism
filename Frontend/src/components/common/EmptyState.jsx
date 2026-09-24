import React from 'react';
import { Inbox } from './Icons.jsx';

export default function EmptyState({
  title = 'No records found',
  description = 'There is currently no data matching the requested criteria.',
  icon: Icon = Inbox,
  action = null
}) {
  return (
    <div className="state-box">
      <div className="state-icon">
        <Icon size={26} color="var(--text-muted)" />
      </div>
      <h3 className="state-title">{title}</h3>
      {description && <p className="state-desc">{description}</p>}
      {action && <div className="state-action">{action}</div>}
    </div>
  );
}
