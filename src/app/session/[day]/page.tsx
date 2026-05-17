'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WORKOUT_DAYS } from '@/lib/workout-data';
import { getLastSessionForDay, saveSession } from '@/lib/storage';
import { ExerciseLog, RPELevel, SetLog, WorkoutSession } from '@/lib/types';
import { BottomNav } from '@/components/BottomNav';

type Phase = 'setup' | 'active' | 'complete';

const RPE_OPTIONS: { value: RPELevel; emoji: string; label: string; sublabel: string }[] = [
  { value: 'warmup',  emoji: '😊', label: 'Easy',     sublabel: 'Barely any effort' },
  { value: 'rpe1-5',  emoji: '🙂', label: 'Light',    sublabel: 'Could go all day' },
  { value: 'rpe6-7',  emoji: '😐', label: 'Moderate', sublabel: 'Breathing harder' },
  { value: 'rpe8-9',  emoji: '😥', label: 'Hard',     sublabel: 'A couple reps left' },
  { value: 'rpe10',   emoji: '🥵', label: 'Max',      sublabel: 'Nothing left' },
];

function buildInitialLogs(dayId: number, pct: number, last: WorkoutSession | null): ExerciseLog[] {
  const day = WORKOUT_DAYS.find((d) => d.id === dayId)!;
  return day.exercises.map((ex) => {
    const lastEx = last?.exercises.find((e) => e.exerciseName === ex.name);
    const sets: SetLog[] = Array.from({ length: ex.sets }, (_, i) => {
      const lastSet = lastEx?.sets[i];
      let weight: number | null = null;
      if (!ex.isBodyweight) {
        if (lastSet?.weight != null) weight = Math.round(lastSet.weight * (1 + pct / 100) * 4) / 4;
        else if (ex.defaultWeight != null) weight = Math.round(ex.defaultWeight * (1 + pct / 100) * 4) / 4;
      }
      return { weight, reps: lastSet?.reps ?? ex.reps, completed: false };
    });
    return { exerciseName: ex.name, sets };
  });
}


