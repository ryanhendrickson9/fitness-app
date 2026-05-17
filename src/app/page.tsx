'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WORKOUT_DAYS } from '@/lib/workout-data';
import { getLastSessionForDay } from '@/lib/storage';
import { WorkoutSession } from '@/lib/types';
import { BottomNav } from '@/components/BottomNav';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function getNextDayId(sessions: Record<number, WorkoutSession | null>): number {
  // Find the most recently completed day, suggest the next one
  const completed = WORKOUT_DAYS.filter((d) => sessions[d.id]?.completed);
  if (completed.length === 0) return 1;
  if (completed.length === WORKOUT_DAYS.length) return WORKOUT_DAYS[0].id;
  const lastDone = completed.sort((a, b) => {
    const aDate = sessions[a.id]?.date ?? '';
    const bDate = sessions[b.id]?.date ?? '';
    return bDate.localeCompare(aDate);
  })[0];
  const nextIdx = (WORKOUT_DAYS.findIndex((d) => d.id === lastDone.id) + 1) % WORKOUT_DAYS.length;
  return WORKOUT_DAYS[nextIdx].id;
}

function getWeeklyCompletedCount(sessions: Record<number, WorkoutSession | null>): number {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return Object.values(sessions).filter((s) => {
    if (!s?.completed) return false;
    return new Date(s.date) >= weekAgo;
  }).length;
}

export default function Home() {
  const [sessions, setSessions] = useState<Record<number, WorkoutSession | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data: Record<number, WorkoutSession | null> = {};
    Promise.all(
      WORKOUT_DAYS.map(async (day) => {
        data[day.id] = await getLastSessionForDay(day.id);
      })
    ).then(() => {
      setSessions({ ...data });
      setLoading(false);
    });
  }, []);

  const nextDayId = loading ? -1 : getNextDayId(sessions);
  const weeklyDone = getWeeklyCompletedCount(sessions);
  const progressPct = (weeklyDone / WORKOUT_DAYS.length) * 100;

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="bg-surface sticky top-0 z-50 flex justify-between items-center w-full px-[20px] h-16 border-b border-surface-container-highest">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm text-on-surface-variant">Hello,</span>
            <span className="text-headline-md text-primary tracking-tight">Ryan!</span>
          </div>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary-fixed/30 transition-colors">
          <span className="material-symbols-outlined text-primary">settings</span>
        </button>
      </header>

      <main className="px-[20px] max-w-screen-xl mx-auto py-6">
        {/* Weekly Progress */}
        <section className="mb-[48px]">
          <div className="bg-surface-container-low rounded-[24px] p-[24px] w-full flex items-center gap-6 border border-outline-variant/30">
            <div
              className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center circular-progress rounded-full"
              style={{ '--progress': `${progressPct}%` } as React.CSSProperties}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-headline-md text-primary">{weeklyDone}/{WORKOUT_DAYS.length}</span>
                <span className="text-label-sm text-on-surface-variant">Done</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-headline-md mb-1">Weekly Progress</h2>
              <p className="text-body-md text-on-surface-variant mb-4">
                {weeklyDone === 0
                  ? "Let's get your first session in!"
                  : weeklyDone < WORKOUT_DAYS.length
                  ? "You're making progress. Keep that momentum!"
                  : 'Full week complete — outstanding work!'}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 rounded-full bg-primary text-on-primary text-label-sm">
                  {weeklyDone === 0 ? 'Just getting started' : `${weeklyDone} session${weeklyDone > 1 ? 's' : ''} this week`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Day Cards */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-headline-md">Your Schedule</h3>
            <span className="text-label-md text-primary">4 Days</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            {WORKOUT_DAYS.map((day) => {
              const last = sessions[day.id];
              const isDone = !!last?.completed;
              const isNext = day.id === nextDayId && !loading;

              return (
                <Link key={day.id} href={`/session/${day.id}`}>
                  <div
                    className={`rounded-[24px] p-6 border transition-transform active:scale-[0.98] duration-200 cursor-pointer ${
                      isNext
                        ? 'bg-white border-primary shadow-[0px_10px_30px_rgba(99,102,241,0.1)]'
                        : 'bg-surface-container-low border-outline-variant/30'
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`text-label-sm uppercase tracking-wider ${isNext ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                          {isNext ? 'Next Up' : `Day ${day.id}`}
                        </span>
                        <h4 className="text-headline-md mt-1">{day.focus}</h4>
                      </div>
                      {isDone ? (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary">
                          <span className="material-symbols-outlined text-[18px] icon-filled">check_circle</span>
                          <span className="text-label-sm">Done {formatDate(last!.date)}</span>
                        </div>
                      ) : isNext ? (
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white">
                          <span className="material-symbols-outlined">play_arrow</span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
                          <span className="material-symbols-outlined">fitness_center</span>
                        </div>
                      )}
                    </div>

                    {/* Exercise list */}
                    <ul className="space-y-2 mb-6 text-on-surface-variant text-body-md">
                      {day.exercises.slice(0, 3).map((ex) => (
                        <li key={ex.name} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          {ex.name}
                        </li>
                      ))}
                      {day.exercises.length > 3 && (
                        <li className="flex items-center gap-2 text-on-surface-variant/60">
                          <div className="w-1.5 h-1.5 rounded-full bg-outline flex-shrink-0" />
                          +{day.exercises.length - 3} more
                        </li>
                      )}
                    </ul>

                    {/* CTA */}
                    {isNext ? (
                      <button className="w-full py-4 rounded-xl bg-primary text-on-primary text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[18px] icon-filled">play_arrow</span>
                        Start Session
                      </button>
                    ) : isDone ? (
                      <button className="w-full py-3 rounded-xl border border-primary text-primary text-label-md hover:bg-primary/5 transition-colors">
                        Start Again
                      </button>
                    ) : (
                      <button className="w-full py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-md hover:bg-surface-container transition-colors">
                        Start Session
                      </button>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
