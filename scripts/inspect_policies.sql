SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
