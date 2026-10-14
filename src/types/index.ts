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
}
