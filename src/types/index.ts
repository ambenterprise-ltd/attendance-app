export type UserRole = 'admin' | 'employee';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'half_day';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  work_date: string; // YYYY-MM-DD
  check_in: string | null; // timestamptz
  check_out: string | null; // timestamptz
  status: AttendanceStatus;
  auto_closed: boolean;
  profiles?: { full_name: string };
}

export type TaskStatus = 'in_progress' | 'done' | 'blocked' | 'carried_over';
export type TaskCategory = 'Client Work' | 'Internal' | 'Meeting' | 'Learning' | 'Other';

export interface TaskRecord {
  id: string;
  user_id: string;
  title: string;
  category: TaskCategory;
  objective: string;
  start_time: string; // timestamptz
  end_time: string | null; // timestamptz
  outcome: string | null;
  status: TaskStatus;
  profiles?: { full_name: string };
}

export type LeaveType = 'sick' | 'casual' | 'annual' | 'unpaid';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRecord {
  id: string;
  user_id: string;
  employee_name?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  leave_type: LeaveType;
  reason: string;
  status: RequestStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
}

export interface EditRequestRecord {
  id: string;
  user_id: string;
  employee_name?: string;
  attendance_id?: string | null;
  work_date: string;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  status: RequestStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  target_user_id?: string | null;
  target_user_name?: string | null;
  entity_type: string;
  entity_id?: string | null;
  old_values?: any;
  new_values?: any;
  notes?: string | null;
  created_at: string;
}

export interface EmployeeLiveStatus {
  profile: Profile;
  todayAttendance: AttendanceRecord | null;
  currentTask: TaskRecord | null;
  monthlySummary: {
    daysPresent: number;
    daysLate: number;
    totalHours: number;
  };
}
