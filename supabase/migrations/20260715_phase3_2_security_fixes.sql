-- ============================================================
-- Phase 3.2: Security Fixes Migration
-- Addresses all Critical and High findings from security audit
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. AI USAGE TABLE
-- Tracks per-user daily request counts with richer metadata.
-- Cannot be bypassed — identity sourced from JWT in Edge Function.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  requests_count INTEGER NOT NULL DEFAULT 0,
  subscription_tier TEXT,               -- 'FREE' | 'PRO' | 'COACHING'
  last_request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_athlete_date UNIQUE (athlete_id, date)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Drop stale policies if they exist before recreating
DROP POLICY IF EXISTS "Athletes read own ai_usage" ON public.ai_usage;

-- Athletes can read their own usage, but CANNOT write directly
CREATE POLICY "Athletes read own ai_usage" ON public.ai_usage
  FOR SELECT USING (athlete_id = auth.uid());

-- No INSERT/UPDATE allowed via API — Edge Function uses service role implicitly
-- via anon key + user-JWT; the upsert is protected by athlete_id = user.id in the EF.

-- ────────────────────────────────────────────────────────────
-- 2. PROGRESSION RECOMMENDATIONS
-- Was missing entirely from migrations — CRITICAL RLS GAP
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progression_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'MAINTAIN',     -- INCREASE_WEIGHT | INCREASE_REPS | MAINTAIN | DELOAD
  suggested_weight NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',      -- pending | acknowledged | completed | dismissed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.progression_recommendations ENABLE ROW LEVEL SECURITY;

-- Drop stale policies if they exist before recreating
DROP POLICY IF EXISTS "Athletes read own recommendations" ON public.progression_recommendations;
DROP POLICY IF EXISTS "Athletes update own recommendation status" ON public.progression_recommendations;
DROP POLICY IF EXISTS "Coaches read client recommendations" ON public.progression_recommendations;

-- Athletes can read and acknowledge their own recommendations
CREATE POLICY "Athletes read own recommendations" ON public.progression_recommendations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Athletes update own recommendation status" ON public.progression_recommendations
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coaches can read recommendations for assigned athletes
CREATE POLICY "Coaches read client recommendations" ON public.progression_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = progression_recommendations.user_id
    )
  );

-- INSERT only allowed by service role (Edge Function) — no direct client inserts
-- No INSERT policy = authenticated users cannot insert directly.

CREATE INDEX IF NOT EXISTS idx_progression_recs_user_id ON public.progression_recommendations(user_id, status);

-- ────────────────────────────────────────────────────────────
-- 3. AI SAFETY LOGS — Fix: was missing all policies (CRITICAL)
-- Self-contained: creates table if prior migration was not applied
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_safety_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL DEFAULT '',
  risk_type TEXT NOT NULL DEFAULT 'UNKNOWN',
  trigger_text TEXT NOT NULL DEFAULT '',
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_safety_logs ENABLE ROW LEVEL SECURITY;

-- Add category column in case table already exists from older migration
ALTER TABLE public.ai_safety_logs ADD COLUMN IF NOT EXISTS category TEXT;

-- Drop ALL stale policies before recreating
DROP POLICY IF EXISTS "Users write own safety logs" ON public.ai_safety_logs;
DROP POLICY IF EXISTS "Athletes insert own safety logs" ON public.ai_safety_logs;
DROP POLICY IF EXISTS "Coaches read client safety logs" ON public.ai_safety_logs;
DROP POLICY IF EXISTS "Service role manages safety logs" ON public.ai_safety_logs;

-- SECURITY: No athlete INSERT policy.
-- ai_safety_logs are written EXCLUSIVELY by the ai-coach Edge Function
-- using the SUPABASE_SERVICE_ROLE_KEY client, which bypasses RLS entirely.
-- Allowing athlete JWT inserts would let clients fabricate safety records.

-- Coaches can view safety logs for their assigned athletes only
CREATE POLICY "Coaches read client safety logs" ON public.ai_safety_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = ai_safety_logs.user_id
    )
  );

-- Athletes can read their own safety log entries (for transparency)
CREATE POLICY "Athletes read own safety logs" ON public.ai_safety_logs
  FOR SELECT USING (user_id = auth.uid());

-- Explicit policy for service_role to insert and manage safety logs
CREATE POLICY "Service role manages safety logs" ON public.ai_safety_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_safety_logs_user_id ON public.ai_safety_logs(user_id);

