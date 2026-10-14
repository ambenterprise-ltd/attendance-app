import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Profile } from '../types';
import {
  getTodayKarachiDate,
  getWeekRange,
  getMonthRange,
} from '../lib/dateUtils';
import { DailyHourItem } from '../components/HoursBarChart';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ReportMetrics {
  total_seconds_worked: number;
  total_hours_worked: number;
  days_logged: number;
  days_present: number;
  days_late: number;
  tasks_total: number;
  tasks_completed: number;
  tasks_blocked: number;
  tasks_carried_over: number;
  avg_task_duration_minutes: number;
}

export interface ReportSummaryData {
  period: {
    start_date: string;
    end_date: string;
  };
  metrics: ReportMetrics;
  category_hours: Record<string, number>;
  daily_breakdown: DailyHourItem[];
  attendance: any[];
  tasks: any[];
}

export const useReports = () => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [referenceDate, setReferenceDate] = useState<string>(getTodayKarachiDate());
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [employees, setEmployees] = useState<Profile[]>([]);

  const [reportData, setReportData] = useState<ReportSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Compute active date boundaries
  const { startDate, endDate } = useMemo(() => {
    if (period === 'daily') {
      return { startDate: referenceDate, endDate: referenceDate };
    } else if (period === 'weekly') {
      return getWeekRange(referenceDate);
    } else {
      return getMonthRange(referenceDate);
    }
  }, [period, referenceDate]);

  // Load employee list if admin
  useEffect(() => {
    if (isAdmin) {
      const loadEmployees = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .order('full_name', { ascending: true });
        if (data) {
          setEmployees(data as Profile[]);
        }
      };
      loadEmployees();
    }
  }, [isAdmin]);

  // Client-side fallback aggregation in case RPC is not yet created
  const fallbackAggregation = useCallback(
    async (effUserId: string | null, sDate: string, eDate: string): Promise<ReportSummaryData> => {
      // Fetch attendance
      let attQuery = supabase
        .from('attendance')
        .select('*, profiles:user_id(full_name)')
        .gte('work_date', sDate)
        .lte('work_date', eDate);

      if (effUserId) {
        attQuery = attQuery.eq('user_id', effUserId);
      }
      const { data: rawAtt } = await attQuery;

      // Fetch tasks
      const startIso = `${sDate}T00:00:00+05:00`;
      const endIso = `${eDate}T23:59:59.999+05:00`;

      let tskQuery = supabase
        .from('tasks')
        .select('*, profiles:user_id(full_name)')
        .gte('start_time', startIso)
        .lte('start_time', endIso);

      if (effUserId) {
        tskQuery = tskQuery.eq('user_id', effUserId);
      }
      const { data: rawTsk } = await tskQuery;

      // Normalize attendance
      const attendance = (rawAtt || []).map((a: any) => {
        const start = a.check_in ? new Date(a.check_in).getTime() : 0;
        const end = a.check_out ? new Date(a.check_out).getTime() : 0;
        const durSec = end > start ? Math.floor((end - start) / 1000) : 0;
        return {
          ...a,
          employee_name: a.profiles?.full_name || 'Employee',
          duration_seconds: durSec,
        };
      });

      // Normalize tasks
      const tasks = (rawTsk || []).map((t: any) => {
        const start = t.start_time ? new Date(t.start_time).getTime() : 0;
        const end = t.end_time ? new Date(t.end_time).getTime() : 0;
        const durSec = end > start ? Math.floor((end - start) / 1000) : 0;
        return {
          ...t,
          employee_name: t.profiles?.full_name || 'Employee',
          duration_seconds: durSec,
          task_date: t.start_time ? t.start_time.substring(0, 10) : '',
        };
      });

      // Compute metrics
      const totalSeconds = attendance.reduce((acc, a) => acc + a.duration_seconds, 0);
      const daysLogged = new Set(attendance.map((a) => a.work_date)).size;
      const daysPresent = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
      const daysLate = attendance.filter((a) => a.status === 'late').length;

      const tasksTotal = tasks.length;
      const tasksCompleted = tasks.filter((t) => t.status === 'done').length;
      const tasksBlocked = tasks.filter((t) => t.status === 'blocked').length;
      const tasksCarriedOver = tasks.filter((t) => t.status === 'carried_over').length;

      const finishedTasks = tasks.filter((t) => t.duration_seconds > 0);
      const avgTaskSec =
        finishedTasks.length > 0
          ? finishedTasks.reduce((acc, t) => acc + t.duration_seconds, 0) / finishedTasks.length
          : 0;

      // Category hours
      const catMap: Record<string, number> = {};
      tasks.forEach((t) => {
        const cat = t.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + t.duration_seconds / 3600.0;
      });
      Object.keys(catMap).forEach((k) => {
        catMap[k] = parseFloat(catMap[k].toFixed(2));
      });

      // Daily hours breakdown
      const dayMap: Record<string, number> = {};
      attendance.forEach((a) => {
        dayMap[a.work_date] = (dayMap[a.work_date] || 0) + a.duration_seconds / 3600.0;
      });

      // Generate all dates in the range for chart completeness
      const dailyBreakdown: DailyHourItem[] = [];
      const curr = new Date(sDate);
      const last = new Date(eDate);
      const pad = (n: number) => n.toString().padStart(2, '0');

      while (curr <= last) {
        const dateStr = `${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`;
        dailyBreakdown.push({
          date: dateStr,
          hours: parseFloat((dayMap[dateStr] || 0).toFixed(2)),
        });
        curr.setDate(curr.getDate() + 1);
      }

      return {
        period: { start_date: sDate, end_date: eDate },
        metrics: {
          total_seconds_worked: totalSeconds,
          total_hours_worked: parseFloat((totalSeconds / 3600).toFixed(2)),
          days_logged: daysLogged,
          days_present: daysPresent,
          days_late: daysLate,
          tasks_total: tasksTotal,
          tasks_completed: tasksCompleted,
          tasks_blocked: tasksBlocked,
          tasks_carried_over: tasksCarriedOver,
          avg_task_duration_minutes: parseFloat((avgTaskSec / 60).toFixed(1)),
        },
        category_hours: catMap,
        daily_breakdown: dailyBreakdown,
        attendance,
        tasks,
      };
    },
    []
  );

  // Fetch report data
  const fetchReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const effUserId = isAdmin ? targetUserId || null : user.id;

    try {
      // 1. Try server-side aggregation RPC
      const { data, error: rpcError } = await supabase.rpc('get_report_summary', {
        p_target_user_id: effUserId,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (!rpcError && data) {
        // If daily breakdown has missing days in the range, fill them so chart is continuous
        const returnedBreakdown: Record<string, number> = {};
        (data.daily_breakdown || []).forEach((item: any) => {
          returnedBreakdown[item.date] = item.hours;
        });

        const fullDaily: DailyHourItem[] = [];
        const curr = new Date(startDate);
        const last = new Date(endDate);
        const pad = (n: number) => n.toString().padStart(2, '0');

        while (curr <= last) {
          const dStr = `${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`;
          fullDaily.push({
            date: dStr,
            hours: returnedBreakdown[dStr] || 0,
          });
          curr.setDate(curr.getDate() + 1);
        }

        setReportData({
          ...data,
          daily_breakdown: fullDaily,
        });
      } else {
        // 2. Fallback to client-side aggregation
        console.warn('RPC not available, using client-side fallback aggregation:', rpcError?.message);
        const fallback = await fallbackAggregation(effUserId, startDate, endDate);
        setReportData(fallback);
      }
    } catch (err: any) {
      console.error('Error fetching report:', err);
      try {
        const fallback = await fallbackAggregation(effUserId, startDate, endDate);
        setReportData(fallback);
      } catch (fErr: any) {
        setError(fErr?.message || 'Failed to generate report.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, targetUserId, startDate, endDate, fallbackAggregation]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
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
    refreshReport: fetchReport,
  };
};
