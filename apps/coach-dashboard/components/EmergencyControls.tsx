'use client';
import React, { useState } from 'react';
import { AlertOctagon, Power, ShieldAlert, Activity } from 'lucide-react';

export function EmergencyControls() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [betaEnabled, setBetaEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const toggleSetting = (setting: string, currentVal: boolean, setter: any) => {
    // In production, this would fire an API call to Supabase system_settings
    // and simultaneously log to `admin_actions`.
    console.warn(`[ADMIN ACTION] Toggled ${setting} to ${!currentVal}`);
    setter(!currentVal);
  };

  return (
    <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <AlertOctagon className="text-red-500" size={24} />
        <h2 className="text-xl font-bold text-white">Emergency System Controls</h2>
      </div>

      <div className="space-y-4">
        {/* Global AI Kill Switch */}
        <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl border border-gray-800">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2"><Power size={16} className={aiEnabled ? 'text-green-500' : 'text-red-500'}/> Global AI Engine</h3>
            <p className="text-sm text-gray-400">Instantly blocks all @yeti/ai requests if hallucinations occur.</p>
          </div>
          <button 
            onClick={() => toggleSetting('ai_enabled', aiEnabled, setAiEnabled)}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${aiEnabled ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-black'}`}
          >
            {aiEnabled ? 'Disable AI' : 'Enable AI'}
          </button>
        </div>

        {/* Beta Mode Switch */}
        <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl border border-gray-800">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2"><ShieldAlert size={16} className={betaEnabled ? 'text-green-500' : 'text-red-500'}/> Beta Program Access</h3>
            <p className="text-sm text-gray-400">Lock out all non-admin users if a critical data bug is found.</p>
          </div>
          <button 
            onClick={() => toggleSetting('beta_enabled', betaEnabled, setBetaEnabled)}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${betaEnabled ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-black'}`}
          >
            {betaEnabled ? 'Suspend Beta' : 'Resume Beta'}
          </button>
        </div>

        {/* Maintenance Mode */}
        <div className="flex items-center justify-between p-4 bg-gray-950 rounded-xl border border-gray-800">
          <div>
            <h3 className="text-white font-bold flex items-center gap-2"><Activity size={16} className={maintenanceMode ? 'text-yellow-500' : 'text-gray-500'}/> Maintenance Mode</h3>
            <p className="text-sm text-gray-400">Display &quot;Down for maintenance&quot; screen to all mobile clients.</p>
          </div>
          <button 
            onClick={() => toggleSetting('maintenance_mode', maintenanceMode, setMaintenanceMode)}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${!maintenanceMode ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
          >
            {!maintenanceMode ? 'Enable Maintenance' : 'Disable Maintenance'}
          </button>
        </div>
      </div>
    </div>
  );
}
