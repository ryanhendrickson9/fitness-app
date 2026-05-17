export interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  defaultWeight?: number | null;
  isBodyweight?: boolean;
  isTimeBased?: boolean;
}

export interface WorkoutDay {
  id: number;
  name: string;
  focus: string;
  exercises: Exercise[];
}

export interface SetLog {
  weight: number | null;
  reps: number | string;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseName: string;
  sets: SetLog[];
}

export type RPELevel = 'warmup' | 'rpe1-5' | 'rpe6-7' | 'rpe8-9' | 'rpe10';

export interface WorkoutSession {
  dayId: number;
  date: string;
  weightIncreasePct: number;
  exercises: ExerciseLog[];
  rpe?: RPELevel;
  completed: boolean;
}
