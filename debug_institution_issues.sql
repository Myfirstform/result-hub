-- Comprehensive Institution Debug Script
-- Run this in Supabase SQL Editor to diagnose institution access issues

-- 1. Check all institutions and their status
SELECT 
    i.id,
    i.name,
    i.slug,
    i.status,
    i.contact_email,
    i.created_at,
    'INSTITUTION_STATUS' as check_type
FROM public.institutions i
ORDER BY i.created_at DESC;

-- 2. Check all users and their institution assignments
SELECT 
    u.email,
    u.id as user_id,
    u.created_at as user_created,
    ur.role,
    ur.created_at as role_assigned,
    ia.institution_id,
    i.name as institution_name,
    i.slug as institution_slug,
    i.status as institution_status,
    'USER_INSTITUTION_MAPPING' as check_type
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
ORDER BY u.created_at DESC;

-- 3. Check for institution admins without proper role assignments
SELECT 
    u.email,
    u.id as user_id,
    ia.institution_id,
    i.name as institution_name,
    i.slug as institution_slug,
    i.status as institution_status,
    'ORPHANED_ADMIN' as issue_type
FROM auth.users u
JOIN public.institution_admins ia ON u.id = ia.user_id
JOIN public.institutions i ON ia.institution_id = i.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL;

-- 4. Check for users with roles but no institution assignment
SELECT 
    u.email,
    u.id as user_id,
    ur.role,
    'ROLE_WITHOUT_INSTITUTION' as issue_type
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
WHERE ur.role = 'institution_admin' 
AND ia.user_id IS NULL;

-- 5. Check RLS policies that might be blocking access
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check,
    'RLS_POLICY' as check_type
FROM pg_policies 
WHERE tablename IN ('institutions', 'user_roles', 'institution_admins', 'student_results')
ORDER BY tablename, policyname;

-- 6. Test institution access with different slugs
SELECT 
    'TEST_ACCESS' as test_type,
    slug,
    CASE 
        WHEN slug IS NOT NULL THEN 'SLUG_EXISTS'
        ELSE 'SLUG_MISSING'
    END as slug_status,
    CASE 
        WHEN status = 'active' THEN 'ACTIVE'
        WHEN status = 'suspended' THEN 'SUSPENDED'
        ELSE 'UNKNOWN_STATUS'
    END as status_check
FROM (
    SELECT DISTINCT slug, status
    FROM public.institutions
) as inst_check;

-- 7. Check for duplicate slugs (might cause routing conflicts)
SELECT 
    slug,
    COUNT(*) as slug_count,
    'DUPLICATE_SLUG' as issue_type
FROM public.institutions
GROUP BY slug
HAVING COUNT(*) > 1;

-- 8. Fix common issues - Create missing user_roles for institution admins
INSERT INTO public.user_roles (user_id, role)
SELECT 
    ia.user_id,
    'institution_admin'::text
FROM public.institution_admins ia
LEFT JOIN public.user_roles ur ON ia.user_id = ur.user_id
WHERE ur.user_id IS NULL
AND EXISTS (
    SELECT 1 FROM public.institutions i 
    WHERE i.id = ia.institution_id 
    AND i.status = 'active'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'institution_admin';

-- 9. Verify fixes applied
SELECT 
    u.email,
    u.id as user_id,
    ur.role,
    ia.institution_id,
    i.name as institution_name,
    i.slug as institution_slug,
    i.status as institution_status,
    'FIXED' as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
WHERE ur.role = 'institution_admin'
OR EXISTS (SELECT 1 FROM public.institution_admins WHERE user_id = u.id)
ORDER BY u.created_at DESC;
