import React from 'react';

export const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Performance Reports</h1>
        <p className="text-sm text-slate-500">
          Daily, weekly, and monthly attendance and task performance metrics.
        </p>
      </div>

      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button className="px-4 py-2 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">
          Daily
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          Weekly
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          Monthly
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-700">Metrics & Breakdown</h2>
        <p className="text-sm text-slate-400">
          Placeholder for Phase 5: Hours worked, attendance %, late count, task duration, CSV export, and charts.
        </p>
      </div>
    </div>
  );
};
