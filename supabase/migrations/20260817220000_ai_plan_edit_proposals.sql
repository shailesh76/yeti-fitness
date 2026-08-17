-- Migration: 20260817220000_ai_plan_edit_proposals.sql
-- Description: Durable server-side proposal table and transactional RPCs for AI Coach workout plan edits.

CREATE TABLE IF NOT EXISTS public.ai_plan_edit_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    plan_day_id UUID REFERENCES public.plan_days(id) ON DELETE CASCADE,
    target_plan_exercise_id UUID REFERENCES public.plan_exercises(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('add', 'remove', 'replace', 'move', 'update_sets_reps', 'update_rest')),
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    replacement_exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    sets TEXT,
    reps TEXT,
    rest_seconds INTEGER,
    target_order_index INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    applied_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    raw_prompt TEXT,
    plan_name_snapshot TEXT,
    day_name_snapshot TEXT,
    exercise_name_snapshot TEXT,
    replacement_exercise_name_snapshot TEXT
);

CREATE INDEX IF NOT EXISTS ai_plan_edit_proposals_athlete_status_idx ON public.ai_plan_edit_proposals(athlete_id, status);
CREATE INDEX IF NOT EXISTS ai_plan_edit_proposals_expires_at_idx ON public.ai_plan_edit_proposals(expires_at);
CREATE INDEX IF NOT EXISTS ai_plan_edit_proposals_target_pe_idx ON public.ai_plan_edit_proposals(target_plan_exercise_id);

ALTER TABLE public.ai_plan_edit_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes view own plan edit proposals" ON public.ai_plan_edit_proposals;
CREATE POLICY "Athletes view own plan edit proposals" ON public.ai_plan_edit_proposals
    FOR SELECT USING (auth.uid() = athlete_id);

