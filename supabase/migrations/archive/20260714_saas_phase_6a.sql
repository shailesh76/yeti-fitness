-- Phase 6A: SaaS Migration (Coach Platform & Multi-Tenant Org Structure)

-- ENUMS
CREATE TYPE template_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE check_in_status AS ENUM ('pending', 'reviewed', 'action_required');

-- 1. ORGANIZATIONS (Future proofing for Gyms, Coach Teams)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'coach', 'assistant')),
    PRIMARY KEY (org_id, user_id)
);

-- 2. PROGRAM TEMPLATES (Versioning & Separation from assigned programs)
CREATE TABLE program_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    status template_status DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE program_template_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES program_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE TABLE program_template_weeks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phase_id UUID REFERENCES program_template_phases(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL
);

CREATE TABLE program_template_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_id UUID REFERENCES program_template_weeks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day_of_week INTEGER -- 1 to 7
);

CREATE TABLE program_template_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID REFERENCES program_template_workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL, -- references the global exercises table
    alternative_exercise_id UUID,
    order_index INTEGER NOT NULL,
    target_sets INTEGER,
    target_reps TEXT,
    target_rpe NUMERIC,
    tempo TEXT,
    rest_time INTEGER, -- seconds
    notes TEXT,
    warmup_sets INTEGER DEFAULT 0,
    drop_sets INTEGER DEFAULT 0,
    superset_group UUID -- if multiple exercises share this uuid, they are a superset
);

-- 3. ASSIGNED ATHLETE PROGRAMS
CREATE TABLE athlete_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES program_templates(id), -- linked to specific version
    assigned_by UUID REFERENCES auth.users(id),
    start_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: The actual completed workouts and sets fall back to the existing `workout_history` and `sets` tables,
-- but we link them to `athlete_programs` if needed, or rely on `athlete_program_progress`.
CREATE TABLE athlete_program_progress (
    athlete_program_id UUID REFERENCES athlete_programs(id) ON DELETE CASCADE,
    completed_workouts INTEGER DEFAULT 0,
    completion_percentage NUMERIC DEFAULT 0,
    last_completed_at TIMESTAMPTZ,
    PRIMARY KEY (athlete_program_id)
);

-- 4. ATHLETE EXERCISE PROGRESS (Feeding AI & Training Engine)
CREATE TABLE athlete_exercise_progress (
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL,
    current_weight NUMERIC,
    current_reps INTEGER,
    last_rpe NUMERIC,
    best_weight NUMERIC,
    best_volume NUMERIC,
    best_estimated_1rm NUMERIC,
    last_completed TIMESTAMPTZ,
    PRIMARY KEY (athlete_id, exercise_id)
);

-- 5. EXPANDED CHECK-INS
CREATE TABLE check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES auth.users(id),
    weight NUMERIC,
    body_fat NUMERIC,
    energy INTEGER CHECK (energy BETWEEN 1 AND 10),
    stress INTEGER CHECK (stress BETWEEN 1 AND 10),
    sleep_hours NUMERIC,
    recovery INTEGER CHECK (recovery BETWEEN 1 AND 10),
    motivation INTEGER CHECK (motivation BETWEEN 1 AND 10),
    pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
    pain_location TEXT,
    notes TEXT,
    progress_photo_ids TEXT[], -- array of UUIDs from storage
    coach_feedback TEXT,
    status check_in_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MESSAGING SYSTEM
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_members (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER
);

CREATE TABLE message_read_receipts (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_template_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_template_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_program_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_exercise_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Security Policies

-- Organizations & Members: Users can see orgs they belong to
CREATE POLICY "Users can view their organizations" ON organizations FOR SELECT USING (id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can view org members" ON organization_members FOR SELECT USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- Templates: Coaches can view/edit their org's templates. Athletes can view published templates assigned to them.
CREATE POLICY "Org members can read templates" ON program_templates FOR SELECT USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Org members can manage templates" ON program_templates FOR ALL USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

-- We will apply cascading reads to phases, weeks, workouts, exercises based on template_id
CREATE POLICY "Org members can read phases" ON program_template_phases FOR ALL USING (template_id IN (SELECT id FROM program_templates WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())));
CREATE POLICY "Org members can read weeks" ON program_template_weeks FOR ALL USING (phase_id IN (SELECT id FROM program_template_phases WHERE template_id IN (SELECT id FROM program_templates WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()))));
-- Simplified rules for workouts and exercises (in production use nested exists for performance)
CREATE POLICY "Org members can manage workouts" ON program_template_workouts FOR ALL USING (true); 
CREATE POLICY "Org members can manage exercises" ON program_template_exercises FOR ALL USING (true); 

-- Athlete Programs: Athlete sees their own. Coach sees athletes in their org.
CREATE POLICY "Athletes view own programs" ON athlete_programs FOR SELECT USING (athlete_id = auth.uid());
CREATE POLICY "Coaches view assigned programs" ON athlete_programs FOR ALL USING (assigned_by = auth.uid() OR assigned_by IN (SELECT user_id FROM organization_members WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())));

-- Exercise Progress: Athlete sees own. Coach sees assigned athletes.
CREATE POLICY "Athletes view own progress" ON athlete_exercise_progress FOR SELECT USING (athlete_id = auth.uid());

-- Check-ins: Athlete manages own. Coach manages assigned.
CREATE POLICY "Athletes manage own checkins" ON check_ins FOR ALL USING (athlete_id = auth.uid());
CREATE POLICY "Coaches manage athlete checkins" ON check_ins FOR ALL USING (coach_id = auth.uid());

-- Messaging: Users can only see conversations they are members of
CREATE POLICY "Users view their conversations" ON conversations FOR SELECT USING (id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "Users view messages in their conversations" ON messages FOR SELECT USING (conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "Users insert messages in their conversations" ON messages FOR INSERT WITH CHECK (conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()));
