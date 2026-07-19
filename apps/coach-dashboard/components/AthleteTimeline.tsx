import React from 'react';

export interface TimelineEvent {
  id: string;
  type: 'Workout' | 'Nutrition' | 'PR' | 'AI_Recommendation' | 'CoachAction';
  timestamp: string;
  description: string;
}

export function AthleteTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">Athlete Timeline</h2>
      <div className="relative border-l border-gray-200 ml-3 space-y-6">
        {events.map((event) => (
          <div key={event.id} className="pl-6 relative">
            <div className="w-3 h-3 bg-blue-500 rounded-full absolute -left-1.5 top-1.5"></div>
            <div className="text-xs text-gray-400 mb-1">{new Date(event.timestamp).toLocaleString()}</div>
            <div className="font-semibold text-sm mb-1">{event.type.replace('_', ' ')}</div>
            <div className="text-sm text-gray-700">{event.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
