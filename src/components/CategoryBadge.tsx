import React from 'react';
import { TaskCategory } from '../types';

interface CategoryBadgeProps {
  category: TaskCategory | string;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  className = '',
}) => {
  switch (category) {
    case 'Client Work':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
        >
          {category}
        </span>
      );
    case 'Internal':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          {category}
        </span>
      );
    case 'Meeting':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 ${className}`}
        >
          {category}
        </span>
      );
    case 'Learning':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}
        >
          {category}
        </span>
      );
    case 'Other':
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
        >
          {category}
        </span>
      );
  }
};
