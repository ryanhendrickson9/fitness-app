import { supabase } from './supabase';
import { ExerciseLog, WorkoutSession } from './types';
import { WORKOUT_DAYS } from './workout-data';

export async function getLastSessionForDay(dayId: number): Promise<WorkoutSession | null> {
  const day = WORKOUT_DAYS.find((d) => d.id === dayId);
  if (!day) return null;

  const { data: workout, error } = await supabase
    .from('fitness_workouts')
    .select('*')
    .eq('day_id', dayId)
    .eq('completed', true)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !workout) return null;

  const { data: exercises } = await supabase
    .from('fitness_exercises')
    .select('*')
    .eq('workout_id', workout.id)
    .order('created_at', { ascending: true });

  // Group exercise rows into ExerciseLog[]
  const exerciseMap = new Map<string, ExerciseLog>();
  for (const ex of exercises ?? []) {
    if (!exerciseMap.has(ex.exercise_name)) {
      exerciseMap.set(ex.exercise_name, { exerciseName: ex.exercise_name, sets: [] });
    }
    exerciseMap.get(ex.exercise_name)!.sets.push({
      weight: ex.weight_lbs ?? null,
      reps: ex.reps ?? '',
      completed: true,
    });
  }

  // Preserve PT day order
  const exerciseLogs: ExerciseLog[] = day.exercises.map((ex) =>
    exerciseMap.get(ex.name) ?? { exerciseName: ex.name, sets: [] }
  );

  return {
    dayId: workout.day_id,
    date: workout.date,
    weightIncreasePct: workout.weight_increase_pct ?? 5,
    exercises: exerciseLogs,
    rpe: workout.rpe ?? undefined,
    completed: workout.completed,
  };
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  const day = WORKOUT_DAYS.find((d) => d.id === session.dayId);
  const name = day ? `${day.name} — ${day.focus}` : `Day ${session.dayId}`;

  const { data: workout, error } = await supabase
    .from('fitness_workouts')
    .insert({
      date: session.date,
      name,
      day_id: session.dayId,
      weight_increase_pct: session.weightIncreasePct,
      rpe: session.rpe ?? null,
      completed: session.completed,
      notes: null,
    })
    .select('id')
    .single();

  if (error || !workout) {
    console.error('Failed to save workout:', error);
    return;
  }

  const exerciseRows = session.exercises.flatMap((ex) =>
    ex.sets.map((set, i) => ({
      workout_id: workout.id,
      exercise_name: ex.exerciseName,
      set_number: i + 1,
      weight_lbs: typeof set.weight === 'number' ? set.weight : null,
      reps: typeof set.reps === 'number' ? set.reps : null,
      exercise_type: 'strength',
    }))
  );

  if (exerciseRows.length > 0) {
    const { error: exError } = await supabase.from('fitness_exercises').insert(exerciseRows);
    if (exError) console.error('Failed to save exercises:', exError);
  }
}
