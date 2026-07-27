-- ============================================================================
-- 20260727_add_food_favorites.sql
-- ============================================================================
-- Per-user favorite foods for quick re-logging (beta usability).
--
-- Offline-first: the mobile app keeps a per-user AsyncStorage list as the
-- authoritative UI source and best-effort mirrors it here; this table is the
-- cross-device source of truth once applied. RLS restricts every row to its
-- owner so a user can only ever see or change their own favorites.
--
-- `food_id` deliberately has NO foreign key to public.foods: custom foods are
-- created offline with client-generated UUIDs and may be favorited before they
-- have synced to the foods table. The client resolves food details from its own
-- cache, so a dangling id is harmless.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.food_favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id    UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_food_favorites_user ON public.food_favorites(user_id);

ALTER TABLE public.food_favorites ENABLE ROW LEVEL SECURITY;

-- Each user may only read / insert / delete their OWN favorites.
DROP POLICY IF EXISTS "food_favorites_select_own" ON public.food_favorites;
CREATE POLICY "food_favorites_select_own" ON public.food_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_favorites_insert_own" ON public.food_favorites;
CREATE POLICY "food_favorites_insert_own" ON public.food_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_favorites_delete_own" ON public.food_favorites;
CREATE POLICY "food_favorites_delete_own" ON public.food_favorites
  FOR DELETE USING (auth.uid() = user_id);
