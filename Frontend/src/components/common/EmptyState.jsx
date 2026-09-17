import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There is currently no data matching the requested criteria.',
  icon: Icon = Inbox,
  action = null
}) {
  return (
    <div className="state-box">
      <div className="state-icon">
        <Icon size={24} />
      </div>
      <h3 className="state-title">{title}</h3>
      {description && <p className="state-desc">{description}</p>}
      {action && <div className="state-action">{action}</div>}
    </div>
  );
}
