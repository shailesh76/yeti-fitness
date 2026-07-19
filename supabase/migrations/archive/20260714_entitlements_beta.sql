-- YETI SUBSCRIPTION & ENTITLEMENTS

CREATE TABLE subscription_plans (
    id TEXT PRIMARY KEY, -- 'FREE', 'PRO', 'COACHING'
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    billing_interval TEXT DEFAULT 'month',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial plans
INSERT INTO subscription_plans (id, name, price) VALUES 
('FREE', 'Yeti Free', 0),
('PRO', 'Yeti Pro', 14.99),
('COACHING', 'Yeti Coaching', 99.99);

CREATE TABLE features (
    id TEXT PRIMARY KEY, -- 'ai_coach', 'advanced_analytics'
    name TEXT NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Seed features
INSERT INTO features (id, name, category) VALUES 
('workout_tracking', 'Workout Tracking', 'core'),
('ai_coach', 'AI Coach', 'premium'),
('advanced_analytics', 'Advanced Analytics', 'premium'),
('progression_engine', 'Progression Engine', 'premium'),
('coach_access', '1-on-1 Coaching', 'coaching');

CREATE TABLE plan_features (
    plan_id TEXT REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_id TEXT REFERENCES features(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    limits JSONB, -- e.g. {"history_days": 7}
    PRIMARY KEY (plan_id, feature_id)
);

-- Seed plan mappings
INSERT INTO plan_features (plan_id, feature_id, enabled) VALUES 
('FREE', 'workout_tracking', true),
('PRO', 'workout_tracking', true),
('PRO', 'ai_coach', true),
('PRO', 'advanced_analytics', true),
('PRO', 'progression_engine', true),
('COACHING', 'coach_access', true);

CREATE TABLE user_entitlements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES subscription_plans(id),
    source TEXT NOT NULL, -- 'beta_grant', 'revenuecat', 'stripe', 'admin'
    status TEXT DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, plan_id)
);

CREATE TABLE beta_mode_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_global_beta_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO beta_mode_config (id, is_global_beta_active) VALUES (1, false);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_mode_config ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Public plans" ON subscription_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Public features" ON features FOR SELECT USING (is_active = true);
CREATE POLICY "Public plan features" ON plan_features FOR SELECT USING (true);
CREATE POLICY "Users read own entitlements" ON user_entitlements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Public beta config" ON beta_mode_config FOR SELECT USING (true);

-- We assume super admins can manage these tables via a separate Admin role/RLS bypass, 
-- but for the MVP Admin Dashboard we will rely on Supabase Service Role Keys.
