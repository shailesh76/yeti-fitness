"use client";

import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Verify role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user?.id)
      .single();

    if (profile?.role !== "coach") {
      await supabase.auth.signOut();
      setError("Unauthorized. Coach access only.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131313] border border-white/5 rounded-2xl p-8">
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-[0_0_20px_rgba(57,255,106,0.2)]">
            <span className="text-[#0a0a0a] font-black text-2xl">Y</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-white">Yeti Coach</span>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {(error || urlError) && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
              {error || (urlError === 'unauthorized' ? 'Unauthorized. Coach access only.' : 'Authentication error. Please try again.')}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary"
              required
            />
          </div>

          <Button type="submit" className="w-full h-12" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

