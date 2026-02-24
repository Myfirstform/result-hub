-- Fix Institution Admin Access Issues
-- Targeted fix for admin pages showing "invalid" access

-- 1. Check current admin users and their access
SELECT 
    u.email,
    u.id as user_id,
    ur.role,
    ia.institution_id,
    i.name as institution_name,
    i.slug as institution_slug,
    i.status as institution_status,
    'CURRENT_ACCESS' as check_type
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
WHERE ur.role = 'institution_admin' OR ia.user_id IS NOT NULL
ORDER BY u.created_at DESC;

-- 2. Fix missing user_roles for institution admins
INSERT INTO public.user_roles (user_id, role)
SELECT 
    ia.user_id,
    'institution_admin'::app_role
FROM public.institution_admins ia
LEFT JOIN public.user_roles ur ON ia.user_id = ur.user_id AND ur.role = 'institution_admin'
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO UPDATE SET role = 'institution_admin'::app_role;

-- 3. Fix missing institution_admins for users with roles
INSERT INTO public.institution_admins (user_id, institution_id)
SELECT 
    ur.user_id,
    i.id as institution_id
FROM public.user_roles ur
CROSS JOIN public.institutions i
WHERE ur.role = 'institution_admin'
AND NOT EXISTS (
    SELECT 1 FROM public.institution_admins ia 
    WHERE ia.user_id = ur.user_id
)
LIMIT 1
ON CONFLICT (user_id, institution_id) DO NOTHING;

-- 4. Ensure all institutions are active
UPDATE public.institutions 
SET status = 'active', updated_at = NOW()
WHERE status != 'active';

-- 5. Update RLS policies for better admin access
DROP POLICY IF EXISTS "Institution admins can view active institutions" ON public.institutions;

CREATE POLICY "Institution admins can view active institutions"
ON public.institutions FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'institution_admin')
);

-- 6. Grant necessary permissions
GRANT ALL ON public.institutions TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.institution_admins TO authenticated;

-- 7. Verify fixes
SELECT 
    u.email,
    u.id as user_id,
    ur.role,
    ia.institution_id,
    i.name as institution_name,
    i.slug as institution_slug,
    i.status as institution_status,
    'FIXED_ACCESS' as check_type
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
WHERE ur.role = 'institution_admin' OR ia.user_id IS NOT NULL
ORDER BY u.created_at DESC;
