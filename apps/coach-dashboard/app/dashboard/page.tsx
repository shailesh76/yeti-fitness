"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, TrendingUp, UserPlus, X, ChevronRight, Activity, Calendar } from 'lucide-react';
import { useCoachStore } from '@/store/useCoachStore';

export default function DashboardHome() {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const { clients, getClients, loading, inviteClient } = useCoachStore();

  useEffect(() => {
    getClients();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      await inviteClient(inviteEmail);
      alert('Invite sent successfully!');
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error) {
      alert('Failed to send invite.');
    } finally {
      setIsInviting(false);
    }
  };

  // Determine athletes needing attention dynamically
  const flaggedAthletes = clients.filter(c => c.adherenceScore < 70 || c.lastWorkout === 0);

  const totalAthletes = clients.length;
  const avgAdherence = totalAthletes > 0 
    ? Math.round(clients.reduce((sum, c) => sum + c.adherenceScore, 0) / totalAthletes)
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8">Coach Dashboard</h1>

      {/* COACH INBOX: Daily Priority List */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-300 mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-blue-500" />
          Coach Inbox: Needs Attention
        </h2>
        
        {loading ? (
          <div className="text-gray-500">Loading priority list...</div>
        ) : flaggedAthletes.length === 0 ? (
          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 text-gray-400">
            🟢 All athletes are currently active and hitting their targets!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {flaggedAthletes.map(athlete => {
              const statusColor = athlete.adherenceScore < 50 ? 'bg-red-500' : 'bg-yellow-500';
              const borderTheme = athlete.adherenceScore < 50 ? 'border-red-900/50' : 'border-yellow-900/50';
              return (
                <div 
                  key={athlete.id}
                  onClick={() => router.push(`/dashboard/${athlete.id}`)}
                  className={`bg-gray-900 border ${borderTheme} p-4 rounded-xl cursor-pointer hover:bg-gray-800 transition`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <h3 className="font-bold">{athlete.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    {athlete.lastWorkout === 0 
                      ? 'No recorded workouts' 
                      : `Adherence is low (${athlete.adherenceScore}%)`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ROSTER / ATHLETE LIST */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-300">Roster Overview</h2>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition"
          >
            <UserPlus size={18} />
            Invite Client
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-2">Total Athletes</p>
            <p className="text-4xl font-black">{loading ? '...' : totalAthletes}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-2">Average Adherence Score</p>
            <p className="text-4xl font-black text-blue-400">{loading ? '...' : avgAdherence}%</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-2">Pending Invites</p>
            <p className="text-4xl font-black text-amber-500">1</p>
          </div>
        </div>

        {/* Client Roster List */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 bg-gray-950 flex justify-between">
            <span className="text-sm font-bold text-gray-400">Athlete Name</span>
            <span className="text-sm font-bold text-gray-400">Yeti Plan</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading roster...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No active athletes. Invite one to get started!</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {clients.map(athlete => (
                <div 
                  key={athlete.id}
                  onClick={() => router.push(`/dashboard/${athlete.id}`)}
                  className="p-4 flex items-center justify-between hover:bg-gray-800/50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {athlete.initials}
                    </div>
                    <div>
                      <p className="font-bold">{athlete.name}</p>
                      <p className="text-xs text-gray-500">Weight: {athlete.weight}kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 bg-gray-950 px-3 py-1 rounded-full border border-gray-800">
                      {athlete.planName}
                    </span>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Invite New Athlete</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Athlete Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleInvite}
                disabled={isInviting || !inviteEmail}
                className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {isInviting ? 'Sending Invite...' : 'Send Invite Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
