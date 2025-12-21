-- Fix RLS policies for media_assets to allow Admin operations
-- This is required for the synthetic data generator to insert media assets

-- Function to check if user is admin (safe version, redefined just in case)
CREATE OR REPLACE FUNCTION public.check_is_admin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they conflict (optional, but safer to just add new ones with distinct names)
-- or we can use DO block to check existence. For simplicity in this script, we just create.

-- 1. Insert Policy
DROP POLICY IF EXISTS "Admins can insert media_assets" ON media_assets;
CREATE POLICY "Admins can insert media_assets"
ON media_assets
FOR INSERT
TO authenticated
WITH CHECK (
  check_is_admin_safe()
);

-- 2. Update Policy
DROP POLICY IF EXISTS "Admins can update media_assets" ON media_assets;
CREATE POLICY "Admins can update media_assets"
ON media_assets
FOR UPDATE
TO authenticated
USING (
  check_is_admin_safe()
);

-- 3. Delete Policy
DROP POLICY IF EXISTS "Admins can delete media_assets" ON media_assets;
CREATE POLICY "Admins can delete media_assets"
ON media_assets
FOR DELETE
TO authenticated
USING (
  check_is_admin_safe()
);

-- 4. Select Policy (usually already exists, but ensuring Admins can see everything)
-- Assuming there is a "Users can view their own media" or "Public media" policy.
-- We add an Admin override just in case.
DROP POLICY IF EXISTS "Admins can view all media_assets" ON media_assets;
CREATE POLICY "Admins can view all media_assets"
ON media_assets
FOR SELECT
TO authenticated
USING (
  check_is_admin_safe()
);
