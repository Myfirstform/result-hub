-- Fix for institution admin logo update permissions
-- The issue is that institution admins can SELECT but not UPDATE their institution

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can do everything with institutions" ON public.institutions;
DROP POLICY IF EXISTS "Institution admins can view their institution" ON public.institutions;
DROP POLICY IF EXISTS "Public can view active institutions by slug" ON public.institutions;

-- Create new policies that allow UPDATE for institution admins
CREATE POLICY "Super admins can do everything with institutions"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Institution admins can view and update their institution"
  ON public.institutions FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR 
    (public.has_role(auth.uid(), 'institution_admin') AND id IN (
      SELECT institution_id FROM institution_admins WHERE user_id = auth.uid()
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR 
    (public.has_role(auth.uid(), 'institution_admin') AND id IN (
      SELECT institution_id FROM institution_admins WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Public can view active institutions by slug"
  ON public.institutions FOR SELECT
  TO anon
  USING (status = 'active');

-- Grant necessary permissions
GRANT ALL ON public.institutions TO authenticated;
GRANT SELECT ON public.institutions TO anon;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'institutions' 
  AND schemaname = 'public'
ORDER BY policyname;
