-- Promote the two most likely coach accounts to role = 'coach'
-- "Head Coach" (f480fb83) and "Coach Dude" (18fd1a4e)
UPDATE public.profiles
SET role = 'coach'
WHERE id IN (
  'f480fb83-da32-4223-a58d-f9c6858cec0e',  -- Head Coach
  '18fd1a4e-2285-4d7b-8827-93bebc077e96'   -- Coach Dude
);

-- Verify
SELECT id, full_name, role FROM public.profiles ORDER BY role, full_name;
