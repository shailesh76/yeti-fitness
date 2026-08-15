-- ============================================================
-- Phase 3.3C: Private Beta Readiness & Safety Controls
-- ============================================================

-- 1. Beta Consents Table
CREATE TABLE IF NOT EXISTS public.beta_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL, -- BETA_TESTING, DATA_COLLECTION, AI_DISCLAIMER, PRIVACY_POLICY
    consent_version TEXT NOT NULL,
    accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, consent_type, consent_version)
);

-- Enable RLS
ALTER TABLE public.beta_consents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users read own consents" ON public.beta_consents;
DROP POLICY IF EXISTS "Users insert own consents" ON public.beta_consents;

-- Create Policies
CREATE POLICY "Users read own consents" ON public.beta_consents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own consents" ON public.beta_consents
    FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 2. Beta User Feedback Table
CREATE TABLE IF NOT EXISTS public.beta_user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'Other', -- Bug, Feature request, Workout issue, AI coach issue, Other
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.beta_user_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users submit feedback" ON public.beta_user_feedback;
DROP POLICY IF EXISTS "Coaches and admins read feedback" ON public.beta_user_feedback;

-- Create Policies
CREATE POLICY "Authenticated users submit feedback" ON public.beta_user_feedback
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Coaches and admins read feedback" ON public.beta_user_feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('coach', 'admin')
        )
    );
