-- Create pass_marks table for managing subject pass marks
-- This table will store pass marks for each subject per class per institution

CREATE TABLE IF NOT EXISTS pass_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    class VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    pass_mark INTEGER NOT NULL CHECK (pass_mark >= 0 AND pass_mark <= 100),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of institution, class, and subject
    UNIQUE(institution_id, class, subject)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pass_marks_institution_class ON pass_marks(institution_id, class);
CREATE INDEX IF NOT EXISTS idx_pass_marks_subject ON pass_marks(subject);

-- Enable RLS (Row Level Security)
ALTER TABLE pass_marks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for institution admins to manage their own pass marks
-- Using institution_admins table to determine access
CREATE POLICY "Institution admins can manage their pass marks" ON pass_marks
    FOR ALL USING (
        institution_id IN (
            SELECT institution_id FROM institution_admins 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for authenticated users to view pass marks (for result display)
CREATE POLICY "Authenticated users can view pass marks" ON pass_marks
    FOR SELECT USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pass_marks_updated_at 
    BEFORE UPDATE ON pass_marks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON pass_marks TO authenticated;
GRANT SELECT ON pass_marks TO anon;

-- Sample data insertion removed - will be handled through the UI
-- You can add pass marks through the admin interface after uploading results

-- Verification query
SELECT 'Pass marks table created successfully' as status;
