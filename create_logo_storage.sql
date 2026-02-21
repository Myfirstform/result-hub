-- Create storage bucket for institution logos
-- This SQL sets up the storage bucket and policies for logo uploads

-- Step 1: Create the storage bucket for institution logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'institution-logos',
  'institution-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create policy to allow authenticated users to upload logos
CREATE POLICY "Users can upload institution logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'institution-logos' AND
  auth.role() = 'authenticated'
);

-- Step 3: Create policy to allow users to update their own institution logos
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

-- Step 4: Create policy to allow public access to logos (for student result page)
CREATE POLICY "Public access to institution logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'institution-logos');

-- Step 5: Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Verify bucket creation
SELECT * FROM storage.buckets WHERE id = 'institution-logos';
