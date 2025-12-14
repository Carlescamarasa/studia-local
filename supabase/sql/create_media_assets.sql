-- Create media_assets table for centralized file management
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  name TEXT,
  file_type TEXT NOT NULL, -- 'pdf', 'audio', 'video', 'image', 'youtube', 'drive', 'soundcloud', 'other'
  state TEXT NOT NULL DEFAULT 'external', -- 'uploaded' | 'external'
  storage_path TEXT, -- path in Supabase Storage if uploaded
  
  -- Flexible polymorphic backlink system
  origin_type TEXT NOT NULL, -- 'ejercicio' | 'variacion' | 'feedback_profesor' | 'feedback_sesion' | 'centro_dudas' | 'otro'
  origin_id TEXT NOT NULL, -- ID of the origin resource (can be UUID or string like 'VC-001')
  origin_label TEXT, -- Human readable label: "Escalas Cromáticas", "Variación: Sistema 1", etc.
  origin_context JSONB DEFAULT '{}'::jsonb, -- Additional metadata
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Prevent duplicate links for the same asset context
  UNIQUE(url, origin_type, origin_id)
);

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_origin ON media_assets(origin_type, origin_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_file_type ON media_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_by ON media_assets(created_by);

-- Enable RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Everyone authenticated can view media assets (they are generally public resources in the app context)
CREATE POLICY "Users can view all media_assets"
  ON media_assets FOR SELECT TO authenticated USING (true);

-- 2. Authenticated users can create assets
CREATE POLICY "Users can insert media_assets"
  ON media_assets FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = created_by);

-- 3. Users can update their own assets (or Admins/Profs if we implement roles check later)
CREATE POLICY "Users can update their own media_assets"
  ON media_assets FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- 4. Users can delete their own assets
CREATE POLICY "Users can delete their own media_assets"
  ON media_assets FOR DELETE TO authenticated
  USING (auth.uid() = created_by);
