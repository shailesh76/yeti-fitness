SELECT au.email, p.full_name, p.role
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
WHERE p.role = 'coach'
ORDER BY p.full_name;
