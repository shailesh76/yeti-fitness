import React from 'react';
import { BrainCircuit, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AthleteIntelProps {
  athleteName: string;
  status: 'Progressing' | 'Monitor' | 'Intervention Required';
  strengthLevel: string;
  weeklySummary: string;
  adjustments: string[];
}

export function AthleteIntelligencePanel({ 
  athleteName, 
  status, 
  strengthLevel, 
  weeklySummary,
  adjustments
}: AthleteIntelProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Progressing': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Monitor': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Intervention Required': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Progressing': return <CheckCircle2 size={16} />;
      case 'Monitor': return <Info size={16} />;
      case 'Intervention Required': return <AlertCircle size={16} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BrainCircuit className="text-blue-500" size={24} />
          <h2 className="text-xl font-bold text-white">Yeti Intelligence Loop</h2>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
          {status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Athlete Profile</h3>
          <p className="text-white font-medium">{athleteName} • {strengthLevel}</p>
        </div>

        {/* Adjustments */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">AI Adjustments</h3>
          <ul className="space-y-2">
            {adjustments.map((adj, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-blue-500" />
                {adj}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Weekly Review */}
      <div className="mt-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
        <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Latest Weekly Review</h3>
        <p className="text-gray-300 text-sm whitespace-pre-line">{weeklySummary}</p>
      </div>
    </div>
  );
}
