-- TRAINING ENGINE PROGRESSION SYSTEM
-- Tracks algorithmic outputs for progressive overload, plateaus, and deloads

CREATE TABLE exercise_progression_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL,
    date DATE NOT NULL,
    weight NUMERIC NOT NULL,
    reps INTEGER NOT NULL,
    sets INTEGER NOT NULL,
    volume NUMERIC NOT NULL,
    estimated_1rm NUMERIC,
    rpe NUMERIC,
    rir NUMERIC,
    tempo TEXT,
    rest_time INTEGER,
    completion_rate NUMERIC, -- percentage of target reps completed
    recommendation JSONB, -- { "action": "increase_weight", "value": 82.5 }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying historical trends per athlete/exercise
CREATE INDEX idx_progression_history ON exercise_progression_history(athlete_id, exercise_id, date);

CREATE TABLE plateau_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL,
    type TEXT NOT NULL, -- 'strength', 'volume', 'fatigue', 'weight'
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    recommendation TEXT,
    ai_analysis TEXT, -- The Triple-Mode AI explanation generated for this plateau
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plateau_events ON plateau_events(athlete_id, exercise_id, status);

-- Enable RLS
ALTER TABLE exercise_progression_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE plateau_events ENABLE ROW LEVEL SECURITY;

-- Athletes can view their own history
CREATE POLICY "Athletes view own progression" ON exercise_progression_history FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "Athletes view own plateaus" ON plateau_events FOR SELECT USING (athlete_id = auth.uid());

-- Coaches can view progression for athletes they are assigned to or in their org
CREATE POLICY "Coaches view assigned progression" ON exercise_progression_history FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM athlete_programs WHERE assigned_by = auth.uid() OR assigned_by IN (SELECT user_id FROM organization_members WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Coaches view assigned plateaus" ON plateau_events FOR SELECT USING (
    athlete_id IN (SELECT athlete_id FROM athlete_programs WHERE assigned_by = auth.uid() OR assigned_by IN (SELECT user_id FROM organization_members WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())))
);
