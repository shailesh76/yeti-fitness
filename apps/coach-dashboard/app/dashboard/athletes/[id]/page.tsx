'use client';
import React, { useState } from 'react';
import { User, Activity, Dumbbell, Apple, Brain, TrendingUp } from 'lucide-react';

export default function AthleteDetailView({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'training':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Training History</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 font-bold mb-4">Bench Press Progression (Last 3 Months)</h3>
              <div className="h-40 flex items-end gap-4 text-xs text-gray-500">
                {/* Mock Graph */}
                <div className="w-16 bg-blue-900 h-24 rounded-t flex items-end justify-center pb-2 text-blue-200">60kg</div>
                <div className="w-16 bg-blue-700 h-32 rounded-t flex items-end justify-center pb-2 text-blue-100">70kg</div>
                <div className="w-16 bg-blue-500 h-40 rounded-t flex items-end justify-center pb-2 text-white font-bold">80kg</div>
              </div>
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">AI Interventions</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="mb-4">
                <h3 className="text-red-400 font-bold">⚠ Plateau Detected</h3>
                <p className="text-sm text-gray-400 mt-1">Bench Press stalled 4 weeks. High fatigue indicated.</p>
              </div>
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
                <h4 className="text-gray-300 font-bold text-sm mb-3">AI Suggestions (Awaiting Coach Approval)</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400"><input type="radio" name="sol" /> Option 1: Deload volume by 40%</label>
                  <label className="flex items-center gap-2 text-sm text-gray-400"><input type="radio" name="sol" /> Option 2: Increase caloric surplus</label>
                  <label className="flex items-center gap-2 text-sm text-gray-400"><input type="radio" name="sol" /> Option 3: Swap to Dumbbell Press</label>
                </div>
                <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Approve Selected</button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-bold mb-2 uppercase">Yeti Score</h3>
              <p className="text-4xl font-black text-blue-400">82</p>
              <p className="text-sm text-green-400 mt-2 flex items-center gap-1"><TrendingUp size={14}/> +4 from last week</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-gray-400 text-sm font-bold mb-2 uppercase">Current Program</h3>
              <p className="text-xl font-bold text-white">Push Pull Legs V2</p>
              <p className="text-sm text-gray-400 mt-2">Week 4 of 8 • 🟢 On Track</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-900">
          <User size={32} className="text-gray-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">John Doe</h1>
          <p className="text-gray-400">Goal: Hypertrophy • Bodyweight: 82kg</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mb-8 border-b border-gray-800 pb-px">
        {[
          { id: 'overview', icon: Activity, label: 'Overview' },
          { id: 'training', icon: Dumbbell, label: 'Training' },
          { id: 'nutrition', icon: Apple, label: 'Nutrition' },
          { id: 'ai', icon: Brain, label: 'AI Insights' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderTabContent()}
    </div>
  );
}
