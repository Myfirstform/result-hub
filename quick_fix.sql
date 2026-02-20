-- Quick fix for orphaned admin user samnoon3200@gmail.com

-- Step 1: Find the user ID (run this first)
SELECT id, email FROM auth.users WHERE email = 'samnoon3200@gmail.com';

-- Step 2: Find an institution (run this second)  
SELECT id, name FROM institutions LIMIT 1;

-- Step 3: Create admin assignment (replace with actual IDs from above queries)
-- Replace 'USER_ID_FROM_STEP1' with the actual user ID
-- Replace 'INSTITUTION_ID_FROM_STEP2' with the actual institution ID
INSERT INTO institution_admins (user_id, institution_id) 
VALUES ('USER_ID_FROM_STEP1', 'INSTITUTION_ID_FROM_STEP2');

-- Step 4: Verify the assignment
SELECT 
  u.email,
  i.name as institution_name,
  ia.created_at as assignment_date
FROM auth.users u
JOIN institution_admins ia ON u.id = ia.user_id  
JOIN institutions i ON ia.institution_id = i.id
WHERE u.email = 'samnoon3200@gmail.com';
