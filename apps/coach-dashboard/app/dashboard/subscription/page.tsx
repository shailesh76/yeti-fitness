'use client';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Plus, Star, Loader2, CheckCircle, XCircle, Globe } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface BetaUser {
  user_id: string;
  email: string;
  plan_id: string;
  status: string;
  is_active: boolean;   // derived from status === 'active'
  granted_at: string;   // mapped from created_at
  source: string;
}

export default function SubscriptionAdmin() {
  const [globalBeta, setGlobalBeta] = useState(false);
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const showMessage = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch global beta flag
      const { data: flagData } = await supabase
        .from('feature_flags')
        .select('value')
        .eq('key', 'global_beta_pro')
        .single();
      setGlobalBeta(flagData?.value === 'true');

      // Beta grants are read via the manage-entitlements edge function. Emails live
      // in auth.users (not profiles) and require service_role, and routing through the
      // function keeps a single authorization model instead of a direct, RLS-limited
      // client query that would only ever return the caller's own row.
      const { data: listRes, error: listErr } = await supabase.functions.invoke('manage-entitlements', {
        body: { action: 'list' },
      });
      if (listErr || (listRes && listRes.error)) {
        throw new Error(listErr?.message || listRes?.error || 'Failed to load entitlements');
      }

      setBetaUsers(
        (listRes?.entitlements || []).map((e: any) => ({
          user_id: e.user_id,
          email: e.email || e.user_id,
          plan_id: e.plan_id,
          status: e.status,
          is_active: e.status === 'active',
          granted_at: e.created_at,
          source: e.source || 'manual_grant',
        })),
      );
    } catch (err: any) {
      showMessage('Failed to load entitlements: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const toggleGlobalBeta = async () => {
    setToggling(true);
    try {
      const newValue = !globalBeta;
      const { error } = await supabase
        .from('feature_flags')
        .upsert({ key: 'global_beta_pro', value: String(newValue) }, { onConflict: 'key' });
      if (error) throw error;
      setGlobalBeta(newValue);
      showMessage(`Global Beta PRO ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      showMessage('Failed to toggle global beta: ' + err.message, true);
    } finally {
      setToggling(false);
    }
  };

  const grantPro = async () => {
    if (!grantEmail.trim()) return;
    setGranting(true);
    try {
      // Grant via the secure edge function — it resolves email → user server-side
      // (profiles has no email column; emails live in auth.users).
      const { data: result, error: invokeErr } = await supabase.functions.invoke('manage-entitlements', {
        body: {
          action: 'grant',
          email: grantEmail.trim(),
          plan: 'PRO',
        }
      });

      if (invokeErr || (result && result.error)) {
        const errMsg = invokeErr?.message || result?.error || 'Failed to grant entitlement';
        if (errMsg.includes('23505')) throw new Error('User already has PRO access.');
        throw new Error(errMsg);
      }

      setGrantEmail('');
      showMessage(`PRO access granted to ${grantEmail}`);
      await fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setGranting(false);
    }
  };

  const revokePro = async (userId: string, email: string) => {
    if (!confirm(`Revoke PRO access from ${email}?`)) return;
    try {
      // We already have the user_id from the list — revoke directly via the edge function.
      const { data: result, error: invokeErr } = await supabase.functions.invoke('manage-entitlements', {
        body: {
          action: 'revoke',
          athleteId: userId,
        }
      });

      if (invokeErr || (result && result.error)) {
        throw new Error(invokeErr?.message || result?.error || 'Failed to revoke entitlement');
      }

      showMessage(`PRO revoked from ${email}`);
      await fetchData();
    } catch (err: any) {
      showMessage('Failed to revoke: ' + err.message, true);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-red-500" /> Subscription &amp; Admin
          </h1>
          <p className="text-gray-400 mt-2">
            Manage feature entitlements, beta grants, and revenue plans.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          Refresh
        </button>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
          <XCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Global Beta Toggle */}
        <div className="col-span-1 bg-gray-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
            DANGER ZONE
          </div>
          <Globe className="text-amber-400 mb-3" size={24} />
          <h2 className="text-xl font-bold text-white mb-2">Global Beta Mode</h2>
          <p className="text-sm text-gray-400 mb-6">
            If enabled, ALL authenticated users receive Yeti PRO access automatically.
          </p>

          <button
            onClick={toggleGlobalBeta}
            disabled={toggling}
            className={`w-full py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
              globalBeta
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {toggling && <Loader2 className="animate-spin" size={16} />}
            {globalBeta ? 'Disable Global Beta' : 'Enable Global Beta'}
          </button>

          <div className="mt-3 flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${globalBeta ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'bg-gray-600'}`}
            />
            <span className="text-xs text-gray-500">
              {globalBeta ? 'ACTIVE — All users have PRO' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Grant PRO + Whitelist */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="text-yellow-400" size={20} /> Beta Whitelist
              <span className="text-sm text-gray-500 font-normal ml-1">
                ({betaUsers.filter((u) => u.is_active).length} active)
              </span>
            </h2>
          </div>

          {/* Grant form */}
          <div className="flex gap-3 mb-5">
            <input
              type="email"
              placeholder="athlete@email.com"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && grantPro()}
              className="flex-1 h-10 bg-gray-800 border border-gray-700 rounded-lg px-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500 placeholder:text-gray-500"
            />
            <button
              onClick={grantPro}
              disabled={granting || !grantEmail.trim()}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
              {granting ? <Loader2 className="animate-spin" size={14} /> : <Plus size={16} />}
              Grant PRO
            </button>
          </div>

          {/* Table */}
          <div className="bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-600" size={24} />
              </div>
            ) : betaUsers.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                No beta grants yet. Enter an email above to grant PRO access.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {betaUsers.map((u) => (
                    <tr key={u.user_id} className="text-gray-300 hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-yellow-400 font-bold">{u.plan_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-800 px-2 py-1 rounded text-xs">{u.source}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="text-green-400 flex items-center gap-1 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Active
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Revoked</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active && (
                          <button
                            onClick={() => revokePro(u.user_id, u.email)}
                            className="text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
