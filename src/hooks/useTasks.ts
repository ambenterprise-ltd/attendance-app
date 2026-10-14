import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { TaskRecord, TaskCategory, TaskStatus } from '../types';
import { getTodayKarachiDate, getKarachiDayBounds } from '../lib/dateUtils';

export const useTasks = () => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [activeTask, setActiveTask] = useState<TaskRecord | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearAlerts = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Check today's attendance state for this user
  const checkAttendanceStatus = useCallback(async () => {
    if (!user) return;
    try {
      const todayDate = getTodayKarachiDate();
      const { data } = await supabase
        .from('attendance')
        .select('check_in, check_out')
        .eq('user_id', user.id)
        .eq('work_date', todayDate)
        .maybeSingle();

      const checkedIn = !!data?.check_in && !data?.check_out;
      setIsCheckedIn(checkedIn);
    } catch {
      // ignore
    }
  }, [user]);

  // Fetch today's tasks and active task
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { startIso } = getKarachiDayBounds();

      // Query today's tasks OR any task currently in progress
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .or(`start_time.gte.${startIso},status.eq.in_progress`)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error.message);
        setErrorMessage(error.message);
      } else {
        const records = (data as TaskRecord[]) || [];
        setTasks(records);

        const currentActive = records.find((t) => t.status === 'in_progress') || null;
        setActiveTask(currentActive);
      }
    } catch (err: any) {
      console.error('Unexpected error loading tasks:', err);
      setErrorMessage(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      checkAttendanceStatus();
    }
  }, [user, fetchTasks, checkAttendanceStatus]);

  // Start task via RPC
  const handleStartTask = async (
    title: string,
    category: TaskCategory,
    objective: string
  ): Promise<boolean> => {
    clearAlerts();
    setActionLoading(true);

    try {
      const { data, error } = await supabase.rpc('start_task', {
        p_title: title.trim(),
        p_category: category,
        p_objective: objective.trim(),
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('must check in before starting a task')) {
          msg = 'You must check in on the Dashboard before starting a task.';
        } else if (msg.includes('after checking out')) {
          msg = 'You have already checked out for today. You cannot start a task.';
        } else if (msg.includes('already have an active task')) {
          msg = 'You already have an active task running. Please complete or end it first.';
        }
        setErrorMessage(msg);
        return false;
      }

      setSuccessMessage('Task started successfully!');
      setActiveTask(data as TaskRecord);
      await fetchTasks();
      return true;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to start task.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // End task via RPC
  const handleEndTask = async (
    taskId: string,
    outcome: string,
    status: 'done' | 'blocked' | 'carried_over'
  ): Promise<boolean> => {
    clearAlerts();
    setActionLoading(true);

    try {
      const { error } = await supabase.rpc('end_task', {
        p_task_id: taskId,
        p_outcome: outcome.trim(),
        p_status: status,
      });

      if (error) {
        setErrorMessage(error.message);
        return false;
      }

      setSuccessMessage(`Task ended with status: ${status}.`);
      setActiveTask(null);
      await fetchTasks();
      return true;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to end task.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
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
    refreshTasks: fetchTasks,
  };
};
