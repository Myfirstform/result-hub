  -- Comprehensive fix for logo persistence and display issues (Fixed Version)
  -- This SQL will diagnose and fix all logo-related problems

  -- Step 1: Check if logo_url column exists and add if missing
  ALTER TABLE institutions 
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

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

  -- Step 3: Ensure storage bucket exists
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'institution-logos',
    'institution-logos',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  ) ON CONFLICT (id) DO NOTHING;

  -- Step 4: Drop and recreate storage policies to fix conflicts
  DROP POLICY IF EXISTS "Users can upload institution logos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update institution logos" ON storage.objects;
  DROP POLICY IF EXISTS "Public access to institution logos" ON storage.objects;

  -- Create new storage policies
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

  -- Step 5: Fix RLS policies for institutions - Drop existing first
  DROP POLICY IF EXISTS "Super admins can do everything with institutions" ON public.institutions;
  DROP POLICY IF EXISTS "Institution admins can view their institution" ON public.institutions;
  DROP POLICY IF EXISTS "Public can view active institutions by slug" ON public.institutions;

  -- Create new policies
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

  -- Step 6: Grant necessary permissions
  GRANT ALL ON storage.buckets TO authenticated;
  GRANT ALL ON storage.objects TO authenticated;
  GRANT SELECT ON storage.objects TO anon;
  GRANT ALL ON public.institutions TO authenticated;
  GRANT SELECT ON public.institutions TO anon;

  -- Step 7: Verify setup
  SELECT 
    'Institutions with logos' as check_type,
    COUNT(*) as count,
    COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END) as with_logos
  FROM institutions
  WHERE status = 'active'

  UNION ALL

  SELECT 
    'Storage bucket exists' as check_type,
    COUNT(*) as count,
    0 as with_logos
  FROM storage.buckets 
  WHERE id = 'institution-logos'

  UNION ALL

  SELECT 
    'Storage objects (logos)' as check_type,
    COUNT(*) as count,
    0 as with_logos
  FROM storage.objects 
  WHERE bucket_id = 'institution-logos';

  -- Step 8: Test public access to logos
  SELECT 
    bucket_id,
    name,
    created_at
  FROM storage.objects 
  WHERE bucket_id = 'institution-logos'
  ORDER BY created_at DESC
  LIMIT 5;

  -- Step 9: Verify policies were created successfully
  SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
  FROM pg_policies 
  WHERE tablename IN ('institutions', 'objects') 
    AND schemaname IN ('public', 'storage')
  ORDER BY tablename, policyname;
