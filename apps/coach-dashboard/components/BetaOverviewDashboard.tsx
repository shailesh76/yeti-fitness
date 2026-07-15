import React from 'react';
import { Users, Activity, Brain, ServerCrash, LayoutDashboard, Settings } from 'lucide-react';

export function BetaOverviewDashboard() {
  return (
    <div className="p-6 bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">Beta Operations Center v1.0</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Beta Success Metrics (Activation & Retention) */}
        <div className="bg-gray-900 p-5 rounded-xl border border-blue-900/50">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <Activity size={20} />
            <h3 className="font-bold">Beta Success & Activation</h3>
          </div>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex justify-between"><span className="text-gray-500">Onboarding Complete</span> <span className="font-bold text-green-400">85% (Target: 80%)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Workout within 48h</span> <span className="font-bold text-green-400">75% (Target: 70%)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Week 4 Retention</span> <span className="font-bold text-white">65% (Target: 60%)</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-800">
              <span className="text-gray-500">Coaching Time/Athlete</span> <span className="font-bold text-amber-400">12m (Down from 30m)</span>
            </div>
          </div>
        </div>

        {/* AI Recommendation Analytics */}
        <div className="bg-gray-900 p-5 rounded-xl border border-purple-900/50">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <Brain size={20} />
            <h3 className="font-bold">AI Coach Utility</h3>
          </div>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex justify-between"><span className="text-gray-500">Generated</span> <span className="font-bold text-white">100</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Approved by Coach</span> <span className="font-bold text-green-400">75 (75%)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Modified by Coach</span> <span className="font-bold text-amber-400">20 (20%)</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Rejected by Coach</span> <span className="font-bold text-red-400">5 (5%)</span></div>
          </div>
        </div>

        {/* Feature Usage (For Monetization Pre-planning) */}
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-4 text-gray-300">
            <LayoutDashboard size={20} />
            <h3 className="font-bold">Feature Usage (Top 5)</h3>
          </div>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex justify-between"><span className="text-gray-500">Workout Builder</span> <span className="font-bold text-white">92%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Exercise Swap</span> <span className="font-bold text-white">68%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">AI Chat</span> <span className="font-bold text-white">55%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Meal Logger</span> <span className="font-bold text-white">52%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Check-in</span> <span className="font-bold text-white">45%</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
