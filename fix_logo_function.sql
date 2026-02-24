-- Create a Supabase function to allow institution admins to update their logo
-- This bypasses RLS issues by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION update_institution_logo(
  p_institution_id UUID,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is an institution admin for this institution
  SELECT EXISTS(
    SELECT 1 FROM institution_admins 
    WHERE user_id = v_user_id 
    AND institution_id = p_institution_id
  ) INTO v_is_admin;
  
  -- Only allow update if user is admin
  IF v_is_admin THEN
    RETURN QUERY
    UPDATE institutions 
    SET logo_url = p_logo_url,
        updated_at = NOW()
    WHERE id = p_institution_id
    RETURNING institutions.id, institutions.name, institutions.logo_url, institutions.updated_at;
  ELSE
    RAISE EXCEPTION 'Permission denied: User is not an admin for this institution';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_institution_logo TO authenticated;
