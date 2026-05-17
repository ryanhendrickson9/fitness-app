'use client';

import Link from 'next/link';
import { WORKOUT_DAYS } from '@/lib/workout-data';
import { getLastSessionForDay } from '@/lib/storage';
import { useEffect, useState } from 'react';
import { WorkoutSession } from '@/lib/types';

const DAY_COLORS = [
  { accent: '#f97316', dim: 'rgba(249,115,22,0.12)', label: 'text-orange-400' },
  { accent: '#3b82f6', dim: 'rgba(59,130,246,0.12)', label: 'text-blue-400' },
  { accent: '#a855f7', dim: 'rgba(168,85,247,0.12)', label: 'text-purple-400' },
  { accent: '#22c55e', dim: 'rgba(34,197,94,0.12)', label: 'text-green-400' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

export default function Home() {
  const [lastSessions, setLastSessions] = useState<Record<number, WorkoutSession | null>>({});

  useEffect(() => {
    const data: Record<number, WorkoutSession | null> = {};
    Promise.all(
      WORKOUT_DAYS.map(async (day) => {
        data[day.id] = await getLastSessionForDay(day.id);
      })
    ).then(() => setLastSessions({ ...data }));
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080808' }}>
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: '#f97316' }}>
            Your Program
          </p>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Let&apos;s Work
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
            Pick a day and get started
          </p>
        </div>

        {/* Day Cards */}
        <div className="flex flex-col gap-3">
          {WORKOUT_DAYS.map((day, i) => {
            const color = DAY_COLORS[i];
            const last = lastSessions[day.id];

            return (
              <Link key={day.id} href={`/session/${day.id}`}>
                <div
                  className="relative overflow-hidden rounded-2xl p-5 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid #1f1f1f',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = color.accent + '60';
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#161616';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#1f1f1f';
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = '#111111';
                  }}
                >
                  {/* Accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                    style={{ backgroundColor: color.accent }}
                  />

                  <div className="pl-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold tracking-widest uppercase"
                            style={{ color: color.accent }}
                          >
                            {day.name}
                          </span>
                          {last && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: color.dim, color: color.accent }}
                            >
                              Done {formatDate(last.date)}
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-semibold text-white">{day.focus}</h2>
                        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
                          {day.exercises.length} exercises · {day.exercises[0].sets} sets each
                        </p>
                      </div>
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color.dim }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M6 3l5 5-5 5"
                            stroke={color.accent}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Exercise pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {day.exercises.slice(0, 3).map((ex) => (
                        <span
                          key={ex.name}
                          className="text-xs px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: '#1f1f1f', color: '#9ca3af' }}
                        >
                          {ex.name}
                        </span>
                      ))}
                      {day.exercises.length > 3 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: '#1f1f1f', color: '#6b7280' }}
                        >
                          +{day.exercises.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
