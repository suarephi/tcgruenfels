-- Contact form submissions from the public homepage.
-- Run in Supabase SQL Editor before deploying the homepage.

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'membership')),
  membership_type TEXT CHECK (membership_type IN ('einzel', 'familie')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent migrations for existing tables.
ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS membership_type TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_messages_type_check'
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT contact_messages_type_check
      CHECK (type IN ('general', 'membership'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contact_messages_membership_type_check'
  ) THEN
    ALTER TABLE contact_messages
      ADD CONSTRAINT contact_messages_membership_type_check
      CHECK (membership_type IS NULL OR membership_type IN ('einzel', 'familie'));
  END IF;
END $$;

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Only admins may read/manage. Inserts go through the API route using the
-- service role key, which bypasses RLS — anonymous insert policy is not needed.
CREATE POLICY "Admins read contact messages" ON contact_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins delete contact messages" ON contact_messages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
