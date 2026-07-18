-- Phase 2 Experience & Intelligence Database Migration

-- 1. Extend public.session_sets to align with local WatermelonDB schema
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS exercise_name TEXT;
ALTER TABLE public.session_sets ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;

-- 2. Extend public.ai_memory to support categories and updated_at
ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.ai_memory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Apply updated_at trigger to ai_memory
DROP TRIGGER IF EXISTS trigger_ai_memory_updated_at ON public.ai_memory;
CREATE TRIGGER trigger_ai_memory_updated_at
BEFORE UPDATE ON public.ai_memory
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 3. Row Level Security for public.ai_memory
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own ai_memory" ON public.ai_memory;
CREATE POLICY "Users can manage their own ai_memory" 
  ON public.ai_memory FOR ALL 
  USING (auth.uid() = athlete_id) 
  WITH CHECK (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Coaches can view client ai_memory" ON public.ai_memory;
CREATE POLICY "Coaches can view client ai_memory" 
  ON public.ai_memory FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc 
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = ai_memory.athlete_id
    )
  );

-- 4. Row Level Security for public.conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
CREATE POLICY "Members can view conversations" 
  ON public.conversations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm 
      WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can manage client conversations" ON public.conversations;
CREATE POLICY "Coaches can manage client conversations" 
  ON public.conversations FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm 
      JOIN public.coach_clients cc ON cc.athlete_id = cm.user_id 
      WHERE cm.conversation_id = id AND cc.coach_id = auth.uid()
    )
  );

-- 5. Row Level Security for public.conversation_members
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view members of their conversations" ON public.conversation_members;
CREATE POLICY "Users can view members of their conversations" 
  ON public.conversation_members FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.conversation_members cm 
      WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can view members of client conversations" ON public.conversation_members;
CREATE POLICY "Coaches can view members of client conversations" 
  ON public.conversation_members FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients cc 
      WHERE cc.coach_id = auth.uid() AND cc.athlete_id = conversation_members.user_id
    )
  );

DROP POLICY IF EXISTS "Members can join conversations" ON public.conversation_members;
CREATE POLICY "Members can join conversations" 
  ON public.conversation_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 6. Row Level Security for public.messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read messages" ON public.messages;
CREATE POLICY "Members can read messages" 
  ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members cm 
      WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can post messages" ON public.messages;
CREATE POLICY "Members can post messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (
      SELECT 1 FROM public.conversation_members cm 
      WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
    )
  );

-- 7. Activate Supabase Realtime for Messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_class c ON pr.prrelid = c.oid 
      JOIN pg_publication p ON pr.prpubid = p.oid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;
END $$;
