import React from 'react';
import { TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';

interface ExerciseProgression {
  id: string;
  name: string;
  currentWeight: number;
  trend: 'improving' | 'plateau' | 'deload';
}

export function ProgressionPanel({ exercises }: { exercises: ExerciseProgression[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">Athlete Progression</h2>
      
      <div className="space-y-4">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700">
            <div>
              <h4 className="font-bold text-white">{exercise.name}</h4>
              <p className="text-sm text-gray-400">{exercise.currentWeight}kg</p>
            </div>
            
            <div className="flex items-center gap-2">
              {exercise.trend === 'improving' && (
                <span className="flex items-center gap-1 text-green-400 text-sm font-bold bg-green-400/10 px-3 py-1 rounded-full">
                  <TrendingUp size={16} /> Improving
                </span>
              )}
              {exercise.trend === 'plateau' && (
                <span className="flex items-center gap-1 text-amber-400 text-sm font-bold bg-amber-400/10 px-3 py-1 rounded-full">
                  <AlertTriangle size={16} /> Plateau
                </span>
              )}
              {exercise.trend === 'deload' && (
                <span className="flex items-center gap-1 text-blue-400 text-sm font-bold bg-blue-400/10 px-3 py-1 rounded-full">
                  <ArrowRight size={16} /> Deload Rec.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
