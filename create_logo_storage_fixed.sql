-- Create storage bucket for institution logos (Fixed Version)
-- This SQL sets up the storage bucket and policies for logo uploads

-- Step 1: Create the storage bucket for institution logos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'institution-logos',
  'institution-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload institution logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update institution logos" ON storage.objects;
DROP POLICY IF EXISTS "Public access to institution logos" ON storage.objects;

-- Step 3: Create policies for logo management
CREATE POLICY "Users can upload institution logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'institution-logos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update institution logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'institution-logos' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'institution-logos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Public access to institution logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'institution-logos');

-- Step 4: Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Step 5: Verify bucket creation
SELECT * FROM storage.buckets WHERE id = 'institution-logos';

-- Step 6: Test policy creation
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
