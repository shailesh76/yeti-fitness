"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, NotebookPen, Dumbbell, MessageSquare, LogOut, Settings, ChevronLeft, ChevronRight, Menu } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to true for SSR/mobile
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const saved = localStorage.getItem("coach-sidebar-collapsed");
    if (saved === "true" || (saved === null && isMobile)) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem("coach-sidebar-collapsed", String(nextVal));
  };

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

  if (!isMounted) {
    return (
      <aside className="flex h-screen w-64 flex-col bg-[#0a0a0a] border-r border-white/5 px-4 py-6 sticky top-0 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-[#0a0a0a] font-black text-xl">Y</span>
          </div>
          <span className="text-xl font-black tracking-tight text-white">Yeti Coach</span>
        </div>
        <nav className="flex flex-1 flex-col gap-2" />
      </aside>
    );
  }

  return (
    <>
      {/* Floating Toggle Button for Mobile */}
      <button
        onClick={toggleCollapse}
        className="md:hidden fixed bottom-6 left-6 z-50 p-3 bg-primary text-black rounded-full shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-200"
        title="Toggle Menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Backdrop Overlay for Mobile */}
      {!isCollapsed && (
        <div 
          onClick={toggleCollapse}
          className="md:hidden fixed inset-0 bg-black/60 z-30 animate-in fade-in duration-200"
        />
      )}

      <aside className={cn(
        "flex h-screen flex-col bg-[#0a0a0a] border-r border-white/5 py-6 sticky top-0 transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "md:w-20 md:px-3" : "md:w-64 md:px-4",
        isCollapsed 
          ? "w-0 px-0 overflow-hidden border-r-0" 
          : "fixed inset-y-0 left-0 w-64 px-4 z-40 shadow-2xl md:relative md:shadow-none"
      )}>
        <div className={cn("flex items-center justify-between px-2 mb-10 transition-all duration-300", isCollapsed ? "flex-col gap-4" : "")}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
              <span className="text-[#0a0a0a] font-black text-xl">Y</span>
            </div>
            {!isCollapsed && (
              <span className="text-xl font-black tracking-tight text-white transition-opacity duration-300">Yeti Coach</span>
            )}
          </div>
          <button 
            onClick={toggleCollapse} 
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
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
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-xl py-3 text-sm font-semibold transition-all duration-300",
                  isCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-3",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span className="transition-opacity duration-300">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn("mt-auto px-2 border-t border-white/5 pt-6 transition-all duration-300", isCollapsed ? "mx-auto px-0" : "")}>
          <div className={cn("flex items-center", isCollapsed ? "flex-col gap-3" : "gap-3")}>
            <div className="h-10 w-10 rounded-full bg-surface-highlight flex items-center justify-center border border-white/10 shrink-0">
              <span className="font-bold text-xs text-white">{initials || "CO"}</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-white truncate">{coachName}</span>
                <span className="text-xs text-gray-500 font-semibold">Coach</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title={isCollapsed ? "Log out" : undefined}
            className={cn(
              "mt-6 flex items-center text-gray-400 hover:text-red-500 transition-colors text-sm font-semibold disabled:opacity-50",
              isCollapsed ? "justify-center w-10 h-10 mx-auto" : "gap-3 w-full px-1"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>{loggingOut ? "Signing out..." : "Log out"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
