import React from 'react';

export const Admin: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-slate-800">Admin Control Panel</h1>
          <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Live attendance monitor, leave management, and audit log.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-700">Team Status Monitor</h2>
        <p className="text-sm text-slate-400">
          Placeholder for Phase 6: Live view of employee check-in status, running tasks, leave approvals, and timestamp correction requests.
        </p>
      </div>
    </div>
  );
};
