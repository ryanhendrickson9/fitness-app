import { WorkoutDay } from './types';

export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    id: 1,
    name: 'Day 1',
    focus: 'Lower Body',
    exercises: [
      { name: 'Goblet Squats', sets: 3, reps: 6, defaultWeight: 45 },
      { name: 'Single Leg Heel Raises', sets: 3, reps: 20, defaultWeight: 47.5 },
      { name: 'Single Leg Knee Extension', sets: 3, reps: 8, defaultWeight: null },
    ],
  },
  {
    id: 2,
    name: 'Day 2',
    focus: 'Upper & Stability',
    exercises: [
      { name: 'Bent Over Supported Rows', sets: 3, reps: 8, defaultWeight: 50 },
      { name: 'Single Leg Bridge Holds', sets: 3, reps: '30s', isTimeBased: true },
      { name: 'Quadruped / Standing Stop Signs', sets: 3, reps: 6, defaultWeight: 7.5 },
      { name: 'Step Ups', sets: 3, reps: 5, defaultWeight: null },
      { name: 'Quadruped Ys', sets: 3, reps: 8, defaultWeight: null },
    ],
  },
  {
    id: 3,
    name: 'Day 3',
    focus: 'Push & Shoulders',
    exercises: [
      { name: 'Flat Bench Press', sets: 3, reps: 6, defaultWeight: null },
      { name: 'Alternating Lateral Shoulder Raises', sets: 3, reps: 10, defaultWeight: null },
      { name: 'Internal Shoulder Rotations', sets: 3, reps: 8, defaultWeight: null },
      { name: 'Cable Flys', sets: 3, reps: 8, defaultWeight: null },
      { name: 'Single Arm Tricep Press', sets: 3, reps: 6, defaultWeight: null },
    ],
  },
  {
    id: 4,
    name: 'Day 4',
    focus: 'Pull & Arms',
    exercises: [
      { name: 'Pull Ups', sets: 3, reps: 8, isBodyweight: true },
      { name: 'Cable High Pulls', sets: 3, reps: 15, defaultWeight: 22.5 },
      { name: 'Alternating Incline Bicep Curls', sets: 3, reps: 8, defaultWeight: 25 },
    ],
  },
];
