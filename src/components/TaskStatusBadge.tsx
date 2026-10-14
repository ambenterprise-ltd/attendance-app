import React from 'react';
import { TaskStatus } from '../types';

interface TaskStatusBadgeProps {
  status: TaskStatus | string;
  className?: string;
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'in_progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          In Progress
        </span>
      );
    case 'done':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
        >
          <span>✓</span> Done
        </span>
      );
    case 'blocked':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 ${className}`}
        >
          <span>✕</span> Blocked
        </span>
      );
    case 'carried_over':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        >
          <span>↻</span> Carried Over
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          {status}
        </span>
      );
  }
};
