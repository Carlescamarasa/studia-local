-- Migration to add automation columns to version_history
-- This allows storing git info and release notes in Supabase

ALTER TABLE version_history 
ADD COLUMN IF NOT EXISTS commit_hash text,
ADD COLUMN IF NOT EXISTS git_author text,
ADD COLUMN IF NOT EXISTS build_date timestamptz,
ADD COLUMN IF NOT EXISTS release_notes jsonb;

-- Comment for documentation
COMMENT ON COLUMN version_history.commit_hash IS 'Short git commit hash (e.g. b93e3c3)';
COMMENT ON COLUMN version_history.git_author IS 'Author of the last commit';
COMMENT ON COLUMN version_history.build_date IS 'ISO date of the build';
COMMENT ON COLUMN version_history.release_notes IS 'Full JSON object with the changelog items';
