-- Migration: Add Practice/Evaluation XP Separation to student_xp_total
-- Date: 2025-12-04
-- Description: Adds practice_xp and evaluation_xp columns to student_xp_total
--              to enable separate tracking of XP from practice vs evaluations

-- Step 1: Add new columns
ALTER TABLE student_xp_total 
ADD COLUMN IF NOT EXISTS practice_xp DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS evaluation_xp DOUBLE PRECISION DEFAULT 0;

-- Step 2: Migrate existing data
-- For now, assign all existing XP to practice_xp
-- evaluation_xp starts at 0 (professor can adjust manually later)
UPDATE student_xp_total 
SET practice_xp = COALESCE(total_xp, 0),
    evaluation_xp = 0
WHERE practice_xp IS NULL OR practice_xp = 0;

-- Step 3: Add comment to document the schema
COMMENT ON COLUMN student_xp_total.practice_xp IS 'XP earned from practice sessions (auto-calculated from registros_bloque)';
COMMENT ON COLUMN student_xp_total.evaluation_xp IS 'XP manually assigned by professor based on evaluations';
COMMENT ON COLUMN student_xp_total.total_xp IS 'Total XP (practice_xp + evaluation_xp). Maintained for compatibility.';

-- Step 4: Verify the migration
SELECT 
  student_id,
  skill,
  total_xp,
  practice_xp,
  evaluation_xp,
  (practice_xp + evaluation_xp) as calculated_total
FROM student_xp_total
ORDER BY student_id, skill;

-- Note: After this migration runs successfully, update application code to:
-- 1. Read practice_xp and evaluation_xp separately
-- 2. Display them in different colors in radar charts (green for practice, orange for evaluation)
-- 3. When XP is earned: increment practice_xp, then recalculate total_xp
-- 4. When professor adjusts XP: modify evaluation_xp, then recalculate total_xp
