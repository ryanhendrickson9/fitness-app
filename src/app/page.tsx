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

export default function Home() {
  const [sessions, setSessions] = useState<Record<number, WorkoutSession | null>>({});

  useEffect(() => {
    const data: Record<number, WorkoutSession | null> = {};
    Promise.all(
      WORKOUT_DAYS.map(async (day) => {
        data[day.id] = await getLastSessionForDay(day.id);
      })
    ).then(() => setSessions({ ...data }));
  }, []);

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-32">
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
        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-headline-md">Your Schedule</h3>
            <span className="text-label-md text-primary">4 Days</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            {WORKOUT_DAYS.map((day) => {
              const last = sessions[day.id];
              const isDone = !!last?.completed;

              // Always exactly 3 bullets: show 2 + "[N] more" if over 3, otherwise all
              const showAll = day.exercises.length <= 3;
              const bullets = showAll ? day.exercises : day.exercises.slice(0, 2);
              const moreCount = showAll ? 0 : day.exercises.length - 2;

              return (
                <Link key={day.id} href={`/session/${day.id}`}>
                  <div className="rounded-[24px] p-6 bg-surface-container-low border border-outline-variant/30 transition-transform active:scale-[0.98] duration-200 cursor-pointer hover:border-outline-variant">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                          Day {day.id}
                        </span>
                        <h4 className="text-headline-md mt-1">{day.focus}</h4>
                      </div>
                      {isDone ? (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px] icon-filled">check_circle</span>
                          <span className="text-label-sm">Done {formatDate(last!.date)}</span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant flex-shrink-0">
                          <span className="material-symbols-outlined">fitness_center</span>
                        </div>
                      )}
                    </div>

                    {/* Exactly 3 bullets */}
                    <ul className="space-y-2 mb-6 text-on-surface-variant text-body-md">
                      {bullets.map((ex) => (
                        <li key={ex.name} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          {ex.name}
                        </li>
                      ))}
                      {moreCount > 0 && (
                        <li className="flex items-center gap-2 text-on-surface-variant/60">
                          <div className="w-1.5 h-1.5 rounded-full bg-outline flex-shrink-0" />
                          +{moreCount} more
                        </li>
                      )}
                    </ul>

                    {/* Consistent neutral CTA */}
                    <button className="w-full py-3 rounded-xl border border-outline-variant text-on-surface-variant text-label-md hover:bg-surface-container hover:border-primary hover:text-primary transition-colors">
                      {isDone ? 'Start Again' : 'Start Session'}
                    </button>
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