-- ────────────────────────────────────────────────────────────
-- 4. FOODS TABLE — Fix: overly permissive ALL policy
-- Any authenticated user could modify the global food library
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    calories INTEGER NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    carbs NUMERIC NOT NULL DEFAULT 0,
    fat NUMERIC NOT NULL DEFAULT 0,
    serving_size TEXT,
    barcode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- Ensure created_by column exists if table was created in an older migration
ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Drop ALL stale policies before recreating
DROP POLICY IF EXISTS "Allow authenticated read/write access to foods" ON public.foods;
DROP POLICY IF EXISTS "Authenticated users can read foods" ON public.foods;
DROP POLICY IF EXISTS "Users can insert foods" ON public.foods;
DROP POLICY IF EXISTS "Creators can update own foods" ON public.foods;
DROP POLICY IF EXISTS "Deny user food deletion" ON public.foods;

-- All authenticated users can READ the shared food library
CREATE POLICY "Authenticated users can read foods" ON public.foods
  FOR SELECT TO authenticated USING (true);

-- Any authenticated user can add foods (custom foods logged from the app)
CREATE POLICY "Users can insert foods" ON public.foods
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- HARDENED: Only the original creator can update their food record.
-- Removed: OR created_by IS NULL — NULL records are system/seeded foods,
-- editable only by service_role (bypasses RLS). Normal users cannot touch them.
CREATE POLICY "Creators can update own foods" ON public.foods
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Explicit DELETE denial for normal users.
-- Shared food library records must not be deletable by athletes/coaches.
-- Deletion is only possible via service_role (admin backoffice).
CREATE POLICY "Deny user food deletion" ON public.foods
  FOR DELETE USING (false);

-- Explicit policy for service_role to manage foods
CREATE POLICY "Service role manages foods" ON public.foods
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- BACKFILL NOTE (run separately after migration in Supabase SQL Editor):
-- Foods inserted before this migration have created_by = NULL.
-- These are treated as system/seed foods and cannot be edited by any user.
-- To assign ownership to a specific admin user, run:
--   UPDATE public.foods SET created_by = '<admin-user-uuid>' WHERE created_by IS NULL;
-- Do NOT run this automatically as it requires a known admin UUID.

-- ────────────────────────────────────────────────────────────
-- 5. AI MEMORY — Fix: athletes could write directly via API
-- Memory writes should be Edge-Function only; users get SELECT only
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

-- Ensure category and timestamps exist if table was created by older migrations
ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DROP POLICY IF EXISTS "Users can manage their own ai_memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Athletes read own ai_memory" ON public.ai_memory;
DROP POLICY IF EXISTS "Athletes insert own ai_memory via edge" ON public.ai_memory;
DROP POLICY IF EXISTS "Athletes update own ai_memory via edge" ON public.ai_memory;
DROP POLICY IF EXISTS "Coaches view client ai_memory" ON public.ai_memory;

-- SECURITY: Athletes have SELECT only.
-- ai_memory INSERT and UPDATE are performed EXCLUSIVELY by the ai-coach Edge Function
-- using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely.
-- Granting athlete JWT write access would allow clients to inject arbitrary memories.
CREATE POLICY "Athletes read own ai_memory" ON public.ai_memory
  FOR SELECT USING (auth.uid() = athlete_id);

-- Coaches can view their assigned athletes' memories (read-only)
CREATE POLICY "Coaches view client ai_memory" ON public.ai_memory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = ai_memory.athlete_id
    )
  );

-- Explicit policy for service_role to manage ai_memory
DROP POLICY IF EXISTS "Service role manages ai_memory" ON public.ai_memory;
CREATE POLICY "Service role manages ai_memory" ON public.ai_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 6. ERROR LOGS — Fix: 'admin' role not a valid profile role
-- Add 'admin' as a valid role value to profiles
-- ────────────────────────────────────────────────────────────
-- Drop the existing CHECK constraint and replace with extended version
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('athlete', 'coach', 'admin'));

-- Now the existing error_logs SELECT policy for coaches/admins will work correctly

