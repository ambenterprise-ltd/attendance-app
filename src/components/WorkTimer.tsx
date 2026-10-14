import React, { useState, useEffect } from 'react';
import { formatDurationSeconds } from '../lib/dateUtils';

interface WorkTimerProps {
  checkIn?: string | null;
  checkOut?: string | null;
  className?: string;
}

export const WorkTimer: React.FC<WorkTimerProps> = ({
  checkIn,
  checkOut,
  className = '',
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!checkIn) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(checkIn).getTime();

    // If already checked out, calculate fixed total seconds
    if (checkOut) {
      const endTime = new Date(checkOut).getTime();
      const diff = Math.max(0, Math.floor((endTime - startTime) / 1000));
      setElapsedSeconds(diff);
      return;
    }

    // Active session: live ticking counter
    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [checkIn, checkOut]);

  if (!checkIn) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <span className="text-3xl sm:text-4xl font-mono font-bold text-slate-300">
          00:00:00
        </span>
        <span className="text-xs text-slate-400 mt-1 font-medium">Session not started</span>
      </div>
    );
  }

  if (checkOut) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <span className="text-3xl sm:text-4xl font-mono font-bold text-slate-800">
          {formatDurationSeconds(elapsedSeconds)}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mt-2">
          <span>✓</span> Shift Finished
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className="text-3xl sm:text-4xl font-mono font-extrabold text-blue-600 tracking-tight">
        {formatDurationSeconds(elapsedSeconds)}
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mt-2">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
        Currently Working
      </span>
    </div>
  );
};
