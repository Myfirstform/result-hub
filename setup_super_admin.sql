-- Create super admin user for first setup
-- Replace 'your-email@example.com' with the actual email of the super admin

-- First, get the user ID from auth.users
-- You'll need to run this in Supabase SQL editor:

-- 1. Find the user ID (replace with actual email)
SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- 2. Once you have the user ID, insert the super admin role (replace USER_ID with actual ID)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('USER_ID', 'super_admin');

-- 3. Verify the role was assigned
SELECT 
    u.email,
    ur.role,
    ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'your-email@example.com';
