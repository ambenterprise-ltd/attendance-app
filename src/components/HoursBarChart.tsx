import React, { useState } from 'react';
import { formatKarachiDate } from '../lib/dateUtils';

export interface DailyHourItem {
  date: string; // YYYY-MM-DD
  hours: number;
}

interface HoursBarChartProps {
  data: DailyHourItem[];
  className?: string;
}

export const HoursBarChart: React.FC<HoursBarChartProps> = ({ data, className = '' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
        <span className="text-2xl mb-1">📊</span>
        <span className="text-xs">No hours recorded for this period</span>
      </div>
    );
  }

  // Maximum value for scale (at least 8 hours for standard workday scale)
  const maxDataHours = Math.max(...data.map((d) => d.hours), 0);
  const maxScaleHours = Math.max(8, Math.ceil(maxDataHours + 1));

  // Y-axis grid marks (0, 2, 4, 6, 8, maxScaleHours)
  const gridSteps = [0, 2, 4, 6, 8];
  if (maxScaleHours > 8) gridSteps.push(maxScaleHours);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Scrollable Container on Mobile */}
      <div className="overflow-x-auto pb-4">
        {/* Chart Canvas */}
        <div className={`relative h-64 flex items-end pt-8 pb-8 pl-10 pr-2 border-b border-l border-slate-200 ${
          data.length > 7 ? 'min-w-[520px]' : 'min-w-full'
        }`}>

        {/* Background Grid Lines & Y-Axis Labels */}
        {gridSteps.map((step) => {
          const bottomPercent = (step / maxScaleHours) * 100;
          return (
            <div
              key={step}
              className="absolute left-0 right-0 flex items-center pointer-events-none"
              style={{ bottom: `calc(${bottomPercent}% + 2rem)` }}
            >
              <span className="absolute -left-9 text-[10px] font-mono text-slate-400 w-7 text-right">
                {step}h
              </span>
              <div
                className={`w-full border-t ${
                  step === 8
                    ? 'border-emerald-300 border-dashed'
                    : 'border-slate-100'
                }`}
              ></div>
            </div>
          );
        })}

        {/* 8-Hour Workday Legend Marker */}
        <div
          className="absolute right-2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 pointer-events-none"
          style={{ bottom: `calc(${(8 / maxScaleHours) * 100}% + 2.4rem)` }}
        >
          8h Target
        </div>

        {/* Bars Container */}
        <div className="w-full h-full flex items-end justify-around gap-1 sm:gap-2 z-10">
          {data.map((item, idx) => {
            const heightPercent = Math.min(
              100,
              Math.max(4, (item.hours / maxScaleHours) * 100)
            );
            const isHovered = hoveredIndex === idx;
            const hasHours = item.hours > 0;

            // Format date for label (e.g., "15" or "Thu 15")
            const parts = item.date.split('-');
            const dayNum = parts[2] || item.date;

            return (
              <div
                key={item.date}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap pointer-events-none flex flex-col items-center animate-in fade-in">
                    <span className="font-bold">{item.hours.toFixed(1)} hrs</span>
                    <span className="text-[10px] text-slate-300">
                      {formatKarachiDate(item.date)}
                    </span>
                    <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1"></div>
                  </div>
                )}

                {/* Hours value above bar */}
                {hasHours && (
                  <span className="text-[10px] font-bold text-slate-700 mb-1 hidden sm:block">
                    {item.hours.toFixed(1)}h
                  </span>
                )}

                {/* The Bar */}
                <div
                  className={`w-full max-w-[36px] rounded-t-md transition-all duration-300 ${
                    !hasHours
                      ? 'bg-slate-100 hover:bg-slate-200'
                      : item.hours >= 8
                      ? isHovered
                        ? 'bg-emerald-600'
                        : 'bg-emerald-500'
                      : isHovered
                      ? 'bg-blue-700'
                      : 'bg-blue-600'
                  }`}
                  style={{
                    height: hasHours ? `${heightPercent}%` : '4px',
                  }}
                ></div>

                {/* X-Axis Day Label */}
                <div className="absolute -bottom-7 text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                  {data.length <= 14 ? (
                    <span>{dayNum}</span>
                  ) : idx % 3 === 0 || idx === data.length - 1 ? (
                    <span>{dayNum}</span>
                  ) : (
                    <span className="text-slate-300">&bull;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>


      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <span>X-Axis: Days of the period</span>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>
            <span>&lt; 8h</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>&ge; 8h Target</span>
          </div>
        </div>
      </div>
    </div>
  );
};
