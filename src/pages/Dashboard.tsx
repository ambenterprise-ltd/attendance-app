import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../hooks/useAttendance';
import { WorkTimer } from '../components/WorkTimer';
import { StatusBadge } from '../components/StatusBadge';
import {
  getTodayKarachiDate,
  formatKarachiDate,
  formatKarachiTime,
  formatDurationHoursMinutes,
} from '../lib/dateUtils';

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const {
    todayRecord,
    monthlyRecords,
    loadingToday,
    loadingMonthly,
    actionLoading,
    errorMessage,
    successMessage,
    clearAlerts,
    handleCheckIn,
    handleCheckOut,
  } = useAttendance();

  const isCheckedIn = !!todayRecord?.check_in;
  const isCheckedOut = !!todayRecord?.check_out;

  // Compute monthly summary metrics
  const totalDays = monthlyRecords.length;
  const presentDays = monthlyRecords.filter(
    (r) => r.status === 'present' || r.status === 'late'
  ).length;
  const lateDays = monthlyRecords.filter((r) => r.status === 'late').length;

  // Calculate total hours this month
  const totalMonthSeconds = monthlyRecords.reduce((acc, r) => {
    if (r.check_in && r.check_out) {
      const start = new Date(r.check_in).getTime();
      const end = new Date(r.check_out).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        return acc + Math.floor((end - start) / 1000);
      }
    }
    return acc;
  }, 0);

  const totalMonthHours = (totalMonthSeconds / 3600).toFixed(1);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Welcome, {profile?.full_name || 'Team Member'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Today is{' '}
            <span className="font-semibold text-slate-700">
              {formatKarachiDate(getTodayKarachiDate())}
            </span>{' '}
            &bull; Asia/Karachi (PKT)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Timezone: Asia/Karachi (UTC+5)
          </span>
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start justify-between shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-2.5">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold">{errorMessage}</p>
              {errorMessage.toLowerCase().includes('task is in progress') && (
                <Link
                  to="/tasks"
                  className="inline-flex items-center mt-2 text-xs font-bold text-red-900 underline hover:text-red-700"
                >
                  Go to Tasks page to finish your active task &rarr;
                </Link>
              )}
            </div>
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

      {/* Main Today Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Today's Status & Timestamps */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Status
              </span>
              {loadingToday ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : todayRecord ? (
                <StatusBadge status={todayRecord.status} />
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Not Checked In
                </span>
              )}
            </div>

            <div className="space-y-4 my-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Check In</span>
                <span className="text-sm font-mono font-bold text-slate-800">
                  {formatKarachiTime(todayRecord?.check_in)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">Check Out</span>
                <span className="text-sm font-mono font-bold text-slate-800">
                  {formatKarachiTime(todayRecord?.check_out)}
                </span>
              </div>
            </div>
          </div>

          {todayRecord?.status === 'late' && (
            <div className="mt-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2.5">
              ⚠️ Check-in after 09:15 PKT is marked as <strong>Late</strong>.
            </div>
          )}
          {todayRecord?.auto_closed && (
            <div className="mt-2 text-xs bg-purple-50 text-purple-800 border border-purple-200 rounded-lg p-2.5">
              ℹ️ Session was automatically closed at day end.
            </div>
          )}
        </div>

        {/* Card 2: Live Work Timer */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Hours Worked Today
          </span>
          <WorkTimer
            checkIn={todayRecord?.check_in}
            checkOut={todayRecord?.check_out}
          />
          <p className="text-xs text-slate-400 mt-4 max-w-xs">
            {isCheckedOut
              ? 'Shift completed for today. Great work!'
              : isCheckedIn
              ? 'Timer running live based on Postgres check-in timestamp.'
              : 'Press Check In when starting your shift.'}
          </p>
        </div>

        {/* Card 3: Large Action Buttons */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-center space-y-4">
          <button
            onClick={handleCheckIn}
            disabled={isCheckedIn || actionLoading || loadingToday}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base shadow-sm transition-all flex items-center justify-center space-x-2 ${
              !isCheckedIn && !actionLoading && !loadingToday
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-emerald-600/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {actionLoading && !isCheckedIn ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Recording Check-In...</span>
              </>
            ) : (
              <>
                <span className="text-xl">☀️</span>
                <span>{isCheckedIn ? 'Checked In' : 'Check In'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleCheckOut}
            disabled={!isCheckedIn || isCheckedOut || actionLoading || loadingToday}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base shadow-sm transition-all flex items-center justify-center space-x-2 ${
              isCheckedIn && !isCheckedOut && !actionLoading && !loadingToday
                ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-rose-600/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {actionLoading && isCheckedIn && !isCheckedOut ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Recording Check-Out...</span>
              </>
            ) : (
              <>
                <span className="text-xl">🌙</span>
                <span>{isCheckedOut ? 'Checked Out' : 'Check Out'}</span>
              </>
            )}
          </button>

          <div className="text-[11px] text-center text-slate-400 pt-1">
            Timestamps are securely recorded on server &bull; Asia/Karachi
          </div>
        </div>
      </div>

      {/* Monthly Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Days Logged</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalDays}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Days Present</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{presentDays}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Late Days</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{lateDays}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Hours (Month)</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalMonthHours}h</p>
        </div>
      </div>

      {/* Monthly Attendance History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">This Month's Attendance</h2>
            <p className="text-xs text-slate-500">
              Complete attendance history for the current calendar month
            </p>
          </div>
          <button
            onClick={useAttendance().refreshMonthly}
            disabled={loadingMonthly}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition self-start sm:self-auto"
          >
            {loadingMonthly ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loadingMonthly ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium">Loading monthly attendance history...</p>
          </div>
        ) : monthlyRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="text-3xl">📅</div>
            <p className="text-sm font-medium text-slate-600">No attendance records found for this month.</p>
            <p className="text-xs text-slate-400">Records will appear here once you check in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Check In</th>
                  <th className="py-3.5 px-4">Check Out</th>
                  <th className="py-3.5 px-4">Total Hours</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthlyRecords.map((record) => {
                  const duration = formatDurationHoursMinutes(
                    record.check_in,
                    record.check_out
                  );
                  const isToday = record.work_date === getTodayKarachiDate();

                  return (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isToday ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 sm:px-6 text-slate-800 font-semibold">
                        <div className="flex items-center space-x-2">
                          <span>{formatKarachiDate(record.work_date)}</span>
                          {isToday && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              Today
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 text-xs sm:text-sm">
                        {formatKarachiTime(record.check_in)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 text-xs sm:text-sm">
                        {formatKarachiTime(record.check_out)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 text-xs sm:text-sm">
                        {record.check_in && !record.check_out ? (
                          <span className="text-blue-600 animate-pulse font-normal">
                            In progress
                          </span>
                        ) : (
                          duration
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right text-xs text-slate-400">
                        {record.auto_closed ? (
                          <span
                            className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200"
                            title="Auto-closed at midnight"
                          >
                            Auto-closed
                          </span>
                        ) : (
                          <span className="text-slate-300">&mdash;</span>
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
  );
};
