-- Check current logo setup in database
-- This will help diagnose what's missing

-- Step 1: Check if logo_url column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'institutions' AND column_name = 'logo_url';

-- Step 2: Check current institutions and their logo URLs
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

-- Step 3: Check if storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'institution-logos';

-- Step 4: Check storage objects (uploaded logos)
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

-- Step 5: Check RLS policies for institutions
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
