-- Check if there are any users with roles
SELECT 
    u.email,
    u.id as user_id,
    ur.role,
    ia.institution_id,
    i.name as institution_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
ORDER BY u.created_at DESC;
