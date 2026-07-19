import React from 'react';

export interface AthleteAlert {
  id: string;
  athleteName: string;
  type: 'Inactive' | 'Plateau' | 'MissedNutrition' | 'NewPR';
  details: string;
}

export function DailyCoachInbox({ alerts }: { alerts: AthleteAlert[] }) {
  return (
    <div className="p-4 bg-white shadow rounded-lg mb-6">
      <h2 className="text-xl font-bold mb-4">Daily Coach Inbox</h2>
      {alerts.length === 0 ? (
        <p className="text-gray-500">No athletes need immediate attention.</p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert) => (
            <li key={alert.id} className="p-3 border-l-4 border-blue-500 bg-gray-50 rounded shadow-sm flex flex-col">
              <span className="font-semibold">{alert.athleteName} <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded ml-2">{alert.type}</span></span>
              <span className="text-sm text-gray-700 mt-1">{alert.details}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
