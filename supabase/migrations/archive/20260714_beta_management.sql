-- BETA USER MANAGEMENT & ANALYTICS

-- 1. BETA USERS METADATA
CREATE TABLE beta_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    beta_status TEXT DEFAULT 'ACTIVE', -- ACTIVE, REMOVED, INVITED
    beta_joined_at TIMESTAMPTZ DEFAULT NOW(),
    beta_source TEXT DEFAULT 'organic',
    coach_notes TEXT,
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENTITLEMENT HISTORY (Audit Log)
CREATE TABLE entitlement_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- PRO_GRANTED, PRO_REMOVED, BETA_ENABLED, BETA_DISABLED
    old_entitlement TEXT,
    new_entitlement TEXT,
    source TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect audit log from modifications
CREATE RULE prevent_entitlement_history_update AS ON UPDATE TO entitlement_history DO INSTEAD NOTHING;
CREATE RULE prevent_entitlement_history_delete AS ON DELETE TO entitlement_history DO INSTEAD NOTHING;

-- 3. BETA FEEDBACK
CREATE TABLE beta_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Bug, Workout Issue, AI Feedback, Nutrition Feedback, Feature Request
    message TEXT NOT NULL,
    screen_name TEXT,
    app_version TEXT,
    priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
    status TEXT DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beta_feedback_status ON beta_feedback(status);

-- Enable RLS
ALTER TABLE beta_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own data
CREATE POLICY "Athletes view own beta status" ON beta_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Athletes view own history" ON entitlement_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Athletes manage own feedback" ON beta_feedback FOR ALL USING (user_id = auth.uid());

-- Coaches/Admins would have bypass policies in a production setup, but omitted here for simplicity
