-- Fix institution access issues for StudentResult page
-- This SQL will ensure all active institutions are accessible to the public

-- Step 1: Check current institution status
SELECT 
  id,
  name,
  slug,
  status,
  created_at,
  updated_at
FROM institutions 
ORDER BY created_at DESC;

-- Step 2: Check if there are any inactive institutions that should be active
SELECT 
  id,
  name,
  slug,
  status
FROM institutions 
WHERE status != 'active'
ORDER BY created_at DESC;

-- Step 3: Update all institutions to active status (if needed)
-- This will ensure markaz, darulhuda, najath are all active
UPDATE institutions 
SET status = 'active', 
    updated_at = NOW()
WHERE status != 'active';

-- Step 4: Verify all institutions are now active
SELECT 
  id,
  name,
  slug,
  status,
  updated_at
FROM institutions 
ORDER BY created_at DESC;

-- Step 5: Drop and recreate RLS policies for better access
-- Remove existing policies
DROP POLICY IF EXISTS "Super admins can do everything with institutions" ON public.institutions;
DROP POLICY IF EXISTS "Institution admins can view their own institution" ON public.institutions;
DROP POLICY IF EXISTS "Anon can view active institutions by slug" ON public.institutions;

-- Create new policies with better access
CREATE POLICY "Super admins can do everything with institutions"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Institution admins can view active institutions"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    (public.has_role(auth.uid(), 'institution_admin') AND status = 'active')
  );

CREATE POLICY "Public can view active institutions by slug"
  ON public.institutions FOR SELECT
  TO anon
  USING (status = 'active');

-- Step 6: Grant necessary permissions
GRANT ALL ON public.institutions TO authenticated;
GRANT SELECT ON public.institutions TO anon;

-- Step 7: Test the policies by checking what anon users can see
SELECT 
  id,
  name,
  slug,
  status
FROM institutions 
WHERE status = 'active'
ORDER BY name ASC;

-- Step 8: Verify specific institutions
SELECT 
  id,
  name,
  slug,
  status
FROM institutions 
WHERE slug IN ('markaz', 'darulhuda', 'najath')
ORDER BY name ASC;
