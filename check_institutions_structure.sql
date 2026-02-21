-- Check the structure of the institutions table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'institutions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
