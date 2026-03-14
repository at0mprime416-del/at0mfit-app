-- ============================================
-- AT0M FIT — RUNS TABLE MIGRATION
-- Run at: https://supabase.com/dashboard/project/kgozddcutazpqmfbzafa/sql/new
-- ============================================

CREATE TABLE IF NOT EXISTS runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type TEXT,                          -- 'indoor aerobic', 'outdoor hilly', etc.
  distance_mi NUMERIC(5,2),
  duration_seconds INTEGER,           -- stored in seconds for easy math
  pace_per_mile_seconds INTEGER,      -- stored in seconds (e.g. 14:29 = 869s)
  avg_hr INTEGER,
  max_hr INTEGER,
  avg_cadence INTEGER,
  elevation_ft INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runs_select_own" ON runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "runs_insert_own" ON runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs_update_own" ON runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "runs_delete_own" ON runs FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS runs_user_id_idx ON runs(user_id);
CREATE INDEX IF NOT EXISTS runs_date_idx ON runs(date);
