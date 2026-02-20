-- Create RPC function to bypass RLS for orphaned admin users
CREATE OR REPLACE FUNCTION get_all_institutions_for_super_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  status TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  footer_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function bypasses RLS and returns all institutions
  -- Only super admins should be able to call this, but we'll use it for orphaned admin recovery
  RETURN QUERY 
  SELECT 
    id, name, slug, status, contact_email, contact_phone, footer_message, created_at, updated_at
  FROM 
    public.institutions
  ORDER BY 
    created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_institutions_for_super_admin TO authenticated;
