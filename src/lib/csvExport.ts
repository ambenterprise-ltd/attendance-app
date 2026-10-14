/**
 * CSV Generation and download utility without external libraries.
 */

const escapeCsvCell = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csvContent = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ReportExportData {
  periodLabel: string;
  employeeName: string;
  attendance: any[];
  tasks: any[];
}

export const exportReportToCsv = (data: ReportExportData) => {
  const rows: (string | number)[][] = [];

  // Metadata Header
  rows.push(['TEAM ATTENDANCE & TASK REPORT']);
  rows.push(['Period', data.periodLabel]);
  rows.push(['Employee Scope', data.employeeName]);
  rows.push(['Exported At (UTC)', new Date().toISOString()]);
  rows.push([]);

  // Attendance Section
  rows.push(['--- ATTENDANCE SUMMARY ---']);
  rows.push(['Date', 'Employee', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'Auto Closed']);
  data.attendance.forEach((att) => {
    const hours = (att.duration_seconds / 3600).toFixed(2);
    rows.push([
      att.work_date,
      att.employee_name || 'Employee',
      att.status,
      att.check_in || '',
      att.check_out || '',
      hours,
      att.auto_closed ? 'Yes' : 'No',
    ]);
  });
  rows.push([]);

  // Tasks Section
  rows.push(['--- TASKS SUMMARY ---']);
  rows.push(['Task Date', 'Employee', 'Title', 'Category', 'Objective', 'Outcome', 'Status', 'Duration (Hours)']);
  data.tasks.forEach((tsk) => {
    const hours = (tsk.duration_seconds / 3600).toFixed(2);
    rows.push([
      tsk.task_date || '',
      tsk.employee_name || 'Employee',
      tsk.title,
      tsk.category,
      tsk.objective,
      tsk.outcome || '',
      tsk.status,
      hours,
    ]);
  });

  const cleanFilename = `attendance-report-${data.periodLabel.toLowerCase().replace(/\s+/g, '-')}.csv`;
  downloadCsv(cleanFilename, rows);
};
