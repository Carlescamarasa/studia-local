-- Fix inconsistent data where evaluation_xp was not updated
-- This handles cases where total_xp was incremented but evaluation_xp remained 0
-- It assumes that any excess of total_xp over practice_xp is evaluation_xp

UPDATE student_xp_total
SET evaluation_xp = total_xp - practice_xp
WHERE total_xp > (practice_xp + evaluation_xp);
