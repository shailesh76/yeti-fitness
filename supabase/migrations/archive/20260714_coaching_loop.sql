-- COACHING INTELLIGENCE LOOP

-- 1. ATHLETE PERFORMANCE PROFILES
CREATE TABLE athlete_performance_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    training_age_months INTEGER DEFAULT 0,
    strength_level TEXT DEFAULT 'Beginner', -- Beginner, Intermediate, Advanced
    recovery_capacity TEXT DEFAULT 'Normal', -- Low, Normal, High
    volume_tolerance TEXT DEFAULT 'Normal', -- Low, Normal, High
    weak_muscle_groups TEXT[],
    strong_muscle_groups TEXT[],
    overall_status TEXT DEFAULT 'Monitor', -- Progressing, Monitor, Intervention Required
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(athlete_id)
);

-- 2. WEEKLY REVIEWS
CREATE TABLE weekly_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    workouts_completed INTEGER DEFAULT 0,
    workouts_target INTEGER DEFAULT 0,
    strength_summary TEXT,
    recovery_summary TEXT,
    ai_recommendation TEXT,
    is_read_by_coach BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weekly_reviews ON weekly_reviews(athlete_id, week_start_date);

-- 3. MUSCLE VOLUME LOGS (For Muscle Balance Engine)
CREATE TABLE muscle_volume_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    muscle_group TEXT NOT NULL,
    week_start_date DATE NOT NULL,
    total_sets INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_muscle_volume ON muscle_volume_logs(athlete_id, week_start_date);

-- 4. AI MEMORY (Append to users via metadata or dedicated table)
CREATE TABLE ai_coach_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'strategy', 'injury', 'preference'
    memory_key TEXT NOT NULL,
    memory_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE athlete_performance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_volume_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_memory ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own data
CREATE POLICY "Athletes view own profile" ON athlete_performance_profiles FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "Athletes view own reviews" ON weekly_reviews FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "Athletes view own volume" ON muscle_volume_logs FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "Athletes view own memory" ON ai_coach_memory FOR SELECT USING (athlete_id = auth.uid());

-- Coaches can view data for athletes they are assigned to
CREATE POLICY "Coaches view assigned profiles" ON athlete_performance_profiles FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM athlete_programs WHERE assigned_by = auth.uid() OR assigned_by IN (SELECT user_id FROM organization_members WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Coaches view assigned reviews" ON weekly_reviews FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM athlete_programs WHERE assigned_by = auth.uid() OR assigned_by IN (SELECT user_id FROM organization_members WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())))
);
