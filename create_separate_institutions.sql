-- Create separate institutions for each admin to avoid data sharing
-- This will create a new institution for the second admin

-- Step 1: Create new institution for samnoon3200@gmail.com
INSERT INTO institutions (name, slug, contact_email, contact_phone, status, created_at, updated_at)
VALUES (
  'Second Institution', 
  'second-institution', 
  'contact@second.com', 
  '1234567890', 
  'active', 
  NOW(), 
  NOW()
);

-- Step 2: Get the new institution ID
SELECT id, name FROM institutions WHERE slug = 'second-institution';

-- Step 3: Update the admin assignment to point to new institution
-- First, find the current assignment
SELECT user_id, institution_id FROM institution_admins WHERE user_id = '53d6420b-c5ff-4a3f-95f6-cdfd5920315e';

-- Then update to new institution (replace NEW_INSTITUTION_ID with actual ID from step 2)
UPDATE institution_admins 
SET institution_id = 'NEW_INSTITUTION_ID_HERE'
WHERE user_id = '53d6420b-c5ff-4a3f-95f6-cdfd5920315e';

-- Step 4: Verify the separation
SELECT 
  u.email,
  i.name as institution_name,
  ia.created_at as assignment_date
FROM auth.users u
JOIN institution_admins ia ON u.id = ia.user_id  
JOIN institutions i ON ia.institution_id = i.id
WHERE u.email IN ('aslammuhyudheen@gmail.com', 'samnoon3200@gmail.com')
ORDER BY u.email;
