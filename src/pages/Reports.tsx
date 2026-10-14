import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useReports, ReportPeriod } from '../hooks/useReports';
import { HoursBarChart } from '../components/HoursBarChart';
import { StatusBadge } from '../components/StatusBadge';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { exportReportToCsv } from '../lib/csvExport';
import {
  formatKarachiDate,
  formatKarachiTime,
  formatDurationHoursMinutes,
} from '../lib/dateUtils';

export const Reports: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const {
    period,
    setPeriod,
    referenceDate,
    setReferenceDate,
    startDate,
    endDate,
    targetUserId,
    setTargetUserId,
    employees,
    reportData,
    loading,
    error,
    refreshReport,
  } = useReports();

  const handleExportCsv = () => {
    if (!reportData) return;

    let employeeName = 'Current User';
    if (isAdmin) {
      if (!targetUserId) {
        employeeName = 'All Employees';
      } else {
        const found = employees.find((e) => e.id === targetUserId);
        employeeName = found ? found.full_name : 'Selected Employee';
      }
    } else {
      employeeName = profile?.full_name || 'Employee';
    }

    const periodLabel = `${period.toUpperCase()} (${startDate} to ${endDate})`;

    exportReportToCsv({
      periodLabel,
      employeeName,
      attendance: reportData.attendance,
      tasks: reportData.tasks,
    });
  };

  const metrics = reportData?.metrics;
  const categoryHours = reportData?.category_hours || {};

  // Calculate attendance percentage
  const totalDaysInPeriod = reportData?.daily_breakdown.length || 1;
  const attendancePercent = metrics
    ? Math.min(100, Math.round((metrics.days_present / Math.max(1, metrics.days_logged || 1)) * 100))
    : 0;

  // Task completion percentage
  const taskCompletionRate =
    metrics && metrics.tasks_total > 0
      ? Math.round((metrics.tasks_completed / metrics.tasks_total) * 100)
      : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Performance Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analyze time, attendance, task velocity, and team metrics &bull; Asia/Karachi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={loading || !reportData}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
          <button
            onClick={refreshReport}
            disabled={loading}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-2 rounded-lg transition"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Tabs, Date Picker, Admin Employee Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Period Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setPeriod(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                period === tab
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Date Picker & Employee Selector Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Reference Date input */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-500">Date:</label>
            <input
              type="date"
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Admin Employee Filter */}
          {isAdmin && (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-500">Employee:</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Employees ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Selected Period Badge */}
      <div className="text-xs text-slate-500 flex items-center space-x-2">
        <span className="font-semibold text-slate-700">Reporting Range:</span>
        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
          {formatKarachiDate(startDate)} &rarr; {formatKarachiDate(endDate)}
        </span>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Generating performance report...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-slate-400">Total Hours</span>
              <p className="text-2xl font-black text-blue-700 mt-1">
                {metrics?.total_hours_worked || 0}h
              </p>
              <span className="text-[10px] text-slate-400">Logged in period</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-slate-400">Attendance %</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {attendancePercent}%
              </p>
              <span className="text-[10px] text-slate-400">
                {metrics?.days_present || 0} of {metrics?.days_logged || 0} days
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-slate-400">Late Count</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {metrics?.days_late || 0}
              </p>
              <span className="text-[10px] text-slate-400">&gt; 09:15 PKT arrivals</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-slate-400">Tasks Completed</span>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {metrics?.tasks_completed || 0}
              </p>
              <span className="text-[10px] text-slate-400">
                {metrics?.tasks_total || 0} total started
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-slate-400">Avg Duration</span>
              <p className="text-2xl font-black text-purple-700 mt-1">
                {metrics?.avg_task_duration_minutes || 0}m
              </p>
              <span className="text-[10px] text-slate-400">Per task outcome</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
              <span className="text-[11px] uppercase font-bold text-slate-400">Task Velocity</span>
              <p className="text-2xl font-black text-teal-600 mt-1">
                {taskCompletionRate}%
              </p>
              <span className="text-[10px] text-slate-400">Completion rate</span>
            </div>
          </div>

          {/* Bar Chart & Category Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart: Hours Per Day */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Hours Worked Per Day</h2>
                  <p className="text-xs text-slate-500">
                    Distribution across each day in the selected range
                  </p>
                </div>
              </div>

              <HoursBarChart data={reportData?.daily_breakdown || []} />
            </div>

            {/* Hours per Category Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h2 className="text-base font-bold text-slate-800">Hours by Category</h2>
                  <p className="text-xs text-slate-500">Time allocated across categories</p>
                </div>

                <div className="space-y-3">
                  {Object.keys(categoryHours).length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No categorized task hours in this period.
                    </p>
                  ) : (
                    Object.entries(categoryHours).map(([cat, hours]) => {
                      const totalTskHours = Object.values(categoryHours).reduce((a, b) => a + b, 0);
                      const percent = totalTskHours > 0 ? Math.round((hours / totalTskHours) * 100) : 0;

                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700">{cat}</span>
                            <span className="font-mono text-slate-600">
                              {hours}h ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Planned vs Completed Tasks Card */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 block mb-1">
                  Planned vs Completed Tasks
                </span>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Completed: {metrics?.tasks_completed || 0}</span>
                  <span>Total: {metrics?.tasks_total || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${taskCompletionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Attendance Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Attendance Log Details</h2>
                <p className="text-xs text-slate-500">
                  {reportData?.attendance.length || 0} records found in selected range
                </p>
              </div>
            </div>

            {reportData?.attendance.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No attendance logs found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      {isAdmin && <th className="py-3 px-4">Employee</th>}
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Check In</th>
                      <th className="py-3 px-4">Check Out</th>
                      <th className="py-3 px-4 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData?.attendance.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {formatKarachiDate(rec.work_date)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {rec.employee_name || 'Employee'}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <StatusBadge status={rec.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {formatKarachiTime(rec.check_in)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {formatKarachiTime(rec.check_out)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                          {(rec.duration_seconds / 3600).toFixed(2)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detailed Tasks Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Task Log Details</h2>
              <p className="text-xs text-slate-500">
                {reportData?.tasks.length || 0} tasks logged in selected range
              </p>
            </div>

            {reportData?.tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tasks logged for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Task & Objective</th>
                      {isAdmin && <th className="py-3 px-4">Employee</th>}
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Start Time</th>
                      <th className="py-3 px-4 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData?.tasks.map((tsk: any) => (
                      <tr key={tsk.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 max-w-sm">
                          <div className="font-semibold text-slate-800">{tsk.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {tsk.objective}
                          </div>
                          {tsk.outcome && (
                            <div className="text-[11px] text-slate-600 mt-1 italic">
                              Outcome: {tsk.outcome}
                            </div>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {tsk.employee_name || 'Employee'}
                          </td>
                        )}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <CategoryBadge category={tsk.category} />
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <TaskStatusBadge status={tsk.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                          {formatKarachiTime(tsk.start_time)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap text-slate-800">
                          {formatDurationHoursMinutes(tsk.start_time, tsk.end_time)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
