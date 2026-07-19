import React from 'react';

export interface ValidationMetricsProps {
  metrics: {
    onboardingCompletionRate: number; // e.g. 80
    weeklyWorkoutsRate: number; // e.g. 70
    aiUsageRate: number; // e.g. 50
    nutritionLoggingRate: number; // e.g. 50
    syncSuccessRate: number; // e.g. 99
    crashRate: number; // e.g. 1
  };
}

export function ValidationMetrics({ metrics }: ValidationMetricsProps) {
  return (
    <div className="p-4 bg-white shadow rounded-lg mb-6">
      <h2 className="text-xl font-bold mb-4">Beta v1.0 Validation Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard label="Onboarding Completion" value={`${metrics.onboardingCompletionRate}%`} target="80%" />
        <MetricCard label="3+ Workouts/Week" value={`${metrics.weeklyWorkoutsRate}%`} target="70%" />
        <MetricCard label="Weekly AI Usage" value={`${metrics.aiUsageRate}%`} target="50%" />
        <MetricCard label="Weekly Nutrition" value={`${metrics.nutritionLoggingRate}%`} target="50%" />
        <MetricCard label="Sync Success" value={`${metrics.syncSuccessRate}%`} target=">95%" />
        <MetricCard label="Crash Rate" value={`${metrics.crashRate}%`} target="<2%" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, target }: { label: string; value: string; target: string }) {
  return (
    <div className="border p-4 rounded-lg flex flex-col">
      <span className="text-sm text-gray-500 mb-1">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-xs text-gray-400 mt-1">Target: {target}</span>
    </div>
  );
}
