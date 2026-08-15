-- Allow users to delete their own workout logs (needed for cancelSession cleanup)
CREATE POLICY IF NOT EXISTS "Users can delete their own workout logs."
  ON workout_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Allow all authenticated users to view workout logs (needed for coach roster)
CREATE POLICY IF NOT EXISTS "Authenticated users can view all workout logs."
  ON workout_logs FOR SELECT
  USING (auth.role() = 'authenticated');