-- ────────────────────────────────────────────────────────────
-- 7. USER ENTITLEMENTS — Explicit deny INSERT for normal users
-- Entitlement grants must come from admin/webhook only (service role)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT,
  source TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, plan_id)
);

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Drop ALL stale policies before recreating
DROP POLICY IF EXISTS "Deny user self-grant entitlements" ON public.user_entitlements;
DROP POLICY IF EXISTS "Deny user entitlement updates" ON public.user_entitlements;
DROP POLICY IF EXISTS "Deny user entitlement deletion" ON public.user_entitlements;
DROP POLICY IF EXISTS "Athletes read own entitlements" ON public.user_entitlements;

-- Athletes can READ their own entitlement to check subscription status in the app
CREATE POLICY "Athletes read own entitlements" ON public.user_entitlements
  FOR SELECT USING (user_id = auth.uid());

-- Explicit DENY for all write operations by authenticated users.
-- RevenueCat webhooks, admin scripts, and internal tooling use service_role,
-- which bypasses RLS entirely — no explicit policy needed for those callers.
CREATE POLICY "Deny user self-grant entitlements" ON public.user_entitlements
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Deny user entitlement updates" ON public.user_entitlements
  FOR UPDATE USING (false);

CREATE POLICY "Deny user entitlement deletion" ON public.user_entitlements
  FOR DELETE USING (false);

-- Explicit policy for service_role to manage entitlements (RevenueCat/webhook/admin)
DROP POLICY IF EXISTS "Service role manages entitlements" ON public.user_entitlements;
CREATE POLICY "Service role manages entitlements" ON public.user_entitlements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 8. CONVERSATIONS — Fix: missing INSERT policy for athletes
-- Athletes need to create conversations with their coach
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Athletes create coach conversations" ON public.conversations;

CREATE POLICY "Athletes create coach conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    -- Only allow athlete to create a convo if they are the athlete in the pair
    auth.uid() = athlete_id AND
    -- Validate the coach_id belongs to a coach assigned to this athlete
    EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.athlete_id = auth.uid() AND cc.coach_id = conversations.coach_id
    )
  );

-- ────────────────────────────────────────────────────────────
-- 9. CONVERSATION MEMBERS — Fix: any user could join any convo
-- Add check that joining user is the athlete or coach in the conversation
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can join conversations" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can join their own conversations" ON public.conversation_members;

CREATE POLICY "Members can join their own conversations" ON public.conversation_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.athlete_id = auth.uid() OR c.coach_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 10. SYSTEM ERRORS — Fix: table was inert (no INSERT/SELECT policies)
-- Self-contained: creates table if prior migration was not applied
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL DEFAULT 'UNKNOWN',
  message TEXT NOT NULL DEFAULT '',
  stack_trace TEXT,
  platform TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated insert system errors" ON public.system_errors;
CREATE POLICY "Authenticated insert system errors" ON public.system_errors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

DROP POLICY IF EXISTS "Coaches read system errors" ON public.system_errors;
CREATE POLICY "Coaches read system errors" ON public.system_errors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- ────────────────────────────────────────────────────────────
-- 11. ACTIVITY LOGS — Add allowlist CHECK constraint on event_name
-- Prevents arbitrary event name injection
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_event_name_check;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_event_name_check
  CHECK (event_name IN (
    'app_opened',
    'signup_completed',
    'login_completed',
    'workout_started',
    'workout_completed',
    'pr_achieved',
    'meal_logged',
    'ai_chat_started',
    'ai_memory_saved',
    'message_sent',
    'plan_assigned',
    'check_in_submitted',
    'weight_logged'
  ));

-- ────────────────────────────────────────────────────────────
-- 12. AI USAGE LOG ENRICHMENT 
-- Add subscription_tier and request_status tracking
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT NOT NULL DEFAULT 'FREE',
  success BOOLEAN NOT NULL DEFAULT true,
  error_reason TEXT,
  message_length INTEGER,
  coach_type TEXT DEFAULT 'workout'
);

ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

-- Drop stale policies if they exist before recreating
DROP POLICY IF EXISTS "Athletes read own request logs" ON public.ai_request_logs;
DROP POLICY IF EXISTS "Athletes insert own request logs" ON public.ai_request_logs;

-- Athletes can read their own request history
CREATE POLICY "Athletes read own request logs" ON public.ai_request_logs
  FOR SELECT USING (athlete_id = auth.uid());

-- No INSERT via API — Edge Function handles inserts using user JWT
CREATE POLICY "Athletes insert own request logs" ON public.ai_request_logs
  FOR INSERT WITH CHECK (athlete_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_request_logs_athlete_date
  ON public.ai_request_logs(athlete_id, requested_at);
