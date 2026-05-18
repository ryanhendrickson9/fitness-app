'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WORKOUT_DAYS } from '@/lib/workout-data';
import { getLastSessionForDay, saveSession } from '@/lib/storage';
import { ExerciseLog, RPELevel, SetLog, WorkoutSession } from '@/lib/types';

type Phase = 'setup' | 'active' | 'complete';

const RPE_OPTIONS: { value: RPELevel; emoji: string; label: string; sublabel: string }[] = [
  { value: 'warmup',  emoji: '😊', label: 'Warmup',   sublabel: 'Barely any effort' },
  { value: 'rpe1-5',  emoji: '🙂', label: 'RPE 1–5',  sublabel: 'Could go all day' },
  { value: 'rpe6-7',  emoji: '😐', label: 'RPE 6–7',  sublabel: 'Breathing harder' },
  { value: 'rpe8-9',  emoji: '😥', label: 'RPE 8–9',  sublabel: 'A couple reps left' },
  { value: 'rpe10',   emoji: '🥵', label: 'RPE 10',   sublabel: 'Nothing left' },
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
  const [activeSet, setActiveSet] = useState(0);
  const [confirmNext, setConfirmNext] = useState(false);
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
    setActiveSet(0);
    setPhase('active');
  }

  function goToExercise(idx: number) {
    setActiveExercise(idx);
    setActiveSet(0);
    setConfirmNext(false);
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

  function setSetRpe(exIdx: number, si: number, rpeVal: RPELevel) {
    setLogs((prev) => prev.map((ex, ei) => ei !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => i !== si ? s : { ...s, rpe: rpeVal }),
    }));
  }

  function logSet(exIdx: number, si: number) {
    const totalSets = logs[exIdx]?.sets.length ?? 0;
    const isLastSet = si === totalSets - 1;
    setLogs((prev) => prev.map((ex, ei) => ei !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, i) => {
        if (i === si) return { ...s, completed: true };
        if (i === si + 1 && !s.completed) return { ...s, weight: ex.sets[si].weight ?? s.weight };
        return s;
      }),
    }));
    if (!isLastSet) {
      setActiveSet(si + 1);
    } else if (day && exIdx < day.exercises.length - 1) {
      goToExercise(exIdx + 1);
    } else {
      setPhase('complete');
    }
  }

  function tryNextExercise() {
    const allDoneForCurrent = logs[activeExercise]?.sets.every((s) => s.completed);
    if (!allDoneForCurrent) {
      setConfirmNext(true);
    } else {
      goToExercise(activeExercise + 1);
    }
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
                  : ex.defaultWeight != null ? Math.round(ex.defaultWeight * (1 + pct / 100) * 4) / 4
                  : null;
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

      </div>
    );
  }

  // ── ACTIVE ────────────────────────────────────────────────────
  if (phase === 'active') {
    const currentLog = logs[activeExercise];
    const currentEx = day.exercises[activeExercise];
    const totalSets = currentLog?.sets.length ?? 0;
    const currentSetData = currentLog?.sets[activeSet];
    const completedForEx = currentLog?.sets.filter((s) => s.completed).length ?? 0;

    return (
      <div className="bg-background text-on-background min-h-screen">
        {/* Top bar */}
        <header className="bg-surface border-b border-surface-container-highest flex flex-col w-full sticky top-0 z-50">
          <div className="flex justify-between items-center w-full px-[20px] h-16">
            <h1 className="text-label-md text-primary tracking-tight whitespace-nowrap">{day.focus}</h1>
            <button
              onClick={() => setPhase('complete')}
              className="text-label-md text-on-surface-variant border border-outline-variant px-4 py-1.5 rounded-full hover:bg-surface-container transition-colors"
            >
              Finish
            </button>
          </div>
          <div className="px-[20px] pb-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">Workout Progress</span>
              <span className="text-label-md text-primary">{activeExercise + 1} of {day.exercises.length} Exercises</span>
            </div>
            <div className="h-2 w-full bg-primary-fixed rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </header>

        <main className="max-w-[640px] mx-auto px-[20px] py-6 flex flex-col gap-6 pb-12">
          {/* Exercise tabs + next arrow */}
          <div className="flex items-center gap-3 -mx-[20px] px-[20px]">
            <nav className="flex gap-3 overflow-x-auto scrollbar-hide py-1">
              {day.exercises.map((ex, i) => {
                const done = logs[i]?.sets.every((s) => s.completed);
                return (
                  <button
                    key={i}
                    onClick={() => goToExercise(i)}
                    className={`w-9 h-9 rounded-full border text-label-md flex-shrink-0 flex items-center justify-center active:scale-95 transition-all ${
                      i === activeExercise
                        ? 'border-primary bg-primary text-on-primary'
                        : done
                        ? 'border-primary/40 bg-primary-fixed text-primary'
                        : 'border-outline-variant bg-surface text-on-surface-variant'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </nav>
            {activeExercise < day.exercises.length - 1 && (
              <button
                onClick={tryNextExercise}
                className="flex items-center gap-0.5 text-label-sm text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 ml-1"
              >
                Next
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            )}
          </div>

          {currentLog && (
            <>
              {/* Exercise name + set dots */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-1">{currentEx.name}</p>
                  <p className="text-headline-md text-on-surface">Set {activeSet + 1} <span className="text-on-surface-variant font-normal">of {totalSets}</span></p>
                </div>
                <div className="flex gap-2">
                  {currentLog.sets.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSet(i)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                        i === activeSet
                          ? 'border-primary bg-primary'
                          : s.completed
                          ? 'border-primary/40 bg-primary-fixed'
                          : 'border-outline-variant bg-surface'
                      }`}
                    >
                      {s.completed && i !== activeSet && (
                        <span className="material-symbols-outlined text-[14px] text-primary icon-filled">check</span>
                      )}
                      {i === activeSet && <span className="text-label-sm text-on-primary font-bold">{i + 1}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight + Reps inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container text-center" style={{ boxShadow: '0px 10px 30px rgba(99,102,241,0.05)' }}>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">
                    {currentEx.isTimeBased ? 'Duration' : 'Weight'}
                  </p>
                  {currentEx.isBodyweight ? (
                    <p className="text-display-lg text-on-surface">BW</p>
                  ) : (
                    <input
                      type="number"
                      value={currentSetData?.weight ?? ''}
                      placeholder="0"
                      onChange={(e) => updateSet(activeExercise, activeSet, 'weight', e.target.value)}
                      className="text-display-lg text-primary bg-transparent border-none p-0 focus:ring-0 w-full outline-none text-center"
                    />
                  )}
                  {!currentEx.isBodyweight && !currentEx.isTimeBased && (
                    <p className="text-label-sm text-on-surface-variant mt-1">lbs</p>
                  )}
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container text-center" style={{ boxShadow: '0px 10px 30px rgba(99,102,241,0.05)' }}>
                  <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">Reps</p>
                  {currentEx.isTimeBased ? (
                    <p className="text-display-lg text-on-surface-variant">—</p>
                  ) : (
                    <input
                      type={typeof currentSetData?.reps === 'number' ? 'number' : 'text'}
                      value={currentSetData ? String(currentSetData.reps) : ''}
                      onChange={(e) => updateSet(activeExercise, activeSet, 'reps', e.target.value)}
                      className="text-display-lg text-on-surface bg-transparent border-none p-0 focus:ring-0 w-full outline-none text-center"
                    />
                  )}
                </div>
              </div>

              {/* RPE per set */}
              <div>
                <p className="text-label-sm text-on-surface-variant uppercase tracking-widest mb-3">Rate This Set</p>
                <div className="flex gap-2">
                  {RPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSetRpe(activeExercise, activeSet, opt.value)}
                      className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        currentSetData?.rpe === opt.value
                          ? 'border-primary bg-primary-fixed'
                          : 'border-outline-variant bg-surface hover:bg-surface-container-high'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className={`text-[10px] font-semibold tracking-wide ${currentSetData?.rpe === opt.value ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Set button */}
              <button
                onClick={() => logSet(activeExercise, activeSet)}
                disabled={currentSetData?.completed}
                className="w-full bg-primary text-on-primary py-5 rounded-xl text-label-md active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-40"
              >
                {currentSetData?.completed
                  ? 'Set Logged ✓'
                  : activeSet < totalSets - 1
                  ? `Log Set ${activeSet + 1} → Set ${activeSet + 2}`
                  : activeExercise < day.exercises.length - 1
                  ? 'Log Final Set & Next Exercise →'
                  : 'Log Final Set & Finish'}
              </button>

              {completedForEx > 0 && (
                <p className="text-center text-label-sm text-on-surface-variant">
                  {completedForEx}/{totalSets} sets logged for this exercise
                </p>
              )}
            </>
          )}
        </main>

        {/* Are you sure modal */}
        {confirmNext && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
            <div className="bg-surface w-full rounded-t-[32px] px-[20px] pt-6 pb-10">
              <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-6" />
              <h3 className="text-headline-md text-on-surface mb-2">Not all sets done</h3>
              <p className="text-body-md text-on-surface-variant mb-8">
                You have {totalSets - completedForEx} set{totalSets - completedForEx !== 1 ? 's' : ''} remaining for {currentEx.name}. Move on anyway?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => goToExercise(activeExercise + 1)}
                  className="w-full py-4 bg-primary text-on-primary rounded-xl text-label-md active:scale-95 transition-transform"
                >
                  Move On
                </button>
                <button
                  onClick={() => setConfirmNext(false)}
                  className="w-full py-4 text-on-surface-variant text-label-md hover:bg-surface-container rounded-xl transition-colors"
                >
                  Keep Going
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-background min-h-screen pb-32">
      <header className="bg-surface border-b border-surface-container-highest fixed top-0 left-0 w-full z-50 h-16 flex justify-between items-center px-[20px]">
        <span className="text-headline-md text-primary tracking-tight">Percy</span>
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

    </div>
  );
}