-- ─── Transactional Plan Edit Confirmation RPC ────────────────────────────────
-- Executes proposal validation, workout mutation, and proposal status update
-- in a single atomic transaction.
CREATE OR REPLACE FUNCTION public.execute_ai_plan_edit_proposal(
    p_proposal_id UUID,
    p_athlete_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_proposal RECORD;
    v_plan RECORD;
    v_day RECORD;
    v_target RECORD;
    v_next_order INTEGER;
    v_message TEXT;
    v_day_label TEXT;
BEGIN
    -- 1. Lock and select proposal
    SELECT * INTO v_proposal
    FROM public.ai_plan_edit_proposals
    WHERE id = p_proposal_id
      AND athlete_id = p_athlete_id
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Inspect non-pending/expired state
        SELECT * INTO v_proposal
        FROM public.ai_plan_edit_proposals
        WHERE id = p_proposal_id
          AND athlete_id = p_athlete_id;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'reason', 'not_found', 'message', 'Proposal not found.');
        END IF;

        IF v_proposal.status = 'applied' THEN
            RETURN jsonb_build_object('success', true, 'reason', 'already_applied', 'message', 'This plan change has already been applied.');
        ELSIF v_proposal.status = 'cancelled' THEN
            RETURN jsonb_build_object('success', false, 'reason', 'cancelled', 'message', 'This change proposal was cancelled and cannot be applied.');
        ELSIF v_proposal.expires_at <= NOW() THEN
            RETURN jsonb_build_object('success', false, 'reason', 'expired', 'message', 'This change proposal has expired. Please ask for the change again.');
        ELSE
            RETURN jsonb_build_object('success', false, 'reason', 'db_error', 'message', 'Unable to apply plan change.');
        END IF;
    END IF;

    -- 2. Revalidate plan ownership
    SELECT id, name, user_id INTO v_plan
    FROM public.workout_plans
    WHERE id = v_proposal.plan_id
      AND user_id = p_athlete_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'proposal_stale', 'message', 'The target workout plan no longer exists.');
    END IF;

    -- 3. Revalidate plan day
    SELECT id, day_number, name INTO v_day
    FROM public.plan_days
    WHERE id = v_proposal.plan_day_id
      AND plan_id = v_plan.id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'proposal_stale', 'message', 'The target workout day no longer exists in your plan.');
    END IF;

    v_day_label := COALESCE(v_day.name, 'Day ' || v_day.day_number);

    -- 4. Execute atomic mutation
    IF v_proposal.action = 'add' THEN
        -- Check if already present on this day
        IF NOT EXISTS (
            SELECT 1 FROM public.plan_exercises
            WHERE plan_day_id = v_day.id
              AND exercise_id = v_proposal.exercise_id
        ) THEN
            SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_next_order
            FROM public.plan_exercises
            WHERE plan_day_id = v_day.id;

            INSERT INTO public.plan_exercises (
                plan_day_id,
                exercise_id,
                order_index,
                sets,
                reps,
                rest_seconds
            ) VALUES (
                v_day.id,
                v_proposal.exercise_id,
                v_next_order,
                COALESCE(v_proposal.sets, '3'),
                COALESCE(v_proposal.reps, '10-12'),
                COALESCE(v_proposal.rest_seconds, 90)
            );
        END IF;

        v_message := COALESCE(v_proposal.exercise_name_snapshot, 'Exercise') || ' added to ' || v_day_label || '.';

    ELSE
        -- Locate specific target exercise row (exact plan_exercise_id preferred)
        IF v_proposal.target_plan_exercise_id IS NOT NULL THEN
            SELECT * INTO v_target
            FROM public.plan_exercises
            WHERE id = v_proposal.target_plan_exercise_id;
        ELSE
            SELECT pe.* INTO v_target
            FROM public.plan_exercises pe
            JOIN public.plan_days pd ON pd.id = pe.plan_day_id
            WHERE pd.plan_id = v_plan.id
              AND pe.exercise_id = v_proposal.exercise_id
            LIMIT 1;
        END IF;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'reason', 'proposal_stale', 'message', '"' || COALESCE(v_proposal.exercise_name_snapshot, 'Exercise') || '" is no longer in your workout plan.');
        END IF;

        IF v_proposal.action = 'remove' THEN
            DELETE FROM public.plan_exercises WHERE id = v_target.id;
            v_message := COALESCE(v_proposal.exercise_name_snapshot, 'Exercise') || ' removed from ' || v_day_label || '.';

        ELSIF v_proposal.action = 'replace' THEN
            UPDATE public.plan_exercises
            SET exercise_id = v_proposal.replacement_exercise_id
            WHERE id = v_target.id;
            v_message := COALESCE(v_proposal.exercise_name_snapshot, 'Exercise') || ' replaced with ' || COALESCE(v_proposal.replacement_exercise_name_snapshot, 'replacement exercise') || '.';

        ELSIF v_proposal.action = 'move' THEN
            UPDATE public.plan_exercises
            SET plan_day_id = v_day.id
            WHERE id = v_target.id;
            v_message := COALESCE(v_proposal.exercise_name_snapshot, 'Exercise') || ' moved to ' || v_day_label || '.';

        ELSIF v_proposal.action = 'update_sets_reps' THEN
            UPDATE public.plan_exercises
            SET sets = COALESCE(v_proposal.sets, sets),
                reps = COALESCE(v_proposal.reps, reps)
            WHERE id = v_target.id;
            v_message := COALESCE(v_proposal.exercise_name_snapshot, 'Exercise') || ' updated to ' || COALESCE(v_proposal.sets, v_target.sets) || ' sets × ' || COALESCE(v_proposal.reps, v_target.reps) || ' reps.';

        ELSIF v_proposal.action = 'update_rest' THEN
            UPDATE public.plan_exercises
            SET rest_seconds = COALESCE(v_proposal.rest_seconds, rest_seconds)
            WHERE id = v_target.id;
            v_message := COALESCE(v_proposal.exercise_name_snapshot, 'Exercise') || ' rest time updated to ' || v_proposal.rest_seconds || ' seconds.';
        END IF;
    END IF;

    -- 5. Mark proposal applied atomically
    UPDATE public.ai_plan_edit_proposals
    SET status = 'applied',
        applied_at = NOW()
    WHERE id = v_proposal.id;

    RETURN jsonb_build_object(
        'success', true,
        'action', v_proposal.action,
        'planName', v_plan.name,
        'message', v_message
    );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.execute_ai_plan_edit_proposal(UUID, UUID) TO service_role;

-- ─── Transactional Plan Edit Cancellation RPC ────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_ai_plan_edit_proposal(
    p_proposal_id UUID,
    p_athlete_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.ai_plan_edit_proposals
    SET status = 'cancelled',
        cancelled_at = NOW()
    WHERE id = p_proposal_id
      AND athlete_id = p_athlete_id
      AND status = 'pending';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Change cancelled. Your workout plan wasn''t modified.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_ai_plan_edit_proposal(UUID, UUID) TO service_role;
