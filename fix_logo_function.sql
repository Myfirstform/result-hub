-- Create a Supabase function to allow institution admins to update their logo
-- This bypasses RLS issues by using SECURITY DEFINER

-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS update_institution_logo(uuid, text);

CREATE OR REPLACE FUNCTION update_institution_logo(
  p_institution_id UUID,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_result JSON;
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
    SELECT json_build_object(
      'id', id,
      'name', name,
      'logo_url', logo_url,
      'updated_at', updated_at
    ) INTO v_result
    FROM institutions 
    WHERE id = p_institution_id;
    
    UPDATE institutions 
    SET logo_url = p_logo_url,
        updated_at = NOW()
    WHERE id = p_institution_id;
    
    RETURN v_result;
  ELSE
    RAISE EXCEPTION 'Permission denied: User is not an admin for this institution';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_institution_logo TO authenticated;