export default function SessionPage({ params }: { params: Promise<{ day: string }> }) {
  const { day: dayParam } = use(params);
  const router = useRouter();
  const dayId = parseInt(dayParam, 10);
  const day = WORKOUT_DAYS.find((d) => d.id === dayId);

  const [phase, setPhase] = useState<Phase>('setup');
  const [pct, setPct] = useState(5);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [rpe, setRpe] = useState<RPELevel | null>(null);
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [activeExercise, setActiveExercise] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (day) getLastSessionForDay(dayId).then(setLastSession);
  }, [dayId, day]);

  if (!day) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-on-surface">Day not found.</p>
      </div>
    );
  }

  const completedSets = logs.flatMap((l) => l.sets).filter((s) => s.completed).length;
  const totalSets = logs.flatMap((l) => l.sets).length;
  const progress = totalSets > 0 ? completedSets / totalSets : 0;
  const allDone = logs.length > 0 && logs.every((ex) => ex.sets.every((s) => s.completed));

  function startWorkout() {
    setLogs(buildInitialLogs(dayId, pct, lastSession));
    setActiveExercise(0);
    setPhase('active');
  }

  function updateSet(exIdx: number, si: number, field: 'weight' | 'reps', value: string) {
    setLogs((prev) => prev.map((ex, ei) => ei !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== si ? s : field === 'weight'
        ? { ...s, weight: value === '' ? null : parseFloat(value) }
        : { ...s, reps: value === '' ? '' : isNaN(Number(value)) ? value : Number(value) }
      ),
    }));
  }

  function toggleSet(exIdx: number, si: number) {
    setLogs((prev) => prev.map((ex, ei) => ei !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== si ? s : { ...s, completed: !s.completed }),
    }));
  }

  async function finishWorkout() {
    if (!rpe || saving) return;
    setSaving(true);
    await saveSession({
      dayId,
      date: new Date().toISOString().split('T')[0],
      weightIncreasePct: pct,
      exercises: logs,
      rpe,
      completed: true,
    });
    router.push('/');
  }

  const currentEx = day.exercises[activeExercise];
  const currentLog = logs[activeExercise];

  // ── SETUP ─────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="bg-surface text-on-surface min-h-screen pb-24">
        <header className="bg-surface border-b border-surface-container-highest flex justify-between items-center w-full px-[20px] h-16 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
            </Link>
            <h1 className="text-headline-md text-primary tracking-tight">Session Setup</h1>
          </div>
          <button className="text-on-surface-variant hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </header>

        <main className="pt-6 px-[20px] max-w-[640px] mx-auto">
          <section className="mb-[48px]">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">{day.name}</span>
            <h2 className="text-headline-lg-mobile text-on-surface mt-1 mb-2">How are you feeling?</h2>
            <p className="text-body-md text-on-surface-variant">
              Adjust your intensity for today&apos;s session based on your recovery.
            </p>
          </section>

          {/* Slider */}
          <section className="mb-[48px] bg-surface-container-low rounded-[24px] p-8 border border-surface-container-highest">
            <div className="flex flex-col items-center mb-8">
              <span className="text-display-lg text-primary mb-2">+{pct}%</span>
              <span className="bg-primary text-on-primary px-4 py-1 rounded-full text-label-sm uppercase tracking-wider">
                {pct === 0 ? 'Recovery' : pct <= 5 ? 'Conservative' : pct <= 10 ? 'Optimal Growth' : pct <= 15 ? 'Aggressive' : 'Max Effort'}
              </span>
            </div>
            <div className="relative px-2">
              <input
                type="range"
                min={0} max={20} step={1}
                value={pct}
                onChange={(e) => setPct(parseInt(e.target.value))}
                className="range-primary w-full"
              />
              <div className="flex justify-between mt-4">
                <span className="text-label-sm text-on-surface-variant">Recovery (0%)</span>
                <span className="text-label-sm text-on-surface-variant">Max Effort (20%)</span>
              </div>
            </div>
          </section>

          {/* Exercise preview */}
          <section className="mb-[48px]">
            <div className="flex justify-between items-end mb-[16px]">
              <h3 className="text-headline-md text-on-surface">Today&apos;s Preview</h3>
              <span className="text-label-md text-primary">{day.exercises.length} Exercises</span>
            </div>
            <div className="space-y-4">
              {day.exercises.map((ex) => {
                const lastEx = lastSession?.exercises.find((e) => e.exerciseName === ex.name);
                const lastWeight = lastEx?.sets[0]?.weight;
                const suggested = ex.isBodyweight ? null
                  : lastWeight != null ? Math.round(lastWeight * (1 + pct / 100) * 4) / 4
                  : ex.defaultWeight;
                const diff = lastWeight != null && suggested != null ? suggested - lastWeight : null;

                return (
                  <div
                    key={ex.name}
                    className="flex items-center justify-between p-[16px] bg-surface-container-lowest rounded-[24px] border border-surface-container-highest active:scale-[0.98] transition-transform"
                    style={{ boxShadow: '0px 10px 30px rgba(99,102,241,0.05)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">fitness_center</span>
                      </div>
                      <div>
                        <p className="text-label-md text-on-surface">{ex.name}</p>
                        <p className="text-label-sm text-on-surface-variant">
                          {ex.sets} Sets · {ex.reps}{typeof ex.reps === 'number' ? ' Reps' : ''}
                          {ex.isBodyweight ? ' · Bodyweight' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {ex.isBodyweight ? (
                        <p className="text-body-lg font-bold text-on-surface">BW</p>
                      ) : suggested != null ? (
                        <>
                          <p className="text-body-lg font-bold text-on-surface">{suggested} lbs</p>
                          {diff != null && diff > 0 && (
                            <p className="text-label-sm text-primary">+{diff} lbs vs last</p>
                          )}
                          {!lastWeight && <p className="text-label-sm text-on-surface-variant">Default</p>}
                        </>
                      ) : (
                        <p className="text-label-sm text-on-surface-variant">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <button
              onClick={startWorkout}
              className="w-full bg-primary text-on-primary py-5 rounded-xl text-headline-md hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              Start Workout
            </button>
            <p className="text-center mt-4 text-label-sm text-on-surface-variant">
              {lastSession
                ? `Last session: ${new Date(lastSession.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}`
                : 'First session — weights from your PT program'}
            </p>
          </section>
        </main>

        <BottomNav />
      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────
  if (phase === 'active') {
    return (
      <div className="bg-background text-on-background min-h-screen">
        {/* Top bar */}
        <header className="bg-surface border-b border-surface-container-highest flex flex-col w-full sticky top-0 z-50">
          <div className="flex justify-between items-center w-full px-[20px] h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-headline-md text-primary tracking-tight">Pulse</h1>
            </div>
            <button
              onClick={() => setPhase('complete')}
              className="text-label-md text-on-surface-variant border border-outline-variant px-4 py-1.5 rounded-full hover:bg-surface-container transition-colors"
            >
              Finish
            </button>
          </div>
          {/* Progress */}
          <div className="px-[20px] pb-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">Workout Progress</span>
              <span className="text-label-md text-primary">{activeExercise + 1} of {day.exercises.length} Exercises</span>
            </div>
            <div className="h-2 w-full bg-primary-fixed rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </header>

        <main className="max-w-[640px] mx-auto px-[20px] py-[24px] flex flex-col gap-[24px] pb-40">
          {/* Exercise tabs */}
          <nav className="flex gap-[16px] overflow-x-auto scrollbar-hide py-1 -mx-[20px] px-[20px]">
            {day.exercises.map((ex, i) => {
              const exLog = logs[i];
              const done = exLog?.sets.every((s) => s.completed);
              return (
                <button
                  key={i}
                  onClick={() => setActiveExercise(i)}
                  className={`px-5 py-2 rounded-full border text-label-md whitespace-nowrap active:scale-95 transition-all ${
                    i === activeExercise
                      ? 'border-primary bg-primary text-on-primary'
                      : done
                      ? 'border-primary/40 bg-primary-fixed text-primary'
                      : 'border-outline-variant bg-surface text-on-surface-variant'
                  }`}
                >
                  {ex.name.split(' ').slice(0, 2).join(' ')}
                </button>
              );
            })}
          </nav>

          {/* Exercise card */}
          {currentLog && (
            <section
              className="bg-surface-container-lowest rounded-[24px] p-6 border border-surface-container"
              style={{ boxShadow: '0px 10px 30px rgba(99,102,241,0.05)' }}
            >
              <div className="flex items-center gap-3 mb-[24px]">
                <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[28px]">fitness_center</span>
                </div>
                <div>
                  <h2 className="text-headline-lg text-on-surface">{currentEx.name}</h2>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">
                    {currentEx.sets} Sets · {currentEx.reps}{typeof currentEx.reps === 'number' ? ' Reps' : ''}
                    {currentEx.isBodyweight ? ' · Bodyweight' : ''}
                    {currentEx.isTimeBased ? ' Hold' : ''}
                  </p>
                </div>
              </div>

              {/* Sets table */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-[1fr_2fr_2fr_1fr] px-4 text-label-sm text-on-surface-variant uppercase tracking-tighter">
                  <span>Set</span>
                  <span className="text-center">{currentEx.isTimeBased ? 'Duration' : 'LBS'}</span>
                  <span className="text-center">Reps</span>
                  <span className="text-right">Done</span>
                </div>

                {currentLog.sets.map((set, si) => (
                  <div
                    key={si}
                    className={`grid grid-cols-[1fr_2fr_2fr_1fr] items-center px-4 py-4 rounded-xl border transition-all ${
                      set.completed
                        ? 'bg-surface-container-low border-transparent'
                        : 'bg-white border-2 border-primary shadow-sm'
                    }`}
                  >
                    <span className={`text-label-md ${set.completed ? 'text-on-surface-variant' : 'text-primary font-bold'}`}>
                      {si + 1}
                    </span>

                    {currentEx.isBodyweight ? (
                      <div className="text-center text-body-md text-on-surface-variant">BW</div>
                    ) : currentEx.isTimeBased ? (
                      <input
                        type="text"
                        value={String(set.reps)}
                        onChange={(e) => updateSet(activeExercise, si, 'reps', e.target.value)}
                        className="text-center text-headline-md text-on-surface bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
                      />
                    ) : (
                      <input
                        type="number"
                        value={set.weight ?? ''}
                        placeholder="—"
                        onChange={(e) => updateSet(activeExercise, si, 'weight', e.target.value)}
                        className="text-center text-headline-md text-on-surface bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
                      />
                    )}

                    {currentEx.isTimeBased ? (
                      <div className="text-center text-body-md text-on-surface-variant">—</div>
                    ) : (
                      <input
                        type={typeof set.reps === 'number' ? 'number' : 'text'}
                        value={String(set.reps)}
                        onChange={(e) => updateSet(activeExercise, si, 'reps', e.target.value)}
                        className="text-center text-headline-md text-on-surface bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
                      />
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => toggleSet(activeExercise, si)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                          set.completed
                            ? 'border-primary bg-transparent'
                            : 'border-outline-variant'
                        }`}
                      >
                        {set.completed ? (
                          <span className="material-symbols-outlined text-[20px] text-primary icon-filled">check_circle</span>
                        ) : (
                          <span className="material-symbols-outlined text-[20px] text-outline-variant">check</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 w-full z-50">
          <div className="bg-surface/90 backdrop-blur-lg px-[20px] py-4 flex gap-[16px] border-t border-surface-container-highest">
            {activeExercise > 0 && (
              <button
                onClick={() => setActiveExercise((p) => p - 1)}
                className="px-6 py-4 rounded-xl border border-outline-variant text-on-surface-variant text-label-md active:scale-95 transition-transform"
              >
                ← Back
              </button>
            )}
            {activeExercise < day.exercises.length - 1 ? (
              <button
                onClick={() => setActiveExercise((p) => p + 1)}
                className="flex-1 py-4 px-6 bg-primary text-on-primary rounded-xl text-label-md active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                Next Exercise
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={() => setPhase('complete')}
                className="flex-1 py-4 px-6 bg-primary text-on-primary rounded-xl text-label-md active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {allDone ? 'Complete Workout' : 'Finish Up'}
                <span className="material-symbols-outlined text-[18px]">
                  {allDone ? 'check' : 'arrow_forward'}
                </span>
              </button>
            )}
          </div>
          <BottomNav />
        </div>
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-background min-h-screen pb-32">
      <header className="bg-surface border-b border-surface-container-highest fixed top-0 left-0 w-full z-50 h-16 flex justify-between items-center px-[20px]">
        <span className="text-headline-md text-primary tracking-tight">Pulse</span>
        <button
          onClick={() => setPhase('active')}
          className="text-on-surface-variant text-label-md flex items-center gap-1 hover:opacity-80"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back
        </button>
      </header>

      <main className="pt-24 pb-32 px-[20px] max-w-[640px] mx-auto">
        {/* Hero */}
        <section className="text-center mb-[48px]">
          <span className="text-label-md text-on-surface-variant tracking-wider block mb-2">Session Complete</span>
          <h1 className="text-display-lg text-primary mb-[24px]">Great Job!</h1>

          {/* Sets summary */}
          <div className="bg-surface-container-lowest rounded-[24px] p-5 border border-surface-container text-left">
            <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">Sets Completed</p>
            <div className="flex flex-col gap-2">
              {logs.map((ex) => {
                const done = ex.sets.filter((s) => s.completed).length;
                return (
                  <div key={ex.exerciseName} className="flex items-center justify-between">
                    <p className="text-body-md text-on-surface">{ex.exerciseName}</p>
                    <p className={`text-label-md ${done === ex.sets.length ? 'text-primary' : 'text-on-surface-variant'}`}>
                      {done}/{ex.sets.length} sets
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RPE */}
        <section className="mb-[48px]">
          <div className="flex items-center justify-between mb-[12px]">
            <h3 className="text-headline-md text-on-surface">Rate Your Effort</h3>
            <span className="material-symbols-outlined text-on-surface-variant">info</span>
          </div>
          <div className="flex justify-between gap-2">
            {RPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRpe(opt.value)}
                className={`flex-1 py-4 px-2 rounded-xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                  rpe === opt.value
                    ? 'border-primary bg-primary-fixed shadow-[0px_10px_30px_rgba(99,102,241,0.15)]'
                    : 'bg-surface border-outline-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className={`text-label-sm ${rpe === opt.value ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-4">
          <button
            onClick={finishWorkout}
            disabled={!rpe || saving}
            className="w-full bg-primary text-on-primary py-4 rounded-full text-label-md disabled:opacity-40 transition-transform active:scale-[0.98] shadow-[0px_10px_30px_rgba(99,102,241,0.2)]"
          >
            {saving ? 'Saving…' : 'Save & Finish'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-transparent text-on-surface-variant py-4 rounded-full text-label-md hover:bg-surface-container-highest transition-colors"
          >
            Discard Workout
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
