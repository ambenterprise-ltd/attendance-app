import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { TaskTimer } from '../components/TaskTimer';
import { TaskStatusBadge } from '../components/TaskStatusBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import { TaskCategory, TaskStatus } from '../types';
import {
  formatKarachiTime,
  formatDurationHoursMinutes,
  getTodayKarachiDate,
  formatKarachiDate,
} from '../lib/dateUtils';

const CATEGORIES: TaskCategory[] = [
  'Client Work',
  'Internal',
  'Meeting',
  'Learning',
  'Other',
];

export const Tasks: React.FC = () => {
  const {
    tasks,
    activeTask,
    isCheckedIn,
    loading,
    actionLoading,
    errorMessage,
    successMessage,
    clearAlerts,
    handleStartTask,
    handleEndTask,
    refreshTasks,
  } = useTasks();

  // Start Task form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Client Work');
  const [objective, setObjective] = useState('');

  // End Task form state
  const [outcome, setOutcome] = useState('');
  const [endStatus, setEndStatus] = useState<'done' | 'blocked' | 'carried_over'>('done');

  const onStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !objective.trim()) return;

    const ok = await handleStartTask(title, category, objective);
    if (ok) {
      setTitle('');
      setObjective('');
      setCategory('Client Work');
    }
  };

  const onEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;
    if (!outcome.trim()) return;

    const ok = await handleEndTask(activeTask.id, outcome, endStatus);
    if (ok) {
      setOutcome('');
      setEndStatus('done');
    }
  };

  // Metrics
  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Task Time-Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track focused work intervals with clear objectives and outcomes &bull;{' '}
            <span className="font-semibold text-slate-700">
              {formatKarachiDate(getTodayKarachiDate())}
            </span>
          </p>
        </div>
        <div>
          <button
            onClick={refreshTasks}
            disabled={loading}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Attendance Check Notice */}
      {!isCheckedIn && !activeTask && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start justify-between shadow-sm">
          <div className="flex items-start space-x-2.5">
            <span className="text-lg">ℹ️</span>
            <div>
              <p className="font-semibold">Check-in Required</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Company policy requires you to be checked in before starting a task.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition flex-shrink-0 ml-4"
          >
            Go to Check In &rarr;
          </Link>
        </div>
      )}

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

      {/* ACTIVE TASK CARD OR START TASK FORM */}
      {activeTask ? (
        /* ACTIVE RUNNING TASK */
        <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Active Task in Progress
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                {activeTask.title}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <CategoryBadge category={activeTask.category} />
              <TaskStatusBadge status="in_progress" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Objective & Details */}
            <div className="md:col-span-2 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Objective
              </span>
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {activeTask.objective}
              </div>
              <div className="text-xs text-slate-400">
                Started at:{' '}
                <span className="font-mono font-semibold text-slate-600">
                  {formatKarachiTime(activeTask.start_time)}
                </span>{' '}
                (Asia/Karachi)
              </div>
            </div>

            {/* Live Timer Counter */}
            <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
                Active Duration
              </span>
              <TaskTimer
                startTime={activeTask.start_time}
                className="text-4xl text-blue-700 my-1"
              />
              <span className="text-xs text-blue-500 font-medium">Ticking live</span>
            </div>
          </div>

          {/* End Task Form */}
          <form
            onSubmit={onEndSubmit}
            className="border-t border-slate-100 pt-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-800">Complete / End Task</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Outcome / Deliverables / Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                disabled={actionLoading}
                placeholder="What was achieved or what blocker occurred? (e.g. Completed initial design review, merged PR #12)."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Final Status <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setEndStatus('done')}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    endStatus === 'done'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">✓</span>
                    <span className="text-sm">Done</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-normal">Completed</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEndStatus('blocked')}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    endStatus === 'blocked'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">✕</span>
                    <span className="text-sm">Blocked</span>
                  </div>
                  <span className="text-[10px] text-rose-700 font-normal">Impediment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEndStatus('carried_over')}
                  className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    endStatus === 'carried_over'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-400'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">↻</span>
                    <span className="text-sm">Carried Over</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-normal">Incomplete</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading || !outcome.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm shadow-md transition disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Ending Task...</span>
                  </>
                ) : (
                  <span>End Task ({endStatus.replace('_', ' ')})</span>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* START TASK FORM */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-800">Start a New Task</h2>
            <p className="text-xs text-slate-500 mt-1">
              Specify your task title, category, and objective. Only one task can be in progress at a time.
            </p>
          </div>

          <form onSubmit={onStartSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={actionLoading}
                  placeholder="e.g. Implement user authentication flow"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  disabled={actionLoading}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-50"
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
                Objective <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                disabled={actionLoading}
                placeholder="What is the concrete goal you aim to achieve during this session?"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-50"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading || !title.trim() || !objective.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 transition disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {actionLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Starting Task...</span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>Start Task</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TODAY'S TASKS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-800">Today's Tasks</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {tasks.length} total
              </span>
            </div>
            <p className="text-xs text-slate-500">
              List of all tasks initiated today with recorded start, end, and duration
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              {completedCount} Completed
            </span>
            {blockedCount > 0 && (
              <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-1 rounded border border-rose-200">
                {blockedCount} Blocked
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-medium">Loading today's tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <div className="text-3xl">📋</div>
            <p className="text-sm font-medium text-slate-600">No tasks logged yet today.</p>
            <p className="text-xs text-slate-400">Use the form above to start your first task.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Task & Objective</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Start</th>
                  <th className="py-3.5 px-4">End</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {tasks.map((task) => {
                  const duration = formatDurationHoursMinutes(
                    task.start_time,
                    task.end_time
                  );
                  const isRunning = task.status === 'in_progress';

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isRunning ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 sm:px-6 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-slate-800 text-sm">
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          <strong className="text-slate-600">Obj:</strong> {task.objective}
                        </div>
                        {task.outcome && (
                          <div className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                            <strong className="text-slate-700">Outcome:</strong> {task.outcome}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <CategoryBadge category={task.category} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <TaskStatusBadge status={task.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs sm:text-sm whitespace-nowrap text-slate-700">
                        {formatKarachiTime(task.start_time)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs sm:text-sm whitespace-nowrap text-slate-700">
                        {isRunning ? (
                          <span className="text-blue-600 font-semibold">&mdash;</span>
                        ) : (
                          formatKarachiTime(task.end_time)
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right font-mono font-semibold whitespace-nowrap text-slate-800 text-xs sm:text-sm">
                        {isRunning ? (
                          <TaskTimer
                            startTime={task.start_time}
                            className="text-blue-600 font-bold"
                          />
                        ) : (
                          duration
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
