import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { AttendanceRecord } from '../types';
import { getTodayKarachiDate, getStartOfCurrentMonth } from '../lib/dateUtils';

export const useAttendance = () => {
  const { user } = useAuth();

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [hasRunningTask, setHasRunningTask] = useState<boolean>(false);

  const [loadingToday, setLoadingToday] = useState<boolean>(true);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear transient alerts
  const clearAlerts = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Fetch today's attendance record
  const fetchTodayAttendance = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingToday(true);
      const todayDate = getTodayKarachiDate();

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_date', todayDate)
        .maybeSingle();

      if (error) {
        console.error('Error fetching today attendance:', error.message);
      } else {
        setTodayRecord((data as AttendanceRecord) ?? null);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching today attendance:', err);
    } finally {
      setLoadingToday(false);
    }
  }, [user]);

  // Check if there is an in-progress task for this user
  const checkActiveTask = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (!error) {
        setHasRunningTask(!!data);
      }
    } catch {
      // ignore
    }
  }, [user]);

  // Fetch monthly attendance records
  const fetchMonthlyAttendance = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingMonthly(true);
      const startOfMonth = getStartOfCurrentMonth();

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('work_date', startOfMonth)
        .order('work_date', { ascending: false });

      if (error) {
        console.error('Error fetching monthly records:', error.message);
      } else {
        setMonthlyRecords((data as AttendanceRecord[]) ?? []);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching monthly attendance:', err);
    } finally {
      setLoadingMonthly(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
      fetchMonthlyAttendance();
      checkActiveTask();
    }
  }, [user, fetchTodayAttendance, fetchMonthlyAttendance, checkActiveTask]);

  // Check In via RPC
  const handleCheckIn = async () => {
    clearAlerts();
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_in');

      if (error) {
        let msg = error.message;
        if (msg.includes('Already checked in today')) {
          msg = 'You have already checked in for today.';
        }
        setErrorMessage(msg);
      } else {
        setTodayRecord(data as AttendanceRecord);
        setSuccessMessage('Checked in successfully!');
        await fetchMonthlyAttendance();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to check in. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Check Out via RPC
  const handleCheckOut = async () => {
    clearAlerts();
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_out');

      if (error) {
        let msg = error.message;
        if (msg.toLowerCase().includes('task is in progress')) {
          msg = 'Cannot check out while a task is in progress. Please stop or complete your active task on the Tasks page first.';
        } else if (msg.includes('No check-in record found')) {
          msg = 'No check-in record found for today.';
        } else if (msg.includes('Already checked out')) {
          msg = 'You have already checked out for today.';
        }
        setErrorMessage(msg);
      } else {
        setTodayRecord(data as AttendanceRecord);
        setSuccessMessage('Checked out successfully!');
        await fetchMonthlyAttendance();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to check out. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return {
    todayRecord,
    monthlyRecords,
    hasRunningTask,
    loadingToday,
    loadingMonthly,
    actionLoading,
    errorMessage,
    successMessage,
    clearAlerts,
    handleCheckIn,
    handleCheckOut,
    refreshToday: fetchTodayAttendance,
    refreshMonthly: fetchMonthlyAttendance,
  };
};
