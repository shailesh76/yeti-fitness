# Workout Tracker

## Global Rest Timer
The `useTimerStore` Zustand hook handles the rest timer.
*   **Auto-start**: When a user taps the "completed" checkbox on a set, `completeSet` auto-starts the timer (e.g., 90s).
*   **Global visibility**: The timer floats in the header of the `workouts/session.tsx` screen.

## Progression Engine Integration
When all sets for a specific exercise are completed:
1.  The UI constructs an `ExercisePerformanceContext`.
2.  It calls `ProgressionEngine.evaluate()`.
3.  A dynamic suggestion card is appended to the `FlashList` for that exercise recommending the next weight/rep scheme.

## Personal Records (PR)
If `ProgressionEngine` suggests a weight increase (or if the user manually exceeds previous history), the UI triggers `setPrTriggered(true)`, firing a `react-native-reanimated` overlay animation and logging the `personal_records` entry in WatermelonDB.
