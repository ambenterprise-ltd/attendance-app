import React, { useState, useEffect } from 'react';
import { formatDurationSeconds } from '../lib/dateUtils';

interface TaskTimerProps {
  startTime: string;
  className?: string;
}

export const TaskTimer: React.FC<TaskTimerProps> = ({ startTime, className = '' }) => {
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    if (!startTime) return;
    const startMs = new Date(startTime).getTime();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startMs) / 1000));
      setSeconds(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className={`font-mono font-bold tracking-tight ${className}`}>
      {formatDurationSeconds(seconds)}
    </div>
  );
};
