-- Ambagan Tracker: Full-Stack Feature Update
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Add individual_note column to friends table
ALTER TABLE friends
ADD COLUMN individual_note TEXT DEFAULT NULL;

-- 2. Create admin_notes table for global trip notes
CREATE TABLE IF NOT EXISTS admin_notes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Insert default admin_notes entry if table is empty
INSERT INTO admin_notes (content)
SELECT ''
WHERE NOT EXISTS (SELECT 1 FROM admin_notes);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- 5. Create policy to allow all users to read admin_notes
CREATE POLICY "Allow all to read admin_notes"
  ON admin_notes
  FOR SELECT
  USING (true);

-- 6. Create policy to allow all users to update admin_notes
CREATE POLICY "Allow all to update admin_notes"
  ON admin_notes
  FOR UPDATE
  USING (true);

-- 7. Create policy to allow all users to insert into admin_notes
CREATE POLICY "Allow all to insert admin_notes"
  ON admin_notes
  FOR INSERT
  WITH CHECK (true);

-- Done! Your database is now ready for the full-stack update.
