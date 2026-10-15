import React, { useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import { StatusBadge } from '../components/StatusBadge';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { TaskCategory } from '../types';
import {
  formatKarachiDate,
  formatKarachiTime,
  getTodayKarachiDate,
} from '../lib/dateUtils';

const CATEGORIES: TaskCategory[] = [
  'Client Work',
  'Internal',
  'Meeting',
  'Learning',
  'Other',
];

export const Admin: React.FC = () => {
  const {
    employeeStatuses,
    leaves,
    editRequests,
    auditLogs,
    loading,
    actionLoading,
    errorMessage,
    successMessage,
    clearAlerts,
    handleReviewLeave,
    handleApproveEditRequest,
    handleRejectEditRequest,
    handleAssignTask,
    refreshAll,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'monitor' | 'approvals' | 'assign' | 'audit'>('monitor');

  // Task assignment form state
  const [assignUserId, setAssignUserId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignCategory, setAssignCategory] = useState<TaskCategory>('Client Work');
  const [assignObjective, setAssignObjective] = useState('');

  // Review notes state (keyed by request/leave ID)
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const setNotesFor = (id: string, text: string) => {
    setAdminNotesMap((prev) => ({ ...prev, [id]: text }));
  };


  const onAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || !assignTitle.trim() || !assignObjective.trim()) return;

    const ok = await handleAssignTask(
      assignUserId,
      assignTitle,
      assignCategory,
      assignObjective
    );
    if (ok) {
      setAssignTitle('');
      setAssignObjective('');
      setAssignCategory('Client Work');
    }
  };

  const pendingEditCount = editRequests.filter((r) => r.status === 'pending').length;
  const pendingLeaveCount = leaves.filter((l) => l.status === 'pending').length;
  const totalPending = pendingEditCount + pendingLeaveCount;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Admin Control Center
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full border border-purple-200">
              Admin Privileges
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Live team monitor, request approvals, task delegation, and audit trails &bull;{' '}
            <span className="font-semibold text-slate-700">
              {formatKarachiDate(getTodayKarachiDate())}
            </span>
          </p>
        </div>

        <button
          onClick={refreshAll}
          disabled={loading}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3.5 py-2 rounded-lg transition self-start sm:self-auto"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Data'}
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start justify-between shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-2.5">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <p className="font-medium">{errorMessage}</p>
          </div>
          <button
            onClick={clearAlerts}
            className="text-red-500 hover:text-red-700 text-sm font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✓</span>
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={clearAlerts}
            className="text-emerald-500 hover:text-emerald-700 text-sm font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'monitor'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>👥 Live Team Monitor</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {employeeStatuses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'approvals'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>⚖️ Pending Approvals</span>
          {totalPending > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
              {totalPending}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'assign'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>📋 Task Assignment</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>📜 Audit Log</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading administrative records...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: LIVE TEAM MONITOR */}
          {activeTab === 'monitor' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employeeStatuses.map((status) => {
                  const att = status.todayAttendance;
                  const isCheckedIn = !!att?.check_in && !att?.check_out;
                  const isFinished = !!att?.check_in && !!att?.check_out;
                  const task = status.currentTask;

                  return (
                    <div
                      key={status.profile.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Employee Card Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                              {status.profile.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">
                                {status.profile.full_name}
                              </div>
                              <span
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  status.profile.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {status.profile.role}
                              </span>
                            </div>
                          </div>

                          {/* Live Attendance State */}
                          {isCheckedIn ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>On Shift</span>
                            </span>
                          ) : isFinished ? (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              Shift Ended
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                              Offline
                            </span>
                          )}
                        </div>

                        {/* Today's Attendance Details */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Check In:</span>
                            <span className="font-mono font-medium text-slate-700">
                              {formatKarachiTime(att?.check_in)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Check Out:</span>
                            <span className="font-mono font-medium text-slate-700">
                              {formatKarachiTime(att?.check_out)}
                            </span>
                          </div>
                          {att && (
                            <div className="flex justify-between pt-1 border-t border-slate-200/60">
                              <span className="text-slate-400">Status:</span>
                              <StatusBadge status={att.status} />
                            </div>
                          )}
                        </div>

                        {/* Current Running Task */}
                        <div className="space-y-1">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                            Current Task
                          </span>
                          {task ? (
                            <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-900 truncate">
                                  {task.title}
                                </span>
                                <CategoryBadge category={task.category} />
                              </div>
                              <p className="text-slate-600 line-clamp-2">{task.objective}</p>
                              <div className="text-[10px] text-blue-700 font-mono pt-1">
                                Started: {formatKarachiTime(task.start_time)}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                              No active task in progress
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Monthly Summary Statistics Footer */}
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Present</span>
                          <span className="font-bold text-emerald-600">
                            {status.monthlySummary.daysPresent}d
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Late</span>
                          <span className="font-bold text-amber-600">
                            {status.monthlySummary.daysLate}d
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Hours</span>
                          <span className="font-bold text-blue-700">
                            {status.monthlySummary.totalHours}h
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PENDING APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-8">
              {/* 1. Timestamp Correction Requests */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Timestamp Correction Requests ({editRequests.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Approving applies corrected check-in/out timestamps and logs an audit entry
                    </p>
                  </div>
                  {pendingEditCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {pendingEditCount} Pending
                    </span>
                  )}
                </div>

                {editRequests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No timestamp correction requests submitted yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                      <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Employee</th>
                          <th className="py-3 px-4">Target Date</th>
                          <th className="py-3 px-4">Requested Timestamps</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editRequests.map((req) => {
                          const isPending = req.status === 'pending';
                          return (
                            <tr key={req.id} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                {req.employee_name}
                              </td>
                              <td className="py-3 px-4 font-mono">
                                {formatKarachiDate(req.work_date)}
                              </td>
                              <td className="py-3 px-4 font-mono text-xs space-y-0.5">
                                <div>In: {formatKarachiTime(req.requested_check_in)}</div>
                                <div>Out: {formatKarachiTime(req.requested_check_out)}</div>
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <p className="text-slate-700">{req.reason}</p>
                                {req.admin_notes && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Notes: {req.admin_notes}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    req.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : req.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </td>
                                <td className="py-3 px-4 text-right">
                                {isPending ? (
                                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Admin note"
                                      value={adminNotesMap[req.id] || ''}
                                      onChange={(e) => setNotesFor(req.id, e.target.value)}
                                      disabled={processingId === req.id}
                                      className="px-2 py-1 text-xs border border-slate-300 rounded w-24 sm:w-28 disabled:bg-slate-50"
                                    />
                                    <button
                                      onClick={async () => {
                                        setProcessingId(req.id);
                                        await handleApproveEditRequest(req.id, adminNotesMap[req.id]);
                                        setProcessingId(null);
                                      }}
                                      disabled={actionLoading || processingId === req.id}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm transition disabled:bg-slate-300 flex items-center space-x-1"
                                    >
                                      {processingId === req.id ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      ) : (
                                        <span>Approve</span>
                                      )}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setProcessingId(req.id);
                                        await handleRejectEditRequest(req.id, adminNotesMap[req.id]);
                                        setProcessingId(null);
                                      }}
                                      disabled={actionLoading || processingId === req.id}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded shadow-sm transition disabled:bg-slate-300 flex items-center space-x-1"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">Processed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. Leave Requests */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Leave Requests ({leaves.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Review employee time-off and leave applications
                    </p>
                  </div>
                  {pendingLeaveCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {pendingLeaveCount} Pending
                    </span>
                  )}
                </div>

                {leaves.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No leave requests submitted yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                      <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Employee</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Date Range</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leaves.map((leave) => {
                          const isPending = leave.status === 'pending';
                          return (
                            <tr key={leave.id} className="hover:bg-slate-50/80">
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                {leave.employee_name}
                              </td>
                              <td className="py-3 px-4 uppercase font-bold text-xs text-slate-700">
                                {leave.leave_type}
                              </td>
                              <td className="py-3 px-4 font-mono text-xs">
                                {formatKarachiDate(leave.start_date)} &rarr;{' '}
                                {formatKarachiDate(leave.end_date)}
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <p className="text-slate-700">{leave.reason}</p>
                                {leave.admin_notes && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Notes: {leave.admin_notes}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    leave.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : leave.status === 'rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {leave.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isPending ? (
                                  <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Admin note"
                                      value={adminNotesMap[leave.id] || ''}
                                      onChange={(e) => setNotesFor(leave.id, e.target.value)}
                                      disabled={processingId === leave.id}
                                      className="px-2 py-1 text-xs border border-slate-300 rounded w-24 sm:w-28 disabled:bg-slate-50"
                                    />
                                    <button
                                      onClick={async () => {
                                        setProcessingId(leave.id);
                                        await handleReviewLeave(leave.id, 'approved', adminNotesMap[leave.id]);
                                        setProcessingId(null);
                                      }}
                                      disabled={actionLoading || processingId === leave.id}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm transition disabled:bg-slate-300 flex items-center space-x-1"
                                    >
                                      {processingId === leave.id ? (
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      ) : (
                                        <span>Approve</span>
                                      )}
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setProcessingId(leave.id);
                                        await handleReviewLeave(leave.id, 'rejected', adminNotesMap[leave.id]);
                                        setProcessingId(null);
                                      }}
                                      disabled={actionLoading || processingId === leave.id}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded shadow-sm transition disabled:bg-slate-300 flex items-center space-x-1"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">Processed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TASK ASSIGNMENT */}
          {activeTab === 'assign' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800">Assign Task to Employee</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Delegate prioritized objectives directly into the employee's work queue.
                </p>
              </div>

              <form onSubmit={onAssignSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    disabled={actionLoading}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose employee --</option>
                    {employeeStatuses.map((s) => (
                      <option key={s.profile.id} value={s.profile.id}>
                        {s.profile.full_name} ({s.profile.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Task Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={assignTitle}
                      onChange={(e) => setAssignTitle(e.target.value)}
                      disabled={actionLoading}
                      placeholder="e.g. Audit database indexes"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={assignCategory}
                      onChange={(e) => setAssignCategory(e.target.value as TaskCategory)}
                      disabled={actionLoading}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Objective & Instructions <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={assignObjective}
                    onChange={(e) => setAssignObjective(e.target.value)}
                    disabled={actionLoading}
                    placeholder="Provide clear goals, acceptance criteria, or reference links for the employee..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={
                      actionLoading ||
                      !assignUserId ||
                      !assignTitle.trim() ||
                      !assignObjective.trim()
                    }
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Assigning...</span>
                      </>
                    ) : (
                      <span>Assign Task</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-800">Administrative Audit Trail</h2>
                <p className="text-xs text-slate-500">
                  Immutable record of approvals, modifications, and task assignments
                </p>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No audit log entries recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Timestamp (PKT)</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Admin Actor</th>
                        <th className="py-3 px-4">Target Employee</th>
                        <th className="py-3 px-4">Entity</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono text-xs whitespace-nowrap text-slate-500">
                            {formatKarachiDate(log.created_at)} {formatKarachiTime(log.created_at)}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-bold text-slate-800">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {log.actor_name}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {log.target_user_name || 'System / None'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs">
                            {log.entity_type}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {log.notes || '&mdash;'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
