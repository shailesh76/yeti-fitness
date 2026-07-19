# Training Engine Architecture

## Overview
The `@yeti/training-engine` is a pure TypeScript package that dictates workout generation and progressive overload logic. It operates entirely independently of any UI or Database concerns.

## Hierarchy
*   **Program**: Top level structure (e.g., "12-Week Hypertrophy").
*   **Program Phase**: Sub-blocks focusing on specific adaptations (e.g., "Volume Phase").
*   **Program Week**: Weekly cycle of training days.
*   **Training Day**: Specific day mapping (e.g., "Push Day").
*   **Workout**: The actual session container.
*   **Exercise**: Movements within the workout.
*   **Set**: Reps, weight, and tracking attributes (`isWarmup`, `isDropSet`, `RPE`).

## Progression Engine
The `ProgressionEngine` takes an `ExercisePerformanceContext` (historical performance) and returns a `ProgressionRecommendation`.
*   **Input**: Weight, reps, RPE, volume, fatigue.
*   **Rules**:
    *   Target Reps achieved + RPE <= 8 -> `INCREASE_WEIGHT` (+2.5kg).
    *   RPE >= 9.5 or Low Recovery -> `DELOAD` (-10% weight).
    *   Otherwise -> `MAINTAIN` weight and attempt more reps.
