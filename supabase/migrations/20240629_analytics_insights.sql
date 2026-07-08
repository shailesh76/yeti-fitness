-- Create weight_logs table
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create weekly_analytics table
CREATE TABLE IF NOT EXISTS weekly_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  avg_calories INTEGER DEFAULT 0,
  avg_protein INTEGER DEFAULT 0,
  workout_count INTEGER DEFAULT 0,
  total_volume NUMERIC DEFAULT 0,
  weight_change_kg NUMERIC(4,2) DEFAULT 0.00,
  UNIQUE(user_id, week_start_date)
);

-- Create health_insights table
CREATE TABLE IF NOT EXISTS health_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  insight_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Update profiles table to store dynamic, adaptive targets
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_calorie_target INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_protein_target INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_carb_target INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_fat_target INT;

-- Enable RLS
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;

-- Policies for weight_logs
CREATE POLICY "Users can manage their own weight logs"
  ON weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view weight logs"
  ON weight_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for weekly_analytics
CREATE POLICY "Users can view their own weekly analytics"
  ON weekly_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view weekly analytics"
  ON weekly_analytics FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policies for health_insights
CREATE POLICY "Users can view their own health insights"
  ON health_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coaches can view health insights"
  ON health_insights FOR SELECT
  USING (auth.role() = 'authenticated');

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'weight_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE weight_logs;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    JOIN pg_publication p ON pr.prpubid = p.oid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'health_insights'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE health_insights;
  END IF;
END $$;
