-- ============================================================================
-- Migration: Create student_backpack table
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_backpack (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL, -- TEXT to match existing schema usage (or UUID if profiles use uuid) - keeping TEXT for safety with existing Supabase Auth usually
  backpack_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'en_progreso', 'dominado', 'oxidado', 'archivado')),
  mastery_score INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  mastered_weeks TEXT[] NOT NULL DEFAULT '{}', -- Array of ISO week start dates (YYYY-MM-DD)
  last_mastered_week_start DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: A student can have only one entry per backpack_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_backpack_unique ON student_backpack(student_id, backpack_key);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_backpack_student_id ON student_backpack(student_id);
CREATE INDEX IF NOT EXISTS idx_student_backpack_status ON student_backpack(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_backpack_last_practiced ON student_backpack(student_id, last_practiced_at);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE student_backpack ENABLE ROW LEVEL SECURITY;

-- Policy: Students can read their own backpack
CREATE POLICY "Students can read own backpack"
  ON student_backpack
  FOR SELECT
  USING (
    student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Policy: Students (or system acting as student) can insert their own items
CREATE POLICY "Students can insert own backpack"
  ON student_backpack
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Policy: Students (or system) can update their own items
CREATE POLICY "Students can update own backpack"
  ON student_backpack
  FOR UPDATE
  USING (
    student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
  );

-- Policy: Admins can delete
CREATE POLICY "Admins can delete backpack items"
  ON student_backpack
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Comments
COMMENT ON TABLE student_backpack IS 'Estado de progreso de los estudiantes en ejercicios recurrentes (Mochila)';
COMMENT ON COLUMN student_backpack.mastered_weeks IS 'Lista de semanas donde el ejercicio fue dominado (formato ISO YYYY-MM-DD)';

-- ============================================================================
-- End Migration
-- ============================================================================
