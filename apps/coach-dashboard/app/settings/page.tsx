"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Settings, User, Bell, LogOut, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push("/login");
        return;
      }
      
      supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setFullName(data.full_name || "");
            setBio(data.bio || "");
          }
          setLoading(false);
        });
    });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio: bio,
        })
        .eq("id", session.user.id);

      if (error) throw error;
      
      setStatusType("success");
      setStatusMsg("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      setStatusType("error");
      setStatusMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto w-full space-y-6">
        <div className="h-8 w-48 bg-white/5 animate-pulse rounded" />
        <div className="h-96 w-full bg-white/5 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 border ${
          statusType === "success" 
            ? "bg-green-500/10 border-green-500/20 text-green-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {statusType === "success" && <CheckCircle className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-semibold">{statusMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card>
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <User className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-bold text-white">Profile Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Display Name</label>
              <input 
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-11 bg-[#131313] border border-white/10 rounded-lg px-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-gray-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Bio / Coaching Description</label>
              <textarea 
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your coaching philosophy, certifications, or notes..."
                className="w-full bg-[#131313] border border-white/10 rounded-lg p-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-gray-500 font-medium resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Notifications Card */}
        <Card>
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <Bell className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-bold text-white">Notifications Preferences</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="h-5 w-5 rounded border-gray-600 text-primary focus:ring-primary bg-surface/50"
              />
              <span className="text-sm font-semibold text-gray-300">Email alerts for client workouts</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={pushNotifs}
                onChange={(e) => setPushNotifs(e.target.checked)}
                className="h-5 w-5 rounded border-gray-600 text-primary focus:ring-primary bg-surface/50"
              />
              <span className="text-sm font-semibold text-gray-300">Push notifications for comments or updates</span>
            </label>
          </div>
        </Card>

        {/* Save button & Logout */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 font-bold text-sm tracking-wider uppercase transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving Changes..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
