# Yeti Score System

The Yeti Score is a comprehensive, rolling metric (defaults to 7-day, supports 30/90 days) indicating overall fitness and health adherence.

## Calculation Formula

The score is a weighted average of 5 core pillars:
1.  **Workout Consistency (30%)**: Adherence to the planned training days. (e.g., 4/5 workouts = 80%).
2.  **Nutrition Adherence (25%)**: Proximity to daily macro targets.
3.  **Sleep (20%)**: Sourced from HealthKit / Android Health (average sleep score or duration vs target).
4.  **Recovery (15%)**: Subjective logs or HRV data.
5.  **Habits (10%)**: Completion rate of daily habits (e.g., stretching, water intake).

## Example
*   Workout: 100% -> 30 pts
*   Nutrition: 85% -> 21.25 pts
*   Sleep: 90% -> 18 pts
*   Recovery: 80% -> 12 pts
*   Habits: 100% -> 10 pts
*   **Final Yeti Score: 91.25 / 100**
