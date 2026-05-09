-- Credential Verification System - Database Schema
-- Copy and paste this into Lovable's SQL editor to set up the database

-- Create credentials table
CREATE TABLE counsellor_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL REFERENCES counsellor_details(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('degree', 'license', 'certification', 'work_experience')),
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  issuer_name TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_counsellor_credentials_counsellor ON counsellor_credentials(counsellor_id);
CREATE INDEX idx_counsellor_credentials_status ON counsellor_credentials(verification_status);
CREATE INDEX idx_counsellor_credentials_created ON counsellor_credentials(created_at DESC);
CREATE INDEX idx_counsellor_credentials_type ON counsellor_credentials(credential_type);

-- Enable RLS
ALTER TABLE counsellor_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own credentials
CREATE POLICY counsellor_credentials_read_own
  ON counsellor_credentials
  FOR SELECT
  USING (auth.uid() = counsellor_id);

-- RLS Policy: Admin can view all credentials
CREATE POLICY counsellor_credentials_read_admin
  ON counsellor_credentials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policy: Users can insert their own credentials
CREATE POLICY counsellor_credentials_insert_own
  ON counsellor_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = counsellor_id);

-- RLS Policy: Admin can update credentials (approve/reject)
CREATE POLICY counsellor_credentials_update_admin
  ON counsellor_credentials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- RLS Policy: Admin can delete credentials
CREATE POLICY counsellor_credentials_delete_admin
  ON counsellor_credentials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Storage bucket for documents (create via Lovable UI if not exists)
-- Bucket name: documents
-- Access: private

-- Storage RLS policies (add in Supabase Storage settings)
-- Path: credentials/{counsellor_id}/*
-- Allow authenticated users to read/write their own credentials
-- Allow admin to read all credentials

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON counsellor_credentials TO authenticated;
