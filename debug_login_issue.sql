-- Debug Login Issue - Check User Roles and Institutions
-- Run this in Supabase SQL Editor to diagnose authentication issues

-- 1. Check all users and their roles
SELECT 
    u.email,
    u.id as user_id,
    u.created_at as user_created,
    ur.role,
    ur.created_at as role_assigned,
    ia.institution_id,
    i.name as institution_name,
    i.status as institution_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
ORDER BY u.created_at DESC;

-- 2. Check for users without roles (these might have login issues)
SELECT 
    u.email,
    u.id as user_id,
    'NO_ROLE' as issue
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL;

-- 3. Check institution admins with inactive institutions
SELECT 
    u.email,
    u.id as user_id,
    ia.institution_id,
    i.name as institution_name,
    i.status as institution_status,
    'INACTIVE_INSTITUTION' as issue
FROM auth.users u
JOIN public.institution_admins ia ON u.id = ia.user_id
JOIN public.institutions i ON ia.institution_id = i.id
WHERE i.status != 'active';

-- 4. Check for orphaned institution_admins (institution doesn't exist)
SELECT 
    u.email,
    u.id as user_id,
    ia.institution_id,
    'ORPHANED_ADMIN' as issue
FROM auth.users u
JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
WHERE i.id IS NULL;

-- 5. Fix common issues - Add missing institution_admin roles for users who have institution_admins but no user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
    ia.user_id,
    'institution_admin'::text
FROM public.institution_admins ia
LEFT JOIN public.user_roles ur ON ia.user_id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET role = 'institution_admin';

-- 6. Verify the fix
SELECT 
    u.email,
    u.id as user_id,
    ur.role,
    ia.institution_id,
    i.name as institution_name,
    'FIXED' as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
WHERE ur.role = 'institution_admin'
ORDER BY u.created_at DESC;
