-- PRODUCTION READINESS (V2)
-- Event Layer, Queues, Analytics, Feature Flags, and Media

-- 1. DOMAIN EVENTS
CREATE TABLE domain_events (
    id UUID PRIMARY KEY, -- maps to event_id
    event_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    organization_id UUID,
    user_id UUID,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    attempts INTEGER DEFAULT 0,
    correlation_id TEXT,
    version INTEGER DEFAULT 1,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Handler tracking (for partial failures)
CREATE TABLE domain_event_handlers (
    event_id UUID REFERENCES domain_events(id) ON DELETE CASCADE,
    handler_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    failed_reason TEXT,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, handler_name)
);

-- 2. NOTIFICATION QUEUE
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'push', 'email', 'in_app'
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    send_after TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ANALYTICS & PRIVACY
CREATE TABLE analytics_consents (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tracking_enabled BOOLEAN DEFAULT true,
    marketing_enabled BOOLEAN DEFAULT false,
    health_data_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    event_name TEXT NOT NULL,
    properties JSONB,
    platform TEXT,
    app_version TEXT,
    device_model TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Optimized index for time-series queries
CREATE INDEX idx_analytics_events_name_time ON analytics_events(event_name, created_at);

-- 4. FEATURE FLAGS
CREATE TABLE feature_flags (
    key TEXT PRIMARY KEY,
    description TEXT,
    rollout_rules JSONB, -- { "percentage": 20, "platform": "ios" }
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AI COST TRACKING
CREATE TABLE ai_cost_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL, -- 'openai', 'anthropic'
    model TEXT NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    estimated_cost NUMERIC, -- stored in USD cents
    organization_id UUID,
    user_id UUID,
    feature_name TEXT, -- e.g. 'workout_insight', 'chat'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEDIA PIPELINE
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID,
    original_file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT,
    status TEXT DEFAULT 'uploaded', -- uploaded, scanning, processing, ready, failed
    is_safe BOOLEAN, -- virus scan result
    metadata JSONB, -- dimensions, duration, etc
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    organization_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    correlation_id TEXT,
    request_id TEXT,
    session_id TEXT,
    platform TEXT,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add strict insert-only rule for Audit Logs
CREATE POLICY "Audit Logs are Insert Only" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Nobody can update Audit Logs" ON audit_logs FOR UPDATE USING (false);
CREATE POLICY "Nobody can delete Audit Logs" ON audit_logs FOR DELETE USING (false);
