-- Phase 2.4 Messaging & Notifications Schema Setup

-- 1. Extend conversations table with athlete_id and coach_id for direct pairing
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add database unique constraint to prevent duplicate direct conversations per coach-athlete pair
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS unique_athlete_coach_conversation;
ALTER TABLE public.conversations ADD CONSTRAINT unique_athlete_coach_conversation UNIQUE (athlete_id, coach_id);

-- 2. Extend notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Add performance indexes for messaging
CREATE INDEX IF NOT EXISTS idx_conversations_athlete_coach ON public.conversations(athlete_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON public.conversation_members(user_id);
