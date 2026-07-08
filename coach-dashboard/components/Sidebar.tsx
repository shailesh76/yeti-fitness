"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, NotebookPen, Dumbbell, MessageSquare, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/dashboard", icon: Users },
  { name: "Plan Builder", href: "/plans/builder", icon: NotebookPen },
  { name: "Exercise Library", href: "/exercises", icon: Dumbbell },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Messages", href: "#", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [coachName, setCoachName] = useState<string>("...");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Load coach name from the live session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setCoachName(data.full_name);
        });
    });
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isNavActive = (name: string, href: string) => {
    if (href === "#") return false;
    if (name === "Clients" || name === "Dashboard") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    }
    return pathname.startsWith(href);
  };

  const initials = coachName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside className="flex h-screen w-64 flex-col bg-[#0a0a0a] border-r border-white/5 px-4 py-6 sticky top-0">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-[#0a0a0a] font-black text-xl">D</span>
        </div>
        <span className="text-xl font-black tracking-tight text-white">DUDE Coach</span>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavActive(item.name, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={
                item.name === "Messages"
                  ? (e) => {
                      e.preventDefault();
                      alert(`${item.name} coming soon!`);
                    }
                  : undefined
              }
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 border-t border-white/5 pt-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center border border-white/10">
            <span className="font-bold text-xs text-white">{initials || "CO"}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white truncate">{coachName}</span>
            <span className="text-xs text-gray-500 font-semibold">Coach</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-6 flex items-center gap-3 text-gray-400 hover:text-red-500 transition-colors w-full px-1 text-sm font-semibold disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
          {loggingOut ? "Signing out..." : "Log out"}
        </button>
      </div>
    </aside>
  );
}
