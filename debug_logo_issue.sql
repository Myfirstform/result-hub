-- Debug and fix logo issues
-- This SQL will help diagnose and fix logo display problems

-- Step 1: Check if logo_url column exists in institutions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'institutions' AND column_name = 'logo_url';

-- Step 2: Add logo_url column if it doesn't exist
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Step 3: Check current institutions and their logo URLs
SELECT 
  id,
  name,
  slug,
  status,
  logo_url,
  CASE 
    WHEN logo_url IS NULL THEN 'No logo'
    WHEN logo_url = '' THEN 'Empty logo'
    ELSE 'Has logo'
  END as logo_status
FROM institutions 
ORDER BY created_at DESC;

-- Step 4: Check RLS policies for institutions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'institutions' AND schemaname = 'public';

-- Step 5: Check if storage bucket exists and is accessible
SELECT * FROM storage.buckets WHERE id = 'institution-logos';

-- Step 6: Check storage objects (uploaded logos)
SELECT 
  id,
  bucket_id,
  name,
  created_at,
  updated_at,
  metadata
FROM storage.objects 
WHERE bucket_id = 'institution-logos'
ORDER BY created_at DESC;

-- Step 7: Test public access to storage objects
SELECT 
  bucket_id,
  name,
  public_url
FROM storage.objects 
WHERE bucket_id = 'institution-logos'
LIMIT 5;

-- Step 8: Fix RLS policies for institutions to ensure logo_url is accessible
-- Drop existing policies if they block logo_url access
DROP POLICY IF EXISTS "Super admins can do everything with institutions" ON public.institutions;
DROP POLICY IF EXISTS "Institution admins can view active institutions" ON public.institutions;
DROP POLICY IF EXISTS "Public can view active institutions by slug" ON public.institutions;

-- Create new policies that allow logo_url access
CREATE POLICY "Super admins can do everything with institutions"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Institution admins can view their institution"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    (public.has_role(auth.uid(), 'institution_admin') AND id IN (
      SELECT institution_id FROM institution_admins WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Public can view active institutions by slug"
  ON public.institutions FOR SELECT
  TO anon
  USING (status = 'active');

-- Step 9: Grant permissions
GRANT ALL ON public.institutions TO authenticated;
GRANT SELECT ON public.institutions TO anon;

-- Step 10: Verify the fix
SELECT 
  id,
  name,
  slug,
  status,
  logo_url
FROM institutions 
WHERE status = 'active'
ORDER BY name ASC;
