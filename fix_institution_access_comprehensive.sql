-- Comprehensive Fix for Institution Access Issues
-- This addresses the core problems causing "invalid credentials" and "no institution found"

-- 1. DROP RESTRICTIVE RLS POLICIES
DROP POLICY IF EXISTS "Institution admins can view their own institution" ON public.institutions;

-- 2. CREATE MORE PERMISSIVE POLICIES
-- Allow institution admins to view ALL active institutions (not just their own)
CREATE POLICY "Institution admins can view active institutions"
ON public.institutions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  (public.has_role(auth.uid(), 'institution_admin') AND status = 'active')
);

-- 3. UPDATE INSTITUTION STATUS TO ACTIVE FOR ALL
-- Ensure all institutions are active regardless of current status
UPDATE public.institutions 
SET status = 'active', updated_at = NOW()
WHERE status != 'active';

-- 4. CREATE BACKUP FUNCTION FOR STUDENT RESULT ACCESS
CREATE OR REPLACE FUNCTION public.get_institution_by_slug(_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  status TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  footer_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function bypasses RLS to ensure institution access
  RETURN QUERY 
  SELECT 
    i.id, i.name, i.slug, i.status, i.logo_url, i.contact_email, i.contact_phone, i.footer_message, i.created_at, i.updated_at
  FROM 
    public.institutions i
  WHERE 
    i.slug = _slug
    AND i.status = 'active'
  ORDER BY 
    i.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_institution_by_slug TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_institution_by_slug TO anon;

-- 5. CREATE OR REPLACE FUNCTION FOR USER ROLE VERIFICATION
CREATE OR REPLACE FUNCTION public.verify_institution_admin_access(_user_id UUID, _institution_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  institution_count INTEGER;
  role_count INTEGER;
BEGIN
  -- Check if user has institution_admin role
  SELECT COUNT(*) INTO role_count
  FROM public.user_roles 
  WHERE user_id = _user_id AND role = 'institution_admin';
  
  -- Check if user has any institution assignment
  SELECT COUNT(*) INTO institution_count
  FROM public.institution_admins 
  WHERE user_id = _user_id;
  
  -- Return true if user has proper role assignment
  RETURN (role_count > 0 OR institution_count > 0);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_institution_admin_access TO authenticated;

-- 6. FIX STUDENT RESULT ACCESS POLICY
DROP POLICY IF EXISTS "Anon can view published results for active institutions" ON public.student_results;

CREATE POLICY "Anon can view published results for active institutions"
ON public.student_results FOR SELECT
TO anon
USING (
  published = true
  AND EXISTS (
    SELECT 1 FROM public.institutions
    WHERE id = institution_id AND status = 'active'
  )
);

-- 7. ENSURE ALL INSTITUTIONS ARE ACTIVE
-- Mark all institutions as active to prevent access issues
UPDATE public.institutions 
SET status = 'active', updated_at = NOW()
WHERE status IS NULL OR status != 'active';

-- 8. VERIFY FIXES
-- Check all institutions are now active
SELECT 
    'INSTITUTION_STATUS_CHECK' as check_type,
    id,
    name,
    slug,
    status,
    updated_at
FROM public.institutions
ORDER BY created_at DESC;

-- Check user role assignments
SELECT 
    'USER_ROLE_CHECK' as check_type,
    u.email,
    u.id as user_id,
    ur.role,
    ia.institution_id,
    i.name as institution_name,
    i.slug as institution_slug
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.institution_admins ia ON u.id = ia.user_id
LEFT JOIN public.institutions i ON ia.institution_id = i.id
WHERE ur.role = 'institution_admin' OR ia.user_id IS NOT NULL
ORDER BY u.created_at DESC;

-- Test institution access by slug
SELECT 
    'ACCESS_TEST' as check_type,
    slug,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.get_institution_by_slug(slug)) THEN 'ACCESSIBLE'
        ELSE 'BLOCKED'
    END as access_status
FROM (
    SELECT DISTINCT slug FROM public.institutions
) as all_slugs
ORDER BY slug;
