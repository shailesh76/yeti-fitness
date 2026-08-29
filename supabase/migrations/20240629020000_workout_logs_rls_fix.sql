-- Allow users to delete their own workout logs (needed for cancelSession cleanup)
DROP POLICY IF EXISTS "Users can delete their own workout logs." ON workout_logs;
CREATE POLICY "Users can delete their own workout logs."
  ON workout_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Allow all authenticated users to view workout logs (needed for coach roster)
DROP POLICY IF EXISTS "Authenticated users can view all workout logs." ON workout_logs;
CREATE POLICY "Authenticated users can view all workout logs."
  ON workout_logs FOR SELECT
  USING (auth.role() = 'authenticated');
