import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Profile,
  AttendanceRecord,
  TaskRecord,
  LeaveRecord,
  EditRequestRecord,
  AuditLogRecord,
  EmployeeLiveStatus,
  TaskCategory,
} from '../types';
import { getTodayKarachiDate, getStartOfCurrentMonth } from '../lib/dateUtils';

export const useAdmin = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeLiveStatus[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequestRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearAlerts = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // 1. Fetch live employee statuses and monthly summary
  const fetchLiveStatuses = useCallback(async () => {
    try {
      const today = getTodayKarachiDate();
      const startOfMonth = getStartOfCurrentMonth();

      // Fetch all user profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      const profiles: Profile[] = (profilesData as Profile[]) || [];

      // Fetch today's attendance for all users
      const { data: todayAttData } = await supabase
        .from('attendance')
        .select('*')
        .eq('work_date', today);

      const todayAttMap = new Map<string, AttendanceRecord>();
      (todayAttData as AttendanceRecord[] || []).forEach((att) => {
        todayAttMap.set(att.user_id, att);
      });

      // Fetch all running tasks
      const { data: runningTasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'in_progress');

      const runningTaskMap = new Map<string, TaskRecord>();
      (runningTasksData as TaskRecord[] || []).forEach((tsk) => {
        runningTaskMap.set(tsk.user_id, tsk);
      });

      // Fetch monthly attendance for monthly summary
      const { data: monthAttData } = await supabase
        .from('attendance')
        .select('*')
        .gte('work_date', startOfMonth);

      const monthAttList = (monthAttData as AttendanceRecord[]) || [];

      // Compile live statuses
      const compiled: EmployeeLiveStatus[] = profiles.map((p) => {
        const userMonthAtt = monthAttList.filter((a) => a.user_id === p.id);
        const daysPresent = userMonthAtt.filter(
          (a) => a.status === 'present' || a.status === 'late'
        ).length;
        const daysLate = userMonthAtt.filter((a) => a.status === 'late').length;

        const totalSec = userMonthAtt.reduce((acc, a) => {
          if (a.check_in && a.check_out) {
            const s = new Date(a.check_in).getTime();
            const e = new Date(a.check_out).getTime();
            if (e > s) return acc + Math.floor((e - s) / 1000);
          }
          return acc;
        }, 0);

        return {
          profile: p,
          todayAttendance: todayAttMap.get(p.id) || null,
          currentTask: runningTaskMap.get(p.id) || null,
          monthlySummary: {
            daysPresent,
            daysLate,
            totalHours: parseFloat((totalSec / 3600).toFixed(1)),
          },
        };
      });

      setEmployeeStatuses(compiled);
    } catch (err: any) {
      console.error('Error fetching live statuses:', err);
    }
  }, []);

  // 2. Fetch Leave Requests
  const fetchLeaves = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*, profiles:user_id(full_name)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((l: any) => ({
          ...l,
          employee_name: l.profiles?.full_name || 'Employee',
        }));
        setLeaves(mapped);
      }
    } catch {
      // ignore
    }
  }, []);

  // 3. Fetch Edit Requests
  const fetchEditRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('edit_requests')
        .select('*, profiles:user_id(full_name)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((r: any) => ({
          ...r,
          employee_name: r.profiles?.full_name || 'Employee',
        }));
        setEditRequests(mapped);
      }
    } catch {
      // ignore
    }
  }, []);

  // 4. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, actor:actor_id(full_name), target:target_user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const mapped = data.map((log: any) => ({
          ...log,
          actor_name: log.actor?.full_name || 'Admin',
          target_user_name: log.target?.full_name || undefined,
        }));
        setAuditLogs(mapped);
      }
    } catch {
      // ignore
    }
  }, []);

  // Load all admin data
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchLiveStatuses(),
      fetchLeaves(),
      fetchEditRequests(),
      fetchAuditLogs(),
    ]);
    setLoading(false);
  }, [fetchLiveStatuses, fetchLeaves, fetchEditRequests, fetchAuditLogs]);

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    }
  }, [isAdmin, loadAll]);

  // Review Leave Request (Approve / Reject)
  const handleReviewLeave = async (
    leaveId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ) => {
    clearAlerts();
    setActionLoading(true);

    try {
      const { error: rpcError } = await supabase.rpc('review_leave_request', {
        p_leave_id: leaveId,
        p_status: status,
        p_notes: notes || null,
      });

      if (rpcError) {
        // Fallback direct update
        const { error: directError } = await supabase
          .from('leaves')
          .update({
            status,
            reviewed_at: new Date().toISOString(),
            admin_notes: notes || null,
          })
          .eq('id', leaveId);

        if (directError) throw directError;
      }

      setSuccessMessage(`Leave request marked as ${status}.`);
      await fetchLeaves();
      await fetchAuditLogs();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update leave request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Edit Request
  const handleApproveEditRequest = async (requestId: string, notes?: string) => {
    clearAlerts();
    setActionLoading(true);

    try {
      const { error: rpcError } = await supabase.rpc('approve_edit_request', {
        p_request_id: requestId,
        p_notes: notes || null,
      });

      if (rpcError) {
        // Direct fallback update
        const req = editRequests.find((r) => r.id === requestId);
        if (req) {
          if (req.attendance_id) {
            await supabase
              .from('attendance')
              .update({
                check_in: req.requested_check_in || undefined,
                check_out: req.requested_check_out || undefined,
              })
              .eq('id', req.attendance_id);
          }
          await supabase
            .from('edit_requests')
            .update({
              status: 'approved',
              reviewed_at: new Date().toISOString(),
              admin_notes: notes || null,
            })
            .eq('id', requestId);
        }
      }

      setSuccessMessage('Timestamp correction approved and applied to attendance.');
      await Promise.all([fetchEditRequests(), fetchLiveStatuses(), fetchAuditLogs()]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to approve timestamp request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Edit Request
  const handleRejectEditRequest = async (requestId: string, notes?: string) => {
    clearAlerts();
    setActionLoading(true);

    try {
      const { error: rpcError } = await supabase.rpc('reject_edit_request', {
        p_request_id: requestId,
        p_notes: notes || null,
      });

      if (rpcError) {
        await supabase
          .from('edit_requests')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            admin_notes: notes || null,
          })
          .eq('id', requestId);
      }

      setSuccessMessage('Timestamp correction rejected.');
      await Promise.all([fetchEditRequests(), fetchAuditLogs()]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reject timestamp request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Assign Task
  const handleAssignTask = async (
    userId: string,
    title: string,
    category: TaskCategory,
    objective: string
  ): Promise<boolean> => {
    clearAlerts();
    setActionLoading(true);

    try {
      const { error: rpcError } = await supabase.rpc('admin_assign_task', {
        p_user_id: userId,
        p_title: title.trim(),
        p_category: category,
        p_objective: objective.trim(),
      });

      if (rpcError) {
        // Fallback direct insert
        const { error: insertError } = await supabase.from('tasks').insert({
          user_id: userId,
          title: title.trim(),
          category,
          objective: objective.trim(),
          status: 'carried_over',
          start_time: new Date().toISOString(),
        });
        if (insertError) throw insertError;
      }

      setSuccessMessage('Task assigned successfully to employee.');
      await Promise.all([fetchLiveStatuses(), fetchAuditLogs()]);
      return true;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to assign task.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
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
    refreshAll: loadAll,
  };
};
