-- Migration 002: Add CV file metadata (OPTIONAL - non-breaking)
-- Created: 2026-01-28

-- Add columns for CV file metadata (all nullable for backwards compatibility)
ALTER TABLE evaluations 
  ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cv_file_url TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_size INTEGER,
  ADD COLUMN IF NOT EXISTS cv_extraction_method VARCHAR(50);

-- No indexes needed for these fields (rarely queried)
