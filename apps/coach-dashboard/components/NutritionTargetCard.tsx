"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Target, Lock } from "lucide-react";
import { useCoachStore } from "@/store/useCoachStore";
import { supabase } from "@/lib/supabase";

/**
 * Coach-facing card to assign an athlete's calorie + macro targets as one object.
 * Writes the canonical profiles.daily_*_target columns (via useCoachStore, which
 * is RLS-gated to the coach's own assigned athletes) and locks them in the
 * athlete app.
 */
export function NutritionTargetCard({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const assignNutritionTargets = useCoachStore((s) => s.assignNutritionTargets);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("daily_calorie_target,daily_protein_target,daily_carb_target,daily_fat_target,nutrition_targets_locked")
        .eq("id", athleteId)
        .maybeSingle();
      if (cancelled || !data) return;
      setCalories(data.daily_calorie_target?.toString() ?? "");
      setProtein(data.daily_protein_target?.toString() ?? "");
      setCarbs(data.daily_carb_target?.toString() ?? "");
      setFat(data.daily_fat_target?.toString() ?? "");
      setLocked(!!data.nutrition_targets_locked);
    })();
    return () => { cancelled = true; };
  }, [athleteId]);

  const handleAssign = async () => {
    const t = {
      calories: parseInt(calories, 10),
      protein: parseInt(protein, 10),
      carbs: parseInt(carbs, 10),
      fat: parseInt(fat, 10),
    };
    if ([t.calories, t.protein, t.carbs, t.fat].some((n) => !Number.isFinite(n) || n < 0 || n > 20000)) {
      setStatus({ ok: false, msg: "Enter valid non-negative numbers for all four targets." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const outcome = await assignNutritionTargets(athleteId, t);
      setLocked(true);
      setStatus(
        outcome.notified
          ? { ok: true, msg: "Targets assigned and locked — the athlete has been notified." }
          : { ok: false, msg: "Targets assigned and locked, but we couldn't notify the athlete. Let them know directly." },
      );
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message || "Failed to assign targets." });
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void, unit: string) => (
    <div className="flex-1">
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => set(e.target.value)}
          className="w-full bg-black/40 border border-surface-highlight rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
          placeholder="0"
        />
        <span className="absolute right-3 top-2.5 text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  );

  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">Nutrition Targets</h3>
        {locked && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-amber-400">
            <Lock className="w-3 h-3" /> LOCKED
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Set {athleteName}&apos;s daily calorie and macro targets. Assigning locks them in the athlete&apos;s app.
      </p>
      <div className="flex gap-3 mb-3">
        {field("Calories", calories, setCalories, "kcal")}
        {field("Protein", protein, setProtein, "g")}
      </div>
      <div className="flex gap-3 mb-4">
        {field("Carbs", carbs, setCarbs, "g")}
        {field("Fat", fat, setFat, "g")}
      </div>
      {status && (
        <p className={`text-xs mb-3 ${status.ok ? "text-primary" : "text-red-400"}`}>{status.msg}</p>
      )}
      <Button onClick={handleAssign} disabled={saving} className="w-full">
        {saving ? "Assigning…" : "Assign & Lock Targets"}
      </Button>
    </Card>
  );
}
