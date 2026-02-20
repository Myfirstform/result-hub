-- Add created_by field to student_results to track which admin uploaded data
-- This will allow filtering by both institution and uploader

-- Step 1: Add created_by column to student_results
ALTER TABLE student_results 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 2: Create index for better performance
CREATE INDEX idx_student_results_created_by ON student_results(created_by);

-- Step 3: Update existing records to set created_by (optional - set to current institution admin)
-- This is a one-time migration to populate the field
UPDATE student_results 
SET created_by = (
  SELECT ia.user_id 
  FROM institution_admins ia 
  JOIN institutions i ON ia.institution_id = i.id 
  WHERE ia.institution_id = student_results.institution_id 
  LIMIT 1
)
WHERE created_by IS NULL
LIMIT 1000; -- Limit to avoid overwhelming the system

-- Step 4: Create RLS policy to allow admins to see their own uploads
DROP POLICY IF EXISTS "Institution admins can manage all results" ON public.student_results;

CREATE POLICY "Institution admins can manage their own results"
  ON public.student_results FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'institution_admin') AND (
      institution_id = public.get_institution_id_for_admin(auth.uid()) OR 
      created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'institution_admin') AND (
      institution_id = public.get_institution_id_for_admin(auth.uid()) OR 
      created_by = auth.uid()
    )
  );
