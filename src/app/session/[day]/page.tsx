'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WORKOUT_DAYS } from '@/lib/workout-data';
import { getLastSessionForDay, saveSession } from '@/lib/storage';
import { ExerciseLog, RPELevel, SetLog, WorkoutSession } from '@/lib/types';

type Phase = 'setup' | 'active' | 'complete';

const RPE_OPTIONS: { value: RPELevel; label: string; sublabel: string; color: string; bg: string }[] = [
  { value: 'warmup', label: 'Easy / Warm-Up', sublabel: 'Barely any effort', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { value: 'rpe1-5', label: 'RPE 1–5', sublabel: 'Light, could go all day', color: '#84cc16', bg: 'rgba(132,204,22,0.12)' },
  { value: 'rpe6-7', label: 'RPE 6–7', sublabel: 'Moderate, breathing harder', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { value: 'rpe8-9', label: 'RPE 8–9', sublabel: 'Hard, a couple reps left', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 'rpe10', label: 'RPE 10', sublabel: 'Max effort, nothing left', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

function buildInitialLogs(
  dayId: number,
  pct: number,
  lastSession: WorkoutSession | null
): ExerciseLog[] {
  const day = WORKOUT_DAYS.find((d) => d.id === dayId)!;

  return day.exercises.map((ex) => {
    const lastExercise = lastSession?.exercises.find((e) => e.exerciseName === ex.name);

    const sets: SetLog[] = Array.from({ length: ex.sets }, (_, i) => {
      const lastSet = lastExercise?.sets[i];
      let suggestedWeight: number | null = null;

      if (ex.isBodyweight) {
        suggestedWeight = null;
      } else if (lastSet?.weight != null) {
        suggestedWeight = Math.round((lastSet.weight * (1 + pct / 100)) * 4) / 4;
      } else if (ex.defaultWeight != null) {
        suggestedWeight = ex.defaultWeight;
      }

      const suggestedReps = lastSet?.reps ?? ex.reps;

      return {
        weight: suggestedWeight,
        reps: suggestedReps,
        completed: false,
      };
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
    if (day) {
      getLastSessionForDay(dayId).then(setLastSession);
    }
  }, [dayId, day]);

  if (!day) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#080808' }}>
        <p className="text-white">Day not found.</p>
      </div>
    );
  }

  const completedSets = logs.flatMap((l) => l.sets).filter((s) => s.completed).length;
  const totalSets = logs.flatMap((l) => l.sets).length;
  const progress = totalSets > 0 ? completedSets / totalSets : 0;

  function startWorkout() {
    const initial = buildInitialLogs(dayId, pct, lastSession);
    setLogs(initial);
    setActiveExercise(0);
    setPhase('active');
  }

  function updateSet(exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) {
    setLogs((prev) => {
      const next = prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) => {
            if (si !== setIdx) return s;
            if (field === 'weight') return { ...s, weight: value === '' ? null : parseFloat(value) };
            return { ...s, reps: value === '' ? '' : isNaN(Number(value)) ? value : Number(value) };
          }),
        };
      });
      return next;
    });
  }

  function toggleSet(exIdx: number, setIdx: number) {
    setLogs((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) =>
            si === setIdx ? { ...s, completed: !s.completed } : s
          ),
        };
      })
    );
  }

  async function finishWorkout() {
    if (!rpe || saving) return;
    setSaving(true);
    const session: WorkoutSession = {
      dayId,
      date: new Date().toISOString().split('T')[0],
      weightIncreasePct: pct,
      exercises: logs,
      rpe,
      completed: true,
    };
    await saveSession(session);
    router.push('/');
  }

  const allSetsComplete = logs.length > 0 && logs.every((ex) => ex.sets.every((s) => s.completed));

  // ── SETUP PHASE ──────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#080808' }}>
        <div className="max-w-lg mx-auto px-4 py-10">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm mb-8 transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#ffffff')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#6b7280')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#f97316' }}>
            {day.name}
          </p>
          <h1 className="text-3xl font-bold text-white mb-1">{day.focus}</h1>
          {lastSession && (
            <p className="text-sm mb-8" style={{ color: '#6b7280' }}>
              Last session:{' '}
              {new Date(lastSession.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
            </p>
          )}
          {!lastSession && <div className="mb-8" />}

          {/* Weight increase slider */}
          <div
            className="rounded-2xl p-6 mb-4"
            style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f' }}
          >
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-medium text-white">Weight Increase</p>
              <div
                className="text-2xl font-bold tabular-nums"
                style={{ color: '#f97316' }}
              >
                +{pct}%
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={pct}
              onChange={(e) => setPct(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs" style={{ color: '#4b5563' }}>
              <span>0%</span>
              <span>10%</span>
              <span>20%</span>
            </div>
            {!lastSession && (
              <p className="mt-3 text-xs" style={{ color: '#6b7280' }}>
                No previous session — using program defaults where available.
              </p>
            )}
          </div>

          {/* Exercise preview */}
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>
              Today&apos;s Exercises
            </p>
            <div className="flex flex-col gap-3">
              {day.exercises.map((ex, i) => {
                const lastEx = lastSession?.exercises.find((e) => e.exerciseName === ex.name);
                const lastWeight = lastEx?.sets[0]?.weight;
                const suggestedWeight =
                  ex.isBodyweight
                    ? null
                    : lastWeight != null
                    ? Math.round(lastWeight * (1 + pct / 100) * 4) / 4
                    : ex.defaultWeight;

                return (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{ex.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                        {ex.sets} sets × {ex.reps}{typeof ex.reps === 'string' ? '' : ' reps'}
                      </p>
                    </div>
                    <div className="text-right">
                      {ex.isBodyweight ? (
                        <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: '#1f1f1f', color: '#9ca3af' }}>
                          Bodyweight
                        </span>
                      ) : suggestedWeight != null ? (
                        <span className="text-sm font-semibold" style={{ color: '#f97316' }}>
                          {suggestedWeight}lbs
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#4b5563' }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={startWorkout}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            Start Workout
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE PHASE ─────────────────────────────────────────────
  if (phase === 'active') {
    const currentEx = day.exercises[activeExercise];
    const currentLog = logs[activeExercise];

    return (
      <div className="min-h-screen pb-32" style={{ backgroundColor: '#080808' }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 px-4 pt-10 pb-4"
          style={{ backgroundColor: '#080808', borderBottom: '1px solid #111111' }}
        >
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#f97316' }}>
                  {day.name} · {day.focus}
                </p>
                <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
                  {completedSets} / {totalSets} sets done
                </p>
              </div>
              <button
                onClick={() => setPhase('complete')}
                className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
                style={{ backgroundColor: '#1f1f1f', color: '#9ca3af' }}
              >
                Finish
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1f1f1f' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%`, backgroundColor: '#f97316' }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-6">
          {/* Exercise tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {day.exercises.map((ex, i) => {
              const exLog = logs[i];
              const allDone = exLog?.sets.every((s) => s.completed);
              const someDone = exLog?.sets.some((s) => s.completed);
              return (
                <button
                  key={i}
                  onClick={() => setActiveExercise(i)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor:
                      i === activeExercise
                        ? '#f97316'
                        : allDone
                        ? 'rgba(34,197,94,0.15)'
                        : someDone
                        ? 'rgba(249,115,22,0.12)'
                        : '#1a1a1a',
                    color:
                      i === activeExercise
                        ? '#ffffff'
                        : allDone
                        ? '#22c55e'
                        : someDone
                        ? '#f97316'
                        : '#6b7280',
                    border: i === activeExercise ? 'none' : '1px solid #2a2a2a',
                  }}
                >
                  {i + 1}. {ex.name.split(' ').slice(0, 2).join(' ')}
                </button>
              );
            })}
          </div>

          {/* Exercise card */}
          <div
            className="rounded-2xl overflow-hidden mb-4"
            style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f' }}
          >
            {/* Exercise header */}
            <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#f97316' }}>
                    Exercise {activeExercise + 1} of {day.exercises.length}
                  </p>
                  <h2 className="text-xl font-bold text-white leading-tight">{currentEx.name}</h2>
                  <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                    {currentEx.sets} sets × {currentEx.reps}
                    {typeof currentEx.reps === 'number' ? ' reps' : ''}
                    {currentEx.isTimeBased ? ' hold' : ''}
                    {currentEx.isBodyweight ? ' · Bodyweight' : currentEx.defaultWeight ? ` · ~${currentEx.defaultWeight}lbs` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Sets */}
            <div className="px-5 py-4 flex flex-col gap-3">
              {/* Column headers */}
              <div className="grid gap-3" style={{ gridTemplateColumns: '28px 1fr 1fr 40px' }}>
                <div />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>
                  {currentEx.isTimeBased ? 'Duration' : 'Weight (lbs)'}
                </p>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>
                  {currentEx.isTimeBased ? 'Side' : 'Reps'}
                </p>
                <div />
              </div>

              {currentLog.sets.map((set, si) => (
                <div
                  key={si}
                  className="grid gap-3 items-center transition-all"
                  style={{ gridTemplateColumns: '28px 1fr 1fr 40px' }}
                >
                  {/* Set number */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: set.completed ? 'rgba(34,197,94,0.15)' : '#1a1a1a',
                      color: set.completed ? '#22c55e' : '#6b7280',
                    }}
                  >
                    {si + 1}
                  </div>

                  {/* Weight input */}
                  {currentEx.isBodyweight ? (
                    <div
                      className="h-11 rounded-xl flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#1a1a1a', color: '#4b5563' }}
                    >
                      BW
                    </div>
                  ) : currentEx.isTimeBased ? (
                    <input
                      type="text"
                      value={String(set.reps)}
                      onChange={(e) => updateSet(activeExercise, si, 'reps', e.target.value)}
                      className="h-11 rounded-xl text-center text-sm font-semibold text-white outline-none transition-all"
                      style={{
                        backgroundColor: set.completed ? 'rgba(34,197,94,0.1)' : '#1a1a1a',
                        border: `1px solid ${set.completed ? 'rgba(34,197,94,0.3)' : '#2a2a2a'}`,
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      value={set.weight ?? ''}
                      onChange={(e) => updateSet(activeExercise, si, 'weight', e.target.value)}
                      placeholder="—"
                      className="h-11 rounded-xl text-center text-sm font-semibold text-white outline-none transition-all"
                      style={{
                        backgroundColor: set.completed ? 'rgba(34,197,94,0.1)' : '#1a1a1a',
                        border: `1px solid ${set.completed ? 'rgba(34,197,94,0.3)' : '#2a2a2a'}`,
                      }}
                    />
                  )}

                  {/* Reps input */}
                  {currentEx.isTimeBased ? (
                    <div
                      className="h-11 rounded-xl flex items-center justify-center text-sm"
                      style={{ backgroundColor: '#1a1a1a', color: '#4b5563' }}
                    >
                      —
                    </div>
                  ) : (
                    <input
                      type={typeof set.reps === 'number' ? 'number' : 'text'}
                      value={String(set.reps)}
                      onChange={(e) => updateSet(activeExercise, si, 'reps', e.target.value)}
                      className="h-11 rounded-xl text-center text-sm font-semibold text-white outline-none transition-all"
                      style={{
                        backgroundColor: set.completed ? 'rgba(34,197,94,0.1)' : '#1a1a1a',
                        border: `1px solid ${set.completed ? 'rgba(34,197,94,0.3)' : '#2a2a2a'}`,
                      }}
                    />
                  )}

                  {/* Complete toggle */}
                  <button
                    onClick={() => toggleSet(activeExercise, si)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90"
                    style={{
                      backgroundColor: set.completed ? 'rgba(34,197,94,0.15)' : '#1a1a1a',
                      border: `1px solid ${set.completed ? 'rgba(34,197,94,0.4)' : '#2a2a2a'}`,
                    }}
                  >
                    {set.completed ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5L13 4.5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3a3a3a' }} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-3">
            {activeExercise > 0 && (
              <button
                onClick={() => setActiveExercise((p) => p - 1)}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: '#1a1a1a', color: '#9ca3af', border: '1px solid #2a2a2a' }}
              >
                ← Previous
              </button>
            )}
            {activeExercise < day.exercises.length - 1 ? (
              <button
                onClick={() => setActiveExercise((p) => p + 1)}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ backgroundColor: '#f97316' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setPhase('complete')}
                className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: allSetsComplete
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'linear-gradient(135deg, #f97316, #ea580c)',
                }}
              >
                {allSetsComplete ? 'Complete Workout ✓' : 'Finish Up →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETE PHASE ────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#080808' }}>
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Back to workout */}
        <button
          onClick={() => setPhase('active')}
          className="flex items-center gap-2 text-sm mb-8"
          style={{ color: '#6b7280' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to workout
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14l6 6L23 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Nicely Done</h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            {completedSets} of {totalSets} sets completed
          </p>
        </div>

        {/* Session summary */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>
            Summary
          </p>
          <div className="flex flex-col gap-2">
            {logs.map((ex, i) => {
              const completed = ex.sets.filter((s) => s.completed).length;
              return (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-sm text-white">{ex.exerciseName}</p>
                  <p className="text-sm" style={{ color: completed === ex.sets.length ? '#22c55e' : '#f97316' }}>
                    {completed}/{ex.sets.length} sets
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* RPE selector */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: '#111111', border: '1px solid #1f1f1f' }}
        >
          <p className="text-sm font-semibold text-white mb-1">How hard was that?</p>
          <p className="text-xs mb-4" style={{ color: '#6b7280' }}>Rate your overall session effort</p>
          <div className="flex flex-col gap-2">
            {RPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRpe(opt.value)}
                className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: rpe === opt.value ? opt.bg : '#1a1a1a',
                  border: `1px solid ${rpe === opt.value ? opt.color + '50' : '#2a2a2a'}`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
                <div>
                  <p className="text-sm font-semibold" style={{ color: rpe === opt.value ? opt.color : '#ffffff' }}>
                    {opt.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {opt.sublabel}
                  </p>
                </div>
                {rpe === opt.value && (
                  <svg className="ml-auto" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke={opt.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={finishWorkout}
          disabled={!rpe || saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all disabled:opacity-40"
          style={{
            background: rpe && !saving ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#1a1a1a',
          }}
        >
          {saving ? 'Saving…' : 'Save & Finish'}
        </button>
      </div>
    </div>
  );
}
