-- YETI BETA SAFETY FOUNDATION

-- 1. BETA CONSENT SYSTEM
CREATE TABLE beta_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL, -- BETA_TESTING, DATA_COLLECTION, AI_DISCLAIMER, PRIVACY_POLICY
    consent_version TEXT NOT NULL,
    accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMPTZ,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, consent_type, consent_version)
);

-- 2. SYSTEM ERRORS
CREATE TABLE system_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL, -- WORKOUT_SYNC_FAILED, AI_REQUEST_FAILED, AUTH_ERROR, DATABASE_ERROR
    message TEXT NOT NULL,
    stack_trace TEXT,
    platform TEXT,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SOFT DELETE ARCHITECTURE
-- Assume these tables exist from prior phases. We add the column.
-- (workouts, workout_history, meals, measurements, progress_photos)
-- Note: In a real environment, we'd use ALTER TABLE IF EXISTS.
-- For this scaffold, we define the alters for the tables we know exist.
ALTER TABLE workouts ADD COLUMN deleted_at TIMESTAMPTZ;
-- Updating RLS for soft deletes (Example for workouts)
-- ALTER POLICY "Users view own workouts" ON workouts USING (athlete_id = auth.uid() AND deleted_at IS NULL);
-- We won't overwrite existing policies here, but the application layer / sync engine will now filter `deleted_at IS NULL`.

-- 4. AI SAFETY LOGS
CREATE TABLE ai_safety_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    risk_type TEXT NOT NULL, -- MEDICAL_ADVICE, INJURY_REPORT, UNSAFE_TRAINING
    trigger_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COACH OVERRIDE SYSTEM
CREATE TABLE coach_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_recommendation TEXT NOT NULL,
    coach_decision TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ADMIN EMERGENCY CONTROLS
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES 
('ai_enabled', 'true'),
('beta_enabled', 'true'),
('maintenance_mode', 'false');

-- 7. ADMIN AUDIT LOG
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect admin log from modifications
CREATE RULE prevent_admin_actions_update AS ON UPDATE TO admin_actions DO INSTEAD NOTHING;
CREATE RULE prevent_admin_actions_delete AS ON DELETE TO admin_actions DO INSTEAD NOTHING;

-- Enable RLS
ALTER TABLE beta_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_safety_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Users read own consents" ON beta_consents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Public system settings" ON system_settings FOR SELECT USING (true);
